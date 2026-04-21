// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {EscrowMarketplace} from "../src/EscrowMarketplace.sol";

contract DeployScript is Script {
    function run() external {
        vm.startBroadcast();

        EscrowMarketplace escrow = new EscrowMarketplace(msg.sender);
        console.log("EscrowMarketplace deployed at:", address(escrow));
        console.log("Admin:", msg.sender);

        vm.stopBroadcast();
    }
}
