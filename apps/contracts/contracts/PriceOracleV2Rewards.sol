// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PriceOracleStorage} from "./PriceOracleStorage.sol";

/// @title PriceOracleV2Rewards — 50x reward bump, otherwise identical to V1.
/// @notice The launch-day economics (0.001 / 0.0002 cUSD) were tuned for a
///         Sybil-farm risk model, not a real-user motivation model. Real
///         users in KE/NG/GH/ZA need the reward to clear cognitive cost,
///         which means a meaningful per-action payout (≈ a cup of tea).
///         This V2 bumps to 0.05 / 0.01 cUSD without touching storage layout.
///
/// Storage compatibility: inherits the same `PriceOracleStorage` as V1, so
/// the OpenZeppelin Hardhat upgrades plugin accepts the upgrade. The
/// `constant` bump lives in bytecode and cannot collide with any existing
/// storage slot.
///
/// Dual-role: works both as an upgrade target (Sepolia path, started life
/// as V1 → V2 via `upgradeProxy`) AND as the initial implementation for a
/// fresh proxy (Mainnet path — skip V1 entirely, save one tx). The
/// `initialize()` below mirrors V1's so `deployProxy` succeeds; on upgrade
/// the `initializer` modifier blocks re-init, so V1 storage carries over
/// untouched.
/// @custom:oz-upgrades-from PriceOracle
contract PriceOracleV2Rewards is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PriceOracleStorage
{
    using SafeERC20 for IERC20;

    /// @notice cUSD paid to the submitter of an accepted submission.
    ///         V1: 1e15 (0.001). V2: 5e16 (0.05).
    uint256 public constant SUBMITTER_REWARD = 5e16;

    /// @notice cUSD paid to each verifier of an accepted submission.
    ///         V1: 2e14 (0.0002). V2: 1e16 (0.01).
    uint256 public constant VERIFIER_REWARD = 1e16;

    /// @notice Number of verifications required to finalize a submission.
    uint8 public constant CONSENSUS_THRESHOLD = 3;

    event PriceSubmitted(
        uint256 indexed submissionId,
        bytes12 indexed barcode,
        bytes6 indexed zoneKey,
        address submitter,
        uint64 priceCents,
        bytes32 receiptHash,
        uint64 timestamp
    );

    event Verified(
        uint256 indexed submissionId,
        address indexed verifier,
        bool isValid
    );

    event SubmissionFinalized(
        uint256 indexed submissionId,
        bool accepted
    );

    event RewardsClaimed(address indexed user, uint256 amount);

    error ZeroAddress();
    error UnknownSubmission(uint256 id);
    error AlreadyFinalized(uint256 id);
    error SubmissionLocked(uint256 id);
    error CannotVerifyOwnSubmission();
    error AlreadyVerified();
    error NothingToClaim();
    error InsufficientPoolBalance(uint256 requested, uint256 available);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initial proxy setup for a fresh deploy (Mainnet path).
    ///         Skipped on upgrades — the `initializer` modifier blocks
    ///         re-init, so V1 storage (owner + cUSD) carries over untouched
    ///         when used as an `upgradeProxy` target on Sepolia.
    function initialize(address owner_, address cUSD_) external initializer {
        if (owner_ == address(0) || cUSD_ == address(0)) revert ZeroAddress();
        __Ownable_init(owner_);
        cUSD = cUSD_;
    }

    function submitPrice(
        bytes12 barcode,
        bytes6 zoneKey,
        uint64 priceCents,
        bytes32 receiptHash
    ) external returns (uint256 id) {
        id = nextId++;
        Submission storage s = submissions[id];
        s.barcode = barcode;
        s.zoneKey = zoneKey;
        s.priceCents = priceCents;
        s.receiptHash = receiptHash;
        s.submitter = msg.sender;
        s.timestamp = uint64(block.timestamp);

        emit PriceSubmitted(
            id,
            barcode,
            zoneKey,
            msg.sender,
            priceCents,
            receiptHash,
            uint64(block.timestamp)
        );
    }

    function verify(uint256 id, bool isValid) external {
        Submission storage s = submissions[id];
        if (s.submitter == address(0)) revert UnknownSubmission(id);
        if (s.finalized) revert AlreadyFinalized(id);
        if (s.verifyCount >= CONSENSUS_THRESHOLD) revert SubmissionLocked(id);
        if (s.submitter == msg.sender) revert CannotVerifyOwnSubmission();
        if (hasVerified[id][msg.sender]) revert AlreadyVerified();

        hasVerified[id][msg.sender] = true;
        s.verifiers[s.verifyCount] = msg.sender;
        s.verifyCount++;
        if (isValid) s.acceptCount++;

        emit Verified(id, msg.sender, isValid);

        if (s.verifyCount == CONSENSUS_THRESHOLD) {
            if (s.acceptCount == CONSENSUS_THRESHOLD) {
                s.finalized = true;
                s.accepted = true;

                uint256 totalNeeded = SUBMITTER_REWARD +
                    uint256(CONSENSUS_THRESHOLD) *
                    VERIFIER_REWARD;
                uint256 available = IERC20(cUSD).balanceOf(address(this));
                if (available < totalNeeded) {
                    revert InsufficientPoolBalance(totalNeeded, available);
                }

                rewards[s.submitter] += SUBMITTER_REWARD;
                for (uint256 i = 0; i < CONSENSUS_THRESHOLD; i++) {
                    rewards[s.verifiers[i]] += VERIFIER_REWARD;
                }
                emit SubmissionFinalized(id, true);
            } else if (s.acceptCount == 0) {
                s.finalized = true;
                s.accepted = false;
                emit SubmissionFinalized(id, false);
            }
        }
    }

    function claimRewards() external {
        uint256 amount = rewards[msg.sender];
        if (amount == 0) revert NothingToClaim();
        rewards[msg.sender] = 0;

        IERC20(cUSD).safeTransfer(msg.sender, amount);
        emit RewardsClaimed(msg.sender, amount);
    }

    function pendingRewards(address user) external view returns (uint256) {
        return rewards[user];
    }

    function ownerWithdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(cUSD).safeTransfer(to, amount);
    }

    /// @notice Lightweight version probe — proves the upgrade landed.
    function version() external pure returns (string memory) {
        return "v2";
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
