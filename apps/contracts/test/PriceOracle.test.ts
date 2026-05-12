import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import {
  encodeFunctionData,
  getAddress,
  parseUnits,
  zeroAddress,
} from "viem";

const HUNDRED = parseUnits("100", 18);
const SUBMITTER_REWARD = parseUnits("0.001", 18);
const VERIFIER_REWARD = parseUnits("0.0002", 18);

// Random 12-byte and 6-byte literals used as barcode / zoneKey samples.
const BARCODE_A =
  "0x012345678901234567890123" as `0x${string}`; // 12 bytes
const ZONE_A = "0xabcdef012345" as `0x${string}`; // 6 bytes
const RECEIPT =
  "0x1111111111111111111111111111111111111111111111111111111111111111" as `0x${string}`;

async function deployFixture() {
  const [owner, alice, bob, carol, dave] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const cUSD = await hre.viem.deployContract("MockCUSD", []);
  const impl = await hre.viem.deployContract("PriceOracle", []);

  const initData = encodeFunctionData({
    abi: impl.abi,
    functionName: "initialize",
    args: [owner.account.address, cUSD.address],
  });
  const proxy = await hre.viem.deployContract("ERC1967Proxy", [
    impl.address,
    initData,
  ]);
  const oracle = await hre.viem.getContractAt("PriceOracle", proxy.address);

  // Seed the reward pool: 100 mcUSD into the contract directly.
  await cUSD.write.mint([oracle.address, HUNDRED]);

  return { owner, alice, bob, carol, dave, publicClient, cUSD, oracle, impl };
}

async function as(walletIndex: number, oracleAddress: `0x${string}`) {
  const wallets = await hre.viem.getWalletClients();
  return hre.viem.getContractAt("PriceOracle", oracleAddress, {
    client: { wallet: wallets[walletIndex] },
  });
}

describe("PriceOracle", function () {
  describe("initialization", function () {
    it("sets owner and cUSD", async function () {
      const { owner, oracle, cUSD } = await loadFixture(deployFixture);
      expect(getAddress(await oracle.read.owner())).to.equal(
        getAddress(owner.account.address),
      );
      expect(getAddress(await oracle.read.cUSD())).to.equal(
        getAddress(cUSD.address),
      );
    });

    it("disables direct re-initialization via the proxy", async function () {
      const { oracle, owner, cUSD } = await loadFixture(deployFixture);
      await expect(
        oracle.write.initialize([owner.account.address, cUSD.address]),
      ).to.be.rejected;
    });

    it("disables initialization on the implementation directly", async function () {
      const { impl, owner, cUSD } = await loadFixture(deployFixture);
      await expect(
        impl.write.initialize([owner.account.address, cUSD.address]),
      ).to.be.rejected;
    });
  });

  describe("submitPrice", function () {
    it("stores the submission and emits PriceSubmitted", async function () {
      const { alice, oracle, publicClient } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);

      const tx = await oAlice.write.submitPrice([
        BARCODE_A,
        ZONE_A,
        80n, // 80 cents
        RECEIPT,
      ]);
      await publicClient.waitForTransactionReceipt({ hash: tx });

      const stored = await oracle.read.submissions([0n]);
      // submissions(uint256) returns the tuple WITHOUT the array slot.
      // (barcode, zoneKey, priceCents, receiptHash, submitter, timestamp,
      //  verifyCount, acceptCount, finalized, accepted)
      expect(stored[0]).to.equal(BARCODE_A);
      expect(stored[1]).to.equal(ZONE_A);
      expect(stored[2]).to.equal(80n);
      expect(stored[3]).to.equal(RECEIPT);
      expect(getAddress(stored[4])).to.equal(getAddress(alice.account.address));

      expect(await oracle.read.nextId()).to.equal(1n);

      const events = await oracle.getEvents.PriceSubmitted();
      expect(events.length).to.equal(1);
      expect(events[0].args.submitter).to.equal(
        getAddress(alice.account.address),
      );
      expect(events[0].args.priceCents).to.equal(80n);
    });

    it("assigns monotonic ids", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      const oBob = await as(2, oracle.address);

      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);
      await oBob.write.submitPrice([BARCODE_A, ZONE_A, 82n, RECEIPT]);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 79n, RECEIPT]);

      expect(await oracle.read.nextId()).to.equal(3n);
    });
  });

  describe("verify — accept path", function () {
    it("3 unanimous accepts → finalized=true, rewards distributed", async function () {
      const { alice, bob, carol, dave, oracle, publicClient } =
        await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);

      const oBob = await as(2, oracle.address);
      const oCarol = await as(3, oracle.address);
      const oDave = await as(4, oracle.address);

      await oBob.write.verify([0n, true]);
      await oCarol.write.verify([0n, true]);
      const tx = await oDave.write.verify([0n, true]);
      await publicClient.waitForTransactionReceipt({ hash: tx });

      expect(
        await oracle.read.pendingRewards([alice.account.address]),
      ).to.equal(SUBMITTER_REWARD);
      expect(await oracle.read.pendingRewards([bob.account.address])).to.equal(
        VERIFIER_REWARD,
      );
      expect(
        await oracle.read.pendingRewards([carol.account.address]),
      ).to.equal(VERIFIER_REWARD);
      expect(await oracle.read.pendingRewards([dave.account.address])).to.equal(
        VERIFIER_REWARD,
      );

      const finalized = await oracle.getEvents.SubmissionFinalized();
      expect(finalized.length).to.equal(1);
      expect(finalized[0].args.accepted).to.equal(true);
    });
  });

  describe("verify — reject path", function () {
    it("3 unanimous rejects → finalized=false, no rewards", async function () {
      const { alice, bob, carol, dave, oracle } =
        await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);

      const oBob = await as(2, oracle.address);
      const oCarol = await as(3, oracle.address);
      const oDave = await as(4, oracle.address);
      await oBob.write.verify([0n, false]);
      await oCarol.write.verify([0n, false]);
      await oDave.write.verify([0n, false]);

      expect(
        await oracle.read.pendingRewards([alice.account.address]),
      ).to.equal(0n);
      expect(await oracle.read.pendingRewards([bob.account.address])).to.equal(
        0n,
      );

      const finalized = await oracle.getEvents.SubmissionFinalized();
      expect(finalized.length).to.equal(1);
      expect(finalized[0].args.accepted).to.equal(false);
    });
  });

  describe("verify — mixed path", function () {
    it("2 accepts + 1 reject → locked-pending, no rewards, no further votes", async function () {
      const { alice, bob, carol, dave, oracle } =
        await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);

      const oBob = await as(2, oracle.address);
      const oCarol = await as(3, oracle.address);
      const oDave = await as(4, oracle.address);
      await oBob.write.verify([0n, true]);
      await oCarol.write.verify([0n, true]);
      await oDave.write.verify([0n, false]);

      // No SubmissionFinalized event emitted.
      const finalized = await oracle.getEvents.SubmissionFinalized();
      expect(finalized.length).to.equal(0);

      // No rewards.
      expect(
        await oracle.read.pendingRewards([alice.account.address]),
      ).to.equal(0n);

      // A 4th would-be verifier is rejected — submission locked.
      const [, , , , , extra] = await hre.viem.getWalletClients();
      const oExtra = await hre.viem.getContractAt(
        "PriceOracle",
        oracle.address,
        { client: { wallet: extra } },
      );
      await expect(oExtra.write.verify([0n, true])).to.be.rejected;
    });
  });

  describe("verify — guards", function () {
    it("rejects votes on unknown submission", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oBob = await as(2, oracle.address);
      await expect(oBob.write.verify([42n, true])).to.be.rejected;
    });

    it("rejects self-verification by the submitter", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);
      await expect(oAlice.write.verify([0n, true])).to.be.rejected;
    });

    it("rejects duplicate verification by the same wallet", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);
      const oBob = await as(2, oracle.address);
      await oBob.write.verify([0n, true]);
      await expect(oBob.write.verify([0n, true])).to.be.rejected;
    });
  });

  describe("claimRewards", function () {
    it("sweeps pending balance and emits RewardsClaimed", async function () {
      const { alice, bob, carol, dave, oracle, cUSD, publicClient } =
        await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);
      await (await as(2, oracle.address)).write.verify([0n, true]);
      await (await as(3, oracle.address)).write.verify([0n, true]);
      await (await as(4, oracle.address)).write.verify([0n, true]);

      const before = await cUSD.read.balanceOf([alice.account.address]);
      const tx = await oAlice.write.claimRewards();
      await publicClient.waitForTransactionReceipt({ hash: tx });
      const after = await cUSD.read.balanceOf([alice.account.address]);

      expect(after - before).to.equal(SUBMITTER_REWARD);
      expect(
        await oracle.read.pendingRewards([alice.account.address]),
      ).to.equal(0n);

      const events = await oracle.getEvents.RewardsClaimed();
      expect(events.length).to.equal(1);
      expect(events[0].args.amount).to.equal(SUBMITTER_REWARD);
    });

    it("reverts when nothing to claim", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oBob = await as(2, oracle.address);
      await expect(oBob.write.claimRewards()).to.be.rejected;
    });
  });

  describe("upgrade safety (UUPS)", function () {
    it("preserves V1 state through upgradeToAndCall to V2", async function () {
      const { alice, owner, oracle } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await oAlice.write.submitPrice([BARCODE_A, ZONE_A, 80n, RECEIPT]);
      const oBob = await as(2, oracle.address);
      const oCarol = await as(3, oracle.address);
      const oDave = await as(4, oracle.address);
      await oBob.write.verify([0n, true]);
      await oCarol.write.verify([0n, true]);
      await oDave.write.verify([0n, true]);

      const v2Impl = await hre.viem.deployContract("PriceOracleV2", []);
      const oOwner = await as(0, oracle.address);
      await oOwner.write.upgradeToAndCall([v2Impl.address, "0x"]);

      const v2 = await hre.viem.getContractAt(
        "PriceOracleV2",
        oracle.address,
      );
      const v2Owner = await hre.viem.getContractAt(
        "PriceOracleV2",
        oracle.address,
        { client: { wallet: (await hre.viem.getWalletClients())[0] } },
      );
      await v2Owner.write.setVersion(["v2.0.0"]);
      expect(await v2.read.version()).to.equal("v2.0.0");
      expect(await v2.read.pendingRewards([alice.account.address])).to.equal(
        SUBMITTER_REWARD,
      );
      expect(await v2.read.nextId()).to.equal(1n);
    });

    it("rejects upgrade from non-owner", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const v2Impl = await hre.viem.deployContract("PriceOracleV2", []);
      const oAlice = await as(1, oracle.address);
      await expect(oAlice.write.upgradeToAndCall([v2Impl.address, "0x"])).to.be
        .rejected;
    });
  });

  describe("guards", function () {
    it("initialize rejects zero addresses", async function () {
      const impl = await hre.viem.deployContract("PriceOracle", []);
      const [owner] = await hre.viem.getWalletClients();
      const badInit = encodeFunctionData({
        abi: impl.abi,
        functionName: "initialize",
        args: [zeroAddress, zeroAddress],
      });
      await expect(
        hre.viem.deployContract("ERC1967Proxy", [impl.address, badInit]),
      ).to.be.rejected;
      // ensure we silence unused linter for `owner`
      void owner;
    });

    it("ownerWithdraw can only be called by owner", async function () {
      const { oracle } = await loadFixture(deployFixture);
      const oAlice = await as(1, oracle.address);
      await expect(
        oAlice.write.ownerWithdraw([
          (await hre.viem.getWalletClients())[1].account.address,
          1n,
        ]),
      ).to.be.rejected;
    });
  });
});
