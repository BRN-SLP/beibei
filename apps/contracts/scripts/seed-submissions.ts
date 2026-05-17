/**
 * Seed the PriceOracle with eight curated launch-day submissions so that
 * /item/* pages, the median chart, and the verify queue have real data
 * before any external user shows up.
 *
 * Strategy:
 *   - The deployer signer submits each price.
 *   - Three additional signers are derived from `DEPLOYER_MNEMONIC` at
 *     HD paths m/44'/60'/0'/0/{1,2,3}. They are funded with a tiny CELO
 *     allowance for gas and then verify each submission. Three positive
 *     verifications drive `SubmissionFinalized(accepted=true)` and the
 *     contract credits both the submitter and the three verifiers.
 *   - Idempotent: if eight submissions from the deployer already exist
 *     (via the `PriceSubmitted` event log), the script exits cleanly.
 *
 * Required env vars:
 *   PRIVATE_KEY            Deployer key (also has cUSD reserve).
 *   DEPLOYER_MNEMONIC      Mnemonic for deriving verifier wallets.
 *   PRICE_ORACLE_ADDRESS   Proxy address for the target network.
 *
 * Usage:
 *   pnpm hardhat run scripts/seed-submissions.ts --network celo-sepolia
 *   pnpm hardhat run scripts/seed-submissions.ts --network celo
 */

import hre from "hardhat";
import { HDNodeWallet, Mnemonic } from "ethers";

import { SEED_PRODUCTS, type SeedProduct } from "../seed/products";

const VERIFIER_DERIVATIONS = [
  "m/44'/60'/0'/0/1",
  "m/44'/60'/0'/0/2",
  "m/44'/60'/0'/0/3",
];

const VERIFIER_GAS_FUNDING_WEI = 10n ** 17n; // 0.1 CELO per verifier — covers ≥ 8 verify txs

async function main(): Promise<void> {
  const proxyAddress = process.env.PRICE_ORACLE_ADDRESS?.trim();
  if (!proxyAddress) throw new Error("PRICE_ORACLE_ADDRESS env var is required");
  const mnemonic = process.env.DEPLOYER_MNEMONIC?.trim();
  if (!mnemonic) throw new Error("DEPLOYER_MNEMONIC env var is required");

  const { ethers, network } = hre;
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  // eslint-disable-next-line no-console
  console.log(
    `\nSeeding PriceOracle on network=${network.name} chainId=${chainId}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  proxy    = ${proxyAddress}`);
  // eslint-disable-next-line no-console
  console.log(`  submitter= ${deployerAddress}\n`);

  // Derive + connect 3 verifier signers.
  const mnemonicObj = Mnemonic.fromPhrase(mnemonic);
  const verifiers = VERIFIER_DERIVATIONS.map((path) =>
    HDNodeWallet.fromMnemonic(mnemonicObj, path).connect(ethers.provider),
  );
  for (let i = 0; i < verifiers.length; i++) {
    // eslint-disable-next-line no-console
    console.log(`  verifier-${i + 1} = ${verifiers[i].address}`);
  }
  // eslint-disable-next-line no-console
  console.log();

  // Top up each verifier with gas money if they are below the floor.
  for (const v of verifiers) {
    const bal = await ethers.provider.getBalance(v.address);
    if (bal < VERIFIER_GAS_FUNDING_WEI / 2n) {
      // eslint-disable-next-line no-console
      console.log(
        `  funding ${v.address} with ${VERIFIER_GAS_FUNDING_WEI} wei …`,
      );
      const tx = await deployer.sendTransaction({
        to: v.address,
        value: VERIFIER_GAS_FUNDING_WEI,
      });
      await tx.wait();
    }
  }

  const v1 = await ethers.getContractAt("PriceOracle", proxyAddress, deployer);

  // 1) Self-heal: any prior deployer submission that has fewer than 3
  //    verifications gets topped up before we add new ones. Keeps the
  //    script idempotent across crashes mid-cycle.
  //
  // We can't queryFilter from genesis on Celo Mainnet — forno.celo.org
  // rejects unbounded scans (60M+ blocks). The proxy is freshly deployed
  // so a recent-only window is sufficient. We use ~50k blocks (~1 day at
  // 1-2s block time) which more than covers any post-deploy seeding run.
  const submittedFilter = v1.filters.PriceSubmitted();
  const latestBlock = await ethers.provider.getBlockNumber();
  const fromBlock = Math.max(0, latestBlock - 50_000);
  const pastEvents = await v1.queryFilter(submittedFilter, fromBlock, "latest");
  const fromDeployer = pastEvents.filter(
    (e: any) =>
      (e.args?.submitter ?? "").toLowerCase() === deployerAddress.toLowerCase(),
  );

  for (const evt of fromDeployer) {
    const id = (evt as any).args.submissionId as bigint;
    const s = await v1.submissions(id);
    if (s.finalized) continue;
    if (Number(s.verifyCount) >= 3) continue;
    // eslint-disable-next-line no-console
    console.log(`↺ healing submission #${id}  (verifyCount=${s.verifyCount})`);
    for (let k = Number(s.verifyCount); k < 3; k++) {
      const verifier = verifiers[k];
      const hasVoted: boolean = await v1.hasVerified(id, verifier.address);
      if (hasVoted) continue;
      const vConn = v1.connect(verifier) as unknown as typeof v1;
      const vTx = await vConn.verify(id, true);
      const vRcpt = await vTx.wait();
      if (!vRcpt) throw new Error("verify receipt missing during heal");
      // eslint-disable-next-line no-console
      console.log(
        `     verify-${k + 1} block=${vRcpt.blockNumber}  tx=${vRcpt.hash}`,
      );
    }
    // eslint-disable-next-line no-console
    console.log();
  }

  if (fromDeployer.length >= SEED_PRODUCTS.length) {
    // eslint-disable-next-line no-console
    console.log(
      `↪ ${fromDeployer.length} prior submissions from deployer detected — no new submissions needed.\n`,
    );
    return;
  }
  if (fromDeployer.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `· ${fromDeployer.length} prior submissions found; appending the remaining ${SEED_PRODUCTS.length - fromDeployer.length}.\n`,
    );
  }

  const start = fromDeployer.length;
  for (let i = start; i < SEED_PRODUCTS.length; i++) {
    const p = SEED_PRODUCTS[i];
    const barcodeHex = barcodeStringToHex12(p.barcode);
    const zoneHex = gpsToZoneKey6(p.lat, p.lng);
    const priceCents = BigInt(Math.round(p.priceMajor * 100));
    const ZERO = "0x" + "0".repeat(64);

    // 1) submit
    const submitTx = await v1.submitPrice(
      barcodeHex,
      zoneHex,
      priceCents,
      ZERO,
    );
    const submitRcpt = await submitTx.wait();
    if (!submitRcpt) throw new Error("submitPrice receipt missing");
    const submitId = await extractSubmissionId(v1, submitRcpt);

    // eslint-disable-next-line no-console
    console.log(
      `· #${submitId.toString().padStart(3, " ")}  ${p.label}  ${p.priceMajor} ${p.currency}  (${p.city})`,
    );
    // eslint-disable-next-line no-console
    console.log(`     submit  block=${submitRcpt.blockNumber}  tx=${submitRcpt.hash}`);

    // 2) three positive verifications → triggers finalize + payouts
    for (let k = 0; k < verifiers.length; k++) {
      const vConn = v1.connect(verifiers[k]) as unknown as typeof v1;
      const vTx = await vConn.verify(submitId, true);
      const vRcpt = await vTx.wait();
      if (!vRcpt) throw new Error("verify receipt missing");
      // eslint-disable-next-line no-console
      console.log(
        `     verify-${k + 1} block=${vRcpt.blockNumber}  tx=${vRcpt.hash}`,
      );
    }
    // eslint-disable-next-line no-console
    console.log();
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${SEED_PRODUCTS.length - start} new submissions.\n`);
}

/**
 * Drop the check digit from EAN-13/UPC, left-pad to 12 bytes (24 hex
 * chars). Mirrors apps/web/src/lib/submissions.ts barcodeStringToHex.
 */
function barcodeStringToHex12(input: string): `0x${string}` {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 13) {
    throw new Error(`barcode must be 8..13 digits, got "${input}"`);
  }
  const trimmed = digits.length >= 12 ? digits.slice(0, digits.length - 1) : digits;
  const padded = trimmed.padStart(24, "0");
  return `0x${padded.slice(0, 24)}` as `0x${string}`;
}

/** Mirrors apps/web/src/lib/zone.ts gpsToZoneKey. */
function gpsToZoneKey6(lat: number, lng: number): `0x${string}` {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("lat/lng not finite");
  }
  const lat100 = Math.round(lat * 100);
  const lng100 = Math.round(lng * 100);
  const buf = new Uint8Array(6);
  writeInt24BE(buf, 0, lat100);
  writeInt24BE(buf, 3, lng100);
  return `0x${Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;
}

function writeInt24BE(buf: Uint8Array, offset: number, value: number): void {
  const u = value < 0 ? value + 0x1000000 : value;
  buf[offset] = (u >> 16) & 0xff;
  buf[offset + 1] = (u >> 8) & 0xff;
  buf[offset + 2] = u & 0xff;
}

async function extractSubmissionId(
  contract: any,
  receipt: { logs: readonly { topics: readonly string[]; data: string }[] },
): Promise<bigint> {
  // PriceSubmitted is the only event the contract emits from `submitPrice`.
  const iface = contract.interface;
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed?.name === "PriceSubmitted") {
        return parsed.args.submissionId as bigint;
      }
    } catch {
      // Skip unrelated logs.
    }
  }
  throw new Error("PriceSubmitted event not found in receipt");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
