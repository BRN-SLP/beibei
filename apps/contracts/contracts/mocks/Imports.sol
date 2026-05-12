// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Pulls the OpenZeppelin ERC1967Proxy into Hardhat's artifact set so the
// test suite can deploy it directly via viem.
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
