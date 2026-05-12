/**
 * Seed the deployed PriceOracle with cUSD for the reward pool.
 *
 * The contract holds rewards as a plain ERC-20 balance; this script
 * just runs `cUSD.transfer(oracle, REWARD_POOL_AMOUNT)` from the deployer.
 *
 * Required env vars:
 *   PRIVATE_KEY         Deployer key (same as deploy.ts).
 *   PRICE_ORACLE_ADDR   Deployed PriceOracle proxy address.
 *   CUSD_ADDRESS        cUSD ERC-20 address (mainnet default for celo).
 *   REWARD_POOL_AMOUNT  Optional override in cUSD whole units. Default: 50.
 */

import hre from "hardhat";

const KNOWN_CUSD: Record<number, string> = {
  42220: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
};

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const { ethers, network } = hre;
  const [signer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const oracle = process.env.PRICE_ORACLE_ADDR?.trim();
  if (!oracle) throw new Error("PRICE_ORACLE_ADDR env var is required");
  const cUSD =
    process.env.CUSD_ADDRESS?.trim() || KNOWN_CUSD[chainId] || "";
  if (!cUSD) throw new Error(`No cUSD address for chainId=${chainId}`);

  const cUSDContract = new ethers.Contract(cUSD, ERC20_ABI, signer);
  const decimals = Number(await cUSDContract.decimals());
  const wholeUnits = process.env.REWARD_POOL_AMOUNT?.trim() || "50";
  const amount = ethers.parseUnits(wholeUnits, decimals);

  // eslint-disable-next-line no-console
  console.log(
    `\nSeeding ${wholeUnits} cUSD into PriceOracle on network=${network.name}`,
  );
  // eslint-disable-next-line no-console
  console.log(`  signer = ${signer.address}`);
  // eslint-disable-next-line no-console
  console.log(`  oracle = ${oracle}`);
  // eslint-disable-next-line no-console
  console.log(`  cUSD   = ${cUSD}`);
  // eslint-disable-next-line no-console
  console.log(`  amount = ${amount.toString()} (= ${wholeUnits} cUSD)\n`);

  const before = await cUSDContract.balanceOf(oracle);
  const tx = await cUSDContract.transfer(oracle, amount);
  // eslint-disable-next-line no-console
  console.log(`tx ${tx.hash} — waiting for confirmation…`);
  await tx.wait();

  const after = await cUSDContract.balanceOf(oracle);
  // eslint-disable-next-line no-console
  console.log(
    `✓ Pool balance ${ethers.formatUnits(before, decimals)} → ${ethers.formatUnits(
      after,
      decimals,
    )} cUSD`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
