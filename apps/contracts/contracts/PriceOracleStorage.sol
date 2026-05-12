// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PriceOracleStorage — versioned storage layout for the PriceOracle UUPS proxy.
abstract contract PriceOracleStorage {
    /// @notice Reward token used for both incentive payouts and the reward pool funding.
    address public cUSD;

    struct Submission {
        bytes12 barcode;
        bytes6 zoneKey;
        uint64 priceCents;
        bytes32 receiptHash;
        address submitter;
        uint64 timestamp;
        address[3] verifiers;
        uint8 verifyCount;
        uint8 acceptCount;
        bool finalized;
        bool accepted;
    }

    /// @notice id => submission record
    mapping(uint256 => Submission) public submissions;

    /// @notice submissionId => verifier => has voted?
    mapping(uint256 => mapping(address => bool)) public hasVerified;

    /// @notice unclaimed rewards per user (in cUSD smallest units).
    mapping(address => uint256) public rewards;

    /// @notice monotonic counter — also the id of the next submission.
    uint256 public nextId;

    /// @dev Reserved slots for future V1 additions. Decrement when appending.
    uint256[45] private __gap;
}
