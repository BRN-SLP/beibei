/**
 * FX rates source — Frankfurter.app.
 *
 * Why Frankfurter:
 *   - Free, no API key, no auth header. Public good run on top of the
 *     European Central Bank reference rates.
 *   - Covers every currency we touch today (UAH, EUR, BRL, GBP, TRY,
 *     ARS, USD, PLN, NGN, KES, PHP, JPY, CHF) plus all common bases.
 *   - Returns daily snapshots — appropriate for a cost-of-living index
 *     where the input data updates on a daily-or-slower cadence anyway.
 *
 * Cached via `unstable_cache` with a 1-hour TTL — same revalidation
 * heuristic as `getBasketSnapshot` and aligned with Frankfurter's own
 * daily-update cadence (no point hitting the upstream more frequently
 * than its source data changes).
 *
 * Reliability: if Frankfurter is down, the cached prior response keeps
 * serving until the cache key naturally expires. If the cache is also
 * cold, the helper returns an empty rate map and downstream code falls
 * back to "—" instead of throwing.
 */
import "server-only";

import { unstable_cache } from "next/cache";

export type FxBase = "USD" | "EUR";

export interface FxRates {
  base: FxBase;
  /** ISO 4217 code → 1 unit of base in that currency. e.g. USD base, KES rate ≈ 129 means $1 = 129 KES. */
  rates: Record<string, number>;
  /** ISO date string from Frankfurter, e.g. "2026-05-21". */
  date: string;
}

interface FrankfurterResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

async function fetchFromFrankfurter(base: FxBase): Promise<FxRates> {
  const url = `https://api.frankfurter.dev/v1/latest?base=${base}`;
  const res = await fetch(url, {
    // Server-side fetch only; no need for CORS / credentials.
    headers: { Accept: "application/json" },
    // Disable Next.js HTTP cache here — we manage caching via
    // unstable_cache on the wrapper below.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Frankfurter HTTP ${res.status}`);
  }
  const json = (await res.json()) as FrankfurterResponse;
  return {
    base,
    rates: { ...json.rates, [base]: 1 },
    date: json.date,
  };
}

/**
 * Currencies Frankfurter does not cover today: emerging-market
 * pairs (ARS, UAH, KES, NGN) that ECB excludes from its daily
 * reference rates. Floatrates is a free no-key daily JSON feed
 * that DOES cover them, so we fetch it once per base and merge
 * the missing currencies into the Frankfurter sheet.
 */
interface FloatratesEntry {
  code: string;
  rate: number;
}

async function fetchFromFloatrates(
  base: FxBase,
): Promise<Record<string, number>> {
  const url = `https://www.floatrates.com/daily/${base.toLowerCase()}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Floatrates HTTP ${res.status}`);
  }
  const json = (await res.json()) as Record<string, FloatratesEntry>;
  const rates: Record<string, number> = {};
  for (const entry of Object.values(json)) {
    rates[entry.code.toUpperCase()] = entry.rate;
  }
  return rates;
}

/**
 * Fetch Frankfurter, then merge in any rates from Floatrates that
 * Frankfurter doesn't carry. Frankfurter wins on overlap because
 * ECB reference rates are the authoritative source. Floatrates
 * only ever fills holes, never overrides.
 */
async function fetchMergedRates(base: FxBase): Promise<FxRates> {
  const [frankfurter, floatrates] = await Promise.allSettled([
    fetchFromFrankfurter(base),
    fetchFromFloatrates(base),
  ]);
  // Frankfurter is the spine — if it fails entirely, surface that
  // failure to the cache layer so the previous good response keeps
  // serving instead of polluting the sheet with floatrates-only.
  if (frankfurter.status !== "fulfilled") {
    throw frankfurter.reason;
  }
  const merged = { ...frankfurter.value.rates };
  if (floatrates.status === "fulfilled") {
    for (const [code, rate] of Object.entries(floatrates.value)) {
      if (merged[code] === undefined) merged[code] = rate;
    }
  }
  return { ...frankfurter.value, rates: merged };
}

/**
 * Cached USD rate sheet. Always 1 hour TTL — Frankfurter publishes
 * daily, so polling faster is wasted bandwidth. Cache key includes
 * the base so USD and EUR get independent cache entries.
 */
const fetchUsd = unstable_cache(
  () => fetchMergedRates("USD"),
  ["fx-rates-usd-v2"],
  { revalidate: 3600, tags: ["fx"] },
);

const fetchEur = unstable_cache(
  () => fetchMergedRates("EUR"),
  ["fx-rates-eur-v2"],
  { revalidate: 3600, tags: ["fx"] },
);

/**
 * Return both rate sheets — pre-fetching both means the client
 * toggle between USD and EUR doesn't trigger a re-fetch.
 */
export async function getFxRatesBoth(): Promise<{
  usd: FxRates | null;
  eur: FxRates | null;
}> {
  const [usd, eur] = await Promise.allSettled([fetchUsd(), fetchEur()]);
  return {
    usd: usd.status === "fulfilled" ? usd.value : null,
    eur: eur.status === "fulfilled" ? eur.value : null,
  };
}

/**
 * Convert a local-currency amount (cents) to a base-currency amount
 * (also in cents). Returns null if the rate for that currency isn't
 * available — caller is expected to render "—" or hide the row.
 *
 *   localCents:    e.g. 5200 for 52.00 UAH
 *   localCurrency: ISO 4217 — "UAH"
 *   rates:         FxRates with base "USD"
 *
 *   → returns ~125 (1.25 USD ≈ 127 cents — actual: 52 UAH ÷ 41.5
 *     UAH/USD ≈ 1.2530 USD = 125 cents)
 *
 * Math walk-through with base=USD, rates.UAH = 41.5:
 *   localCents = 5200 (52.00 UAH)
 *   localMajor = 52.00
 *   baseMajor  = 52.00 / 41.5 = 1.2530
 *   baseCents  = round(1.2530 * 100) = 125
 */
export function convertCents(
  localCents: number,
  localCurrency: string,
  rates: FxRates,
): number | null {
  const rate = rates.rates[localCurrency.toUpperCase()];
  if (!rate || rate <= 0) return null;
  const localMajor = localCents / 100;
  const baseMajor = localMajor / rate;
  return Math.round(baseMajor * 100);
}
