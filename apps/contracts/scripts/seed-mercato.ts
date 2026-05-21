/**
 * Seed the PriceOracle with the Mercato launch fixture.
 *
 * Submits each entry in `seed/mercato.ts` from the deployer signer,
 * then verifies it with 3 derived signers so the consensus engine
 * finalizes each submission with `accepted=true`. The result is a
 * non-empty /basket dashboard on day one.
 *
 * The on-chain encoding mirrors apps/web/src/lib/encode.ts exactly:
 *   barcode = keccak256(productSlug) truncated to 12 bytes
 *   zoneKey = ISO-3166-1 alpha-2 ASCII bytes, zero-padded to 6 bytes
 *
 * Mirroring (rather than importing) is intentional — hardhat scripts
 * compile under a different tsconfig and pulling the next/server-
 * adjacent `apps/web/src` chain breaks the build. The logic is
 * trivial enough that duplication is the lower-risk option; the
 * shared canonical-product-list is in apps/web/src/lib/products.ts
 * and any slug change there must also land in seed/mercato.ts.
 *
 * Required env vars:
 *   PRIVATE_KEY            Deployer key (also holds the cUSD reserve).
 *   DEPLOYER_MNEMONIC      Mnemonic for deriving verifier wallets.
 *   PRICE_ORACLE_ADDRESS   Proxy address for the target network.
 *
 * Usage:
 *   pnpm hardhat run scripts/seed-mercato.ts --network celo-sepolia
 *   pnpm hardhat run scripts/seed-mercato.ts --network celo
 *
 * Idempotency: if a submission with the same (deployer, barcode,
 * zoneKey) already exists in the event log, the script skips it.
 */

import hre from "hardhat";
import { HDNodeWallet, Mnemonic, keccak256, toUtf8Bytes } from "ethers";

import { MERCATO_SEED } from "../seed/mercato";

const VERIFIER_DERIVATIONS = [
  "m/44'/60'/0'/0/1",
  "m/44'/60'/0'/0/2",
  "m/44'/60'/0'/0/3",
];

const VERIFIER_GAS_FUNDING_WEI = 10n ** 17n; // 0.1 CELO per verifier — covers >= MERCATO_SEED.length verify txs
const VERIFIER_GAS_TOPUP_THRESHOLD_WEI = 10n ** 17n; // top up mid-loop if balance dips under 0.1 CELO

/** Encode a product slug → bytes12 hex string. Mirrors apps/web/src/lib/encode.ts. */
function productSlugToBarcode(slug: string): `0x${string}` {
  const fullHash = keccak256(toUtf8Bytes(slug));
  return `0x${fullHash.slice(2, 26)}` as `0x${string}`;
}

/** Encode an ISO country code → bytes6 hex string. Mirrors apps/web/src/lib/encode.ts. */
function countryToZoneKey(code: string): `0x${string}` {
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    throw new Error(`countryToZoneKey: expected 2 ASCII letters, got "${code}"`);
  }
  const hex =
    upper.charCodeAt(0).toString(16).padStart(2, "0") +
    upper.charCodeAt(1).toString(16).padStart(2, "0");
  return `0x${hex.padEnd(12, "0")}` as `0x${string}`;
}

/** Convert "2.10" → 210n; "1800" → 180000n. */
function majorUnitsToCents(value: number): bigint {
  const str = value.toString();
  const [whole, frac = ""] = str.split(".");
  const cents = frac.padEnd(2, "0").slice(0, 2);
  return BigInt(whole) * 100n + BigInt(cents);
}

async function main(): Promise<void> {
  const proxyAddress = process.env.PRICE_ORACLE_ADDRESS?.trim();
  if (!proxyAddress) {
    throw new Error("PRICE_ORACLE_ADDRESS env var is required");
  }
  const mnemonic = process.env.DEPLOYER_MNEMONIC?.trim();
  if (!mnemonic) {
    throw new Error("DEPLOYER_MNEMONIC env var is required");
  }

  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  // eslint-disable-next-line no-console
  console.log(
    `[seed-mercato] network=${network.name} proxy=${proxyAddress} deployer=${deployerAddress}`,
  );

  const oracle = await ethers.getContractAt("PriceOracle", proxyAddress, deployer);

  // Discover which entries already exist (idempotent re-runs).
  // Map: "barcode|zoneKey" → submissionId so re-runs can finish half-verified state.
  const existingById = new Map<string, bigint>();
  try {
    const filter = oracle.filters.PriceSubmitted(undefined, undefined, undefined);
    const events = await oracle.queryFilter(filter, -1_000_000);
    for (const e of events) {
      const args = "args" in e ? e.args : undefined;
      if (!args) continue;
      const submitter = (args as unknown as { submitter?: string }).submitter;
      const barcode = (args as unknown as { barcode?: string }).barcode;
      const zoneKey = (args as unknown as { zoneKey?: string }).zoneKey;
      const submissionId = (
        args as unknown as { submissionId?: bigint }
      ).submissionId;
      if (
        submitter?.toLowerCase() === deployerAddress.toLowerCase() &&
        typeof barcode === "string" &&
        typeof zoneKey === "string" &&
        typeof submissionId === "bigint"
      ) {
        existingById.set(
          `${barcode.toLowerCase()}|${zoneKey.toLowerCase()}`,
          submissionId,
        );
      }
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[seed-mercato] could not pre-scan events:", err);
  }

  // Fund verifier wallets so they can broadcast verify txs.
  const provider = deployer.provider;
  if (!provider) throw new Error("deployer.provider is undefined");
  const verifierWallets = VERIFIER_DERIVATIONS.map((path) =>
    HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path).connect(provider),
  );

  for (const vw of verifierWallets) {
    const bal = await provider.getBalance(vw.address);
    if (bal < VERIFIER_GAS_FUNDING_WEI / 2n) {
      // eslint-disable-next-line no-console
      console.log(`[seed-mercato] funding verifier ${vw.address}…`);
      const tx = await deployer.sendTransaction({
        to: vw.address,
        value: VERIFIER_GAS_FUNDING_WEI,
      });
      await tx.wait();
    }
  }

  let submitted = 0;
  let verifiedOnly = 0;
  let skipped = 0;
  for (const row of MERCATO_SEED) {
    const barcode = productSlugToBarcode(row.productSlug);
    const zoneKey = countryToZoneKey(row.countryCode);
    const key = `${barcode.toLowerCase()}|${zoneKey.toLowerCase()}`;

    let submissionId = existingById.get(key);

    if (submissionId === undefined) {
      // Fresh row — submit it.
      const priceCents = majorUnitsToCents(row.priceMajor);
      const zeroHash = `0x${"0".repeat(64)}`;
      const tx = await oracle.submitPrice(barcode, zoneKey, priceCents, zeroHash);
      const receipt = await tx.wait();
      if (!receipt) throw new Error("no receipt for submitPrice");

      for (const log of receipt.logs ?? []) {
        try {
          const parsed = oracle.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed?.name === "PriceSubmitted") {
            submissionId = BigInt(parsed.args.submissionId.toString());
            break;
          }
        } catch {
          // not our event; skip
        }
      }
      if (submissionId === undefined) {
        throw new Error("could not parse submissionId from PriceSubmitted log");
      }
      // eslint-disable-next-line no-console
      console.log(
        `[seed-mercato] submitted #${submissionId} ${row.productSlug} ${row.countryCode} ${row.priceMajor} ${row.currency}`,
      );
      submitted++;
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `[seed-mercato] found existing #${submissionId} ${row.productSlug} ${row.countryCode}`,
      );
    }

    // Check current state; only verify with wallets that haven't already voted.
    const sub = (await oracle.submissions(submissionId)) as unknown as unknown[];
    const finalized = sub[8] as boolean;
    if (finalized) {
      // eslint-disable-next-line no-console
      console.log(`[seed-mercato]   #${submissionId} already finalized — skip`);
      skipped++;
      continue;
    }

    let voted = 0;
    for (const vw of verifierWallets) {
      const already = await oracle.hasVerified(submissionId, vw.address);
      if (already) continue;

      // Dynamic top-up: Celo gas spikes mid-loop, so re-check balance before
      // each verify and refill if low. Otherwise the verifier with the
      // shortest funding margin reverts with "insufficient funds for gas".
      const bal = await provider.getBalance(vw.address);
      if (bal < VERIFIER_GAS_TOPUP_THRESHOLD_WEI) {
        // eslint-disable-next-line no-console
        console.log(
          `[seed-mercato]   topping up ${vw.address} (bal=${bal})`,
        );
        const topup = await deployer.sendTransaction({
          to: vw.address,
          value: VERIFIER_GAS_FUNDING_WEI,
        });
        await topup.wait();
      }

      const vOracle = oracle.connect(vw) as typeof oracle;
      // Celo RPC occasionally throws "execution reverted" during gas estimation
      // even when staticCall confirms the tx is valid. Retry a handful of times
      // before giving up.
      let lastErr: unknown;
      let success = false;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const vtx = await vOracle.verify(submissionId, true);
          await vtx.wait();
          success = true;
          break;
        } catch (err) {
          lastErr = err;
          // eslint-disable-next-line no-console
          console.warn(
            `[seed-mercato]   verify(${submissionId}) attempt ${attempt} from ${vw.address} failed: ${
              err instanceof Error ? err.message.split("\n")[0] : String(err)
            }`,
          );
          // Confirm via staticCall that the tx would still succeed; if it
          // wouldn't, fail fast (no point retrying a real revert).
          try {
            await vOracle.verify.staticCall(submissionId, true);
          } catch (staticErr) {
            // eslint-disable-next-line no-console
            console.warn(
              `[seed-mercato]   staticCall also reverts — giving up: ${
                staticErr instanceof Error ? staticErr.message.split("\n")[0] : String(staticErr)
              }`,
            );
            throw staticErr;
          }
          await new Promise((r) => setTimeout(r, 2000 * attempt));
        }
      }
      if (!success) throw lastErr;
      voted++;
    }
    if (voted > 0) verifiedOnly++;
  }

  // eslint-disable-next-line no-console
  console.log(
    `[seed-mercato] done. submitted=${submitted} verified_existing=${verifiedOnly} already_final=${skipped} total_in_fixture=${MERCATO_SEED.length}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
