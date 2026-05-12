// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {PriceOracleStorage} from "./PriceOracleStorage.sol";

/// @title PriceOracle — UUPS-upgradeable crowdsourced price feed for cUSD payouts.
/// @notice MVP launch contract: no Sybil gates (anyone may submit / verify).
///         Anti-Sybil restrictions (wallet-age threshold, daily caps, bond,
///         outlier flag) are added via UUPS upgrade reusing the storage gap.
contract PriceOracle is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    PriceOracleStorage
{
    using SafeERC20 for IERC20;

    /// @notice cUSD paid to the submitter of an accepted submission.
    uint256 public constant SUBMITTER_REWARD = 1e15; // 0.001 cUSD

    /// @notice cUSD paid to each verifier of an accepted submission.
    uint256 public constant VERIFIER_REWARD = 2e14; // 0.0002 cUSD

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

    function initialize(address owner_, address cUSD_) external initializer {
        if (owner_ == address(0) || cUSD_ == address(0)) revert ZeroAddress();
        __Ownable_init(owner_);
        cUSD = cUSD_;
    }

    /// @notice Submit a price observation. Returns the assigned submission id.
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

    /// @notice Cast an accept/reject verification vote on `id`. Each
    ///         submission accepts at most 3 votes. Resolution rules:
    ///         - 3-0 accepts: finalized as accepted, rewards distributed.
    ///         - 0-3 rejects: finalized as rejected, no rewards.
    ///         - Mixed votes (e.g. 2-1): submission becomes "locked" — no
    ///           further votes accepted and no rewards. Acceptable for MVP;
    ///           V2 adds a 7-day auto-finalize from mixed state.
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
            // Mixed votes: submission stays in locked-pending state (finalized=false,
            // verifyCount=3). No further actions possible until V2.
        }
    }

    /// @notice Sweep caller's accrued rewards to their wallet.
    function claimRewards() external {
        uint256 amount = rewards[msg.sender];
        if (amount == 0) revert NothingToClaim();
        rewards[msg.sender] = 0;

        IERC20(cUSD).safeTransfer(msg.sender, amount);
        emit RewardsClaimed(msg.sender, amount);
    }

    /// @notice Unclaimed rewards for `user`.
    function pendingRewards(address user) external view returns (uint256) {
        return rewards[user];
    }

    /// @notice Owner can pull cUSD from the contract — emergency drain only.
    function ownerWithdraw(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(cUSD).safeTransfer(to, amount);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
