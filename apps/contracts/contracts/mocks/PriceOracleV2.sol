// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {PriceOracle} from "../PriceOracle.sol";

/// @dev Used in upgrade-safety tests only. Adds a tiny extra storage slot
///      and a `version()` view to confirm V1 state survives upgrade.
contract PriceOracleV2 is PriceOracle {
    /// @dev Appended AFTER V1 storage + gap.
    string private _version;

    function setVersion(string calldata v) external onlyOwner {
        _version = v;
    }

    function version() external view returns (string memory) {
        return _version;
    }
}
