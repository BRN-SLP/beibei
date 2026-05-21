/**
 * Diagnostic helper — prints proxy state, the most recent submissions,
 * and simulates a verify call from each derived verifier wallet so we
 * can see which revert (if any) triggers.
 *
 * Run with:
 *   pnpm --filter hardhat hardhat run scripts/diagnose.ts --network celo
 */

import hre from "hardhat";
import { HDNodeWallet, Mnemonic } from "ethers";

const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const VERIFIER_DERIVATIONS = [
  "m/44'/60'/0'/0/1",
  "m/44'/60'/0'/0/2",
  "m/44'/60'/0'/0/3",
];

async function main(): Promise<void> {
  const { ethers } = hre;
  const proxy = process.env.PRICE_ORACLE_ADDRESS?.trim();
  if (!proxy) throw new Error("PRICE_ORACLE_ADDRESS env var is required");
  const mnemonic = process.env.DEPLOYER_MNEMONIC?.trim();
  if (!mnemonic) throw new Error("DEPLOYER_MNEMONIC env var is required");

  const [deployer] = await ethers.getSigners();
  const deployerAddr = await deployer.getAddress();

  console.log(`proxy   = ${proxy}`);
  console.log(`deployer= ${deployerAddr}`);

  const oracle = await ethers.getContractAt("PriceOracle", proxy, deployer);

  // Read on-chain state.
  const nextIdRaw = (await ethers.provider.getStorage(proxy, 1)).toString();
  console.log(`raw storage[1] (nextId-ish) = ${nextIdRaw}`);

  // Use the iterator approach — call submissions(id) up to nextId.
  // PriceOracleStorage exposes `nextId` as a public uint256 if generated, but
  // we don't have the ABI for the getter, so we just read the storage layout
  // via the OZ initializable pattern. The first slot of PriceOracleStorage is
  // nextId (declared first in storage), but if there are inherited slots
  // before it the layout shifts. Safer: iterate by id from 0 until we get
  // submitter == 0.

  const cusdContract = new ethers.Contract(
    CUSD_MAINNET,
    [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
    ],
    deployer,
  );
  const poolBal = await cusdContract.balanceOf(proxy);
  const dec = Number(await cusdContract.decimals());
  console.log(
    `proxy cUSD balance = ${ethers.formatUnits(poolBal, dec)} cUSD (${poolBal})`,
  );

  // Scan submissions(id) until we find an empty slot.
  let id = 0n;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let row: unknown;
    try {
      row = await oracle.submissions(id);
    } catch {
      break;
    }
    // The submissions(uint256) auto-getter returns the struct as a tuple.
    // Fields (in order, per PriceOracleStorage.Submission):
    //   bytes12 barcode, bytes6 zoneKey, uint64 priceCents, bytes32 receiptHash,
    //   address submitter, uint64 timestamp, uint8 verifyCount, uint8 acceptCount,
    //   bool finalized, bool accepted
    const r = row as unknown[];
    const submitter = r[4] as string;
    if (submitter === "0x0000000000000000000000000000000000000000") break;
    const barcode = r[0] as string;
    const zoneKey = r[1] as string;
    const priceCents = r[2] as bigint;
    const verifyCount = r[6] as bigint;
    const acceptCount = r[7] as bigint;
    const finalized = r[8] as boolean;
    console.log(
      `#${id} submitter=${submitter} barcode=${barcode} zone=${zoneKey} cents=${priceCents} verify=${verifyCount}/${acceptCount} finalized=${finalized}`,
    );
    id++;
    if (id > 100n) break;
  }

  // Print derived verifier addresses + simulate verify(7, true) statically.
  const provider = deployer.provider!;
  const targetId = process.env.DIAGNOSE_ID ? BigInt(process.env.DIAGNOSE_ID) : 7n;
  for (const path of VERIFIER_DERIVATIONS) {
    const w = HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path).connect(
      provider,
    );
    const bal = await provider.getBalance(w.address);
    const hv = await oracle.hasVerified(targetId, w.address);
    console.log(
      `verifier ${path} ${w.address} celo=${ethers.formatEther(bal)} hasVerified[${targetId}]=${hv}`,
    );

    // staticCall — the same as estimateGas but no gas wrapping.
    try {
      const vOracle = oracle.connect(w) as typeof oracle;
      await vOracle.verify.staticCall(targetId, true);
      console.log(`  ✓ staticCall verify(${targetId}, true) OK`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "unknown";
      const data = (err as { data?: string }).data ?? "<none>";
      console.log(`  ✗ staticCall reverted: ${message.split("\n")[0]}`);
      console.log(`    data=${data}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
