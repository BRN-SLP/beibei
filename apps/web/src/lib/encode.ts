/**
 * Mercato on-chain encoders.
 *
 * The PriceOracle contract is a generic price submitter — the on-chain
 * signature is intentionally neutral:
 *
 *   submitPrice(
 *     bytes12 barcode,
 *     bytes6  zoneKey,
 *     uint64  priceCents,
 *     bytes32 receiptHash,
 *   )
 *
 * Mercato encodes those slots as follows:
 *
 *   barcode   = keccak256(productSlug) truncated to 12 bytes
 *               (96-bit identifier; collision probability ~3e-19
 *                across 10 000 products)
 *   zoneKey   = ISO-3166-1 alpha-2 country code as ASCII bytes,
 *               left-padded to 6 bytes with zeros (e.g. "UA" →
 *               0x554100000000)
 *   priceCents = local currency × 100
 *   receiptHash = IPFS hash of optional receipt photo, or ZERO_HASH
 *
 * The contract is currency-agnostic — currency is determined offchain
 * from the country code via lib/countries.ts. Cross-country compare
 * happens in the dashboard using offchain FX rates.
 *
 * These encoders are deterministic and stable. A submission with
 * slug "bread_500g" from any country MUST hash to the same bytes12
 * identifier for aggregation to work.
 */

import { keccak256, toBytes, type Hex } from "viem";

/**
 * The zero receipt hash — used when a submission has no photo proof.
 * The contract treats it as "no receipt" rather than "invalid hash".
 */
export const ZERO_RECEIPT_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex;

/**
 * Encode a canonical product slug into the bytes12 barcode field.
 *
 * Why keccak256 truncated rather than direct ASCII encoding:
 *   - Slugs can exceed 12 chars (e.g. "rent_3bd_center" is 15). Direct
 *     ASCII would truncate the slug visibly and create collisions for
 *     anything sharing a 12-char prefix.
 *   - Keccak256 first-12-bytes gives a uniform 96-bit identifier
 *     regardless of slug length. Birthday-collision probability across
 *     10 000 distinct slugs is ~3e-19 — safely zero for the foreseeable
 *     future.
 *   - Same algorithm used onchain (`keccak256` is a Solidity primitive),
 *     so the encoder ↔ decoder can be reproduced inside a future
 *     V2 contract if needed.
 */
export function productSlugToBarcode(slug: string): Hex {
  if (!slug) {
    throw new Error("productSlugToBarcode: slug must be non-empty");
  }
  const fullHash = keccak256(toBytes(slug));
  // fullHash is "0x" + 64 hex chars (32 bytes). Take first 12 bytes
  // = 24 hex chars after the "0x" prefix.
  return `0x${fullHash.slice(2, 26)}` as Hex;
}

/**
 * Encode an ISO-3166-1 alpha-2 country code into the bytes6 zoneKey
 * field. Format: ASCII bytes left-aligned, zero-padded to 6 bytes.
 *
 *   "UA" → 0x554100000000   (U=0x55, A=0x41)
 *   "KE" → 0x4b4500000000
 *   "AR" → 0x415200000000
 *
 * Why ASCII rather than ISO numeric:
 *   - Reading raw event logs in Celoscan or a CLI shows "UA" + zeros
 *     directly — no lookup needed to know which country a submission
 *     belongs to. Numeric codes (804 for UA) require a reference table.
 *   - 6 bytes leaves 4 bytes of trailing padding, which is room to
 *     extend later (e.g. add region/state subdivisions without an
 *     onchain schema change).
 */
export function countryToZoneKey(countryCode: string): Hex {
  const upper = countryCode.trim().toUpperCase();
  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) {
    throw new Error(
      `countryToZoneKey: expected 2 ASCII letters, got "${countryCode}"`,
    );
  }
  const hex =
    upper.charCodeAt(0).toString(16).padStart(2, "0") +
    upper.charCodeAt(1).toString(16).padStart(2, "0");
  // Pad right with zeros to fill the remaining 4 bytes (8 hex chars).
  return `0x${hex.padEnd(12, "0")}` as Hex;
}

/**
 * Decode a bytes6 zoneKey back to its ISO-3166-1 alpha-2 country
 * code. Returns undefined if the zoneKey doesn't look like a Mercato
 * country zone (e.g. legacy GPS-encoded zones from earlier experiments
 * on the same contract).
 */
export function zoneKeyToCountry(zoneKey: Hex): string | undefined {
  const hex = zoneKey.startsWith("0x") ? zoneKey.slice(2) : zoneKey;
  if (hex.length !== 12) return undefined;
  const b0 = parseInt(hex.slice(0, 2), 16);
  const b1 = parseInt(hex.slice(2, 4), 16);
  // ASCII A–Z = 0x41–0x5A
  const looksLikeAscii =
    b0 >= 0x41 && b0 <= 0x5a && b1 >= 0x41 && b1 <= 0x5a;
  if (!looksLikeAscii) return undefined;
  // The last 4 bytes (8 hex chars) must be all zero for it to be a
  // Mercato-format zone (vs. a legacy GPS-encoded zone).
  if (hex.slice(4) !== "00000000") return undefined;
  return String.fromCharCode(b0, b1);
}

/**
 * Convert a price in major units (e.g. "1.23") to the uint64 cents
 * the contract expects. Throws on negative or non-numeric input.
 *
 * `BigInt(Math.round(value * 100))` is the obvious approach, but it
 * loses precision on inputs like "0.1" (floating-point rounding bites
 * around the 17th decimal). We parse the string manually instead so a
 * user typing "1234567.89" gets exactly 123456789n with no surprises.
 */
export function majorUnitsToCents(input: string | number): bigint {
  const str = String(input).trim();
  if (!/^\d+(\.\d+)?$/.test(str)) {
    throw new Error(`majorUnitsToCents: invalid number "${input}"`);
  }
  const [whole, frac = ""] = str.split(".");
  const cents = frac.padEnd(2, "0").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(cents);
}
