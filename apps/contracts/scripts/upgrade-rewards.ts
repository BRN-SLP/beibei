/**
 * UUPS upgrade: PriceOracle V1 → PriceOracleV2Rewards (50x reward bump).
 *
 * V1 rewards (0.001 / 0.0002 cUSD) were tuned for Sybil-risk minimization
 * but are too small to motivate real users in KE/NG/GH/ZA — a real user
 * needs the reward to clear their cognitive cost of acting. V2 bumps to
 * 0.05 / 0.01 cUSD.
 *
 * Storage layout is unchanged (V2 inherits the same PriceOracleStorage),
 * so the OZ Hardhat upgrades plugin will accept this upgrade. The rewards
 * are `constant`s in bytecode, not storage — so all existing submissions,
 * pending rewards, and verifier history survive.
 *
 * Required env vars:
 *   PRIVATE_KEY            Deployer / current proxy owner.
 *   PRICE_ORACLE_ADDRESS   Proxy address for the target network.
 *
 * Usage:
 *   pnpm hardhat run scripts/upgrade-rewards.ts --network celo-sepolia
 *   pnpm hardhat run scripts/upgrade-rewards.ts --network celo
 */

import hre from "hardhat";

async function main(): Promise<void> {
  const proxyAddress = process.env.PRICE_ORACLE_ADDRESS?.trim();
  if (!proxyAddress) {
    throw new Error("PRICE_ORACLE_ADDRESS env var is required");
  }

  const { ethers, upgrades, network } = hre;
  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  // Snapshot pre-upgrade state for the rehearsal claim.
  const v1 = await ethers.getContractAt("PriceOracle", proxyAddress, signer);
  const beforeSubmitter: bigint = await v1.SUBMITTER_REWARD();
  const beforeVerifier: bigint = await v1.VERIFIER_REWARD();
  const beforeNextId: bigint = await v1.nextId();
  const beforeImpl = await upgrades.erc1967.getImplementationAddress(
    proxyAddress,
  );

  // eslint-disable-next-line no-console
  console.log(
    `\nUpgrading PriceOracle proxy on network=${network.name} chainId=${chainId}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  proxy              = ${proxyAddress}`);
  // eslint-disable-next-line no-console
  console.log(`  V1 impl            = ${beforeImpl}`);
  // eslint-disable-next-line no-console
  console.log(`  V1 SUBMITTER_REWARD= ${beforeSubmitter} (${formatCUSD(beforeSubmitter)} cUSD)`);
  // eslint-disable-next-line no-console
  console.log(`  V1 VERIFIER_REWARD = ${beforeVerifier} (${formatCUSD(beforeVerifier)} cUSD)`);
  // eslint-disable-next-line no-console
  console.log(`  nextId             = ${beforeNextId}\n`);

  const V2 = await ethers.getContractFactory("PriceOracleV2Rewards");
  const upgraded = await upgrades.upgradeProxy(proxyAddress, V2, {
    kind: "uups",
  });
  await upgraded.waitForDeployment();

  const afterImpl = await upgrades.erc1967.getImplementationAddress(
    proxyAddress,
  );
  const v2 = await ethers.getContractAt(
    "PriceOracleV2Rewards",
    proxyAddress,
    signer,
  );

  // Forno sometimes lags one block behind upgrade tx confirmation — retry a
  // few times before giving up so the rehearsal output is clean.
  const afterSubmitter: bigint = await retry(() => v2.SUBMITTER_REWARD());
  const afterVerifier: bigint = await retry(() => v2.VERIFIER_REWARD());
  const afterNextId: bigint = await retry(() => v2.nextId());
  const versionTag: string = await retry(() => v2.version());

  // eslint-disable-next-line no-console
  console.log(`✓ V2 impl            = ${afterImpl}`);
  // eslint-disable-next-line no-console
  console.log(`✓ V2 SUBMITTER_REWARD= ${afterSubmitter} (${formatCUSD(afterSubmitter)} cUSD)`);
  // eslint-disable-next-line no-console
  console.log(`✓ V2 VERIFIER_REWARD = ${afterVerifier} (${formatCUSD(afterVerifier)} cUSD)`);
  // eslint-disable-next-line no-console
  console.log(`✓ version()          = ${versionTag}`);
  // eslint-disable-next-line no-console
  console.log(`✓ nextId preserved   = ${afterNextId} (was ${beforeNextId})`);

  if (afterNextId !== beforeNextId) {
    throw new Error(
      `nextId mutated during upgrade (before=${beforeNextId}, after=${afterNextId}) — storage layout drift?`,
    );
  }
  if (afterSubmitter === beforeSubmitter) {
    throw new Error("SUBMITTER_REWARD did not change — upgrade failed?");
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nNext: pnpm hardhat verify --network ${network.name} ${afterImpl}\n`,
  );
}

async function retry<T>(fn: () => Promise<T>, tries = 4, delayMs = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
}

function formatCUSD(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  return `${whole}.${frac.toString().padStart(18, "0").replace(/0+$/, "") || "0"}`;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
