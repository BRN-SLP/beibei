/**
 * UUPS proxy deploy script for the PriceOracle contract.
 *
 * After deploy, fund the reward pool with `scripts/seed-rewards.ts` (or any
 * standard ERC-20 transfer from your deployer).
 *
 * Required env vars:
 *   PRIVATE_KEY    Hex deployer key for the target network.
 *   CUSD_ADDRESS   cUSD ERC-20 address (mainnet default kicks in for celo).
 *
 * Usage:
 *   pnpm hardhat run scripts/deploy.ts --network celo-sepolia
 *   pnpm hardhat run scripts/deploy.ts --network celo
 */

import hre from "hardhat";

const KNOWN_CUSD: Record<number, string> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a", // Celo mainnet
};

async function main() {
  const { ethers, upgrades, network } = hre;
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const cUSD =
    process.env.CUSD_ADDRESS?.trim() || KNOWN_CUSD[chainId] || "";
  if (!cUSD) {
    throw new Error(
      `No cUSD address configured for chainId=${chainId}. Set CUSD_ADDRESS env or extend KNOWN_CUSD.`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `\nDeploying PriceOracle proxy on network=${network.name} chainId=${chainId}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  deployer = ${deployer.address}`);
  // eslint-disable-next-line no-console
  console.log(`  cUSD     = ${cUSD}\n`);

  const Factory = await ethers.getContractFactory("PriceOracle");
  const proxy = await upgrades.deployProxy(
    Factory,
    [deployer.address, cUSD],
    { kind: "uups", initializer: "initialize" },
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddress = await upgrades.erc1967.getImplementationAddress(
    proxyAddress,
  );

  // eslint-disable-next-line no-console
  console.log(`✓ Proxy:          ${proxyAddress}`);
  // eslint-disable-next-line no-console
  console.log(`✓ Implementation: ${implAddress}`);
  // eslint-disable-next-line no-console
  console.log(
    `\nNext steps:`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  pnpm hardhat verify --network ${network.name} ${implAddress}`,
  );
  // eslint-disable-next-line no-console
  console.log(
    `  pnpm hardhat run scripts/seed-rewards.ts --network ${network.name}`,
  );
  // eslint-disable-next-line no-console
  console.log();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
