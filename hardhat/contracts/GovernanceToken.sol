// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GovernanceToken is ERC20Votes, Ownable {
    constructor() ERC20("CarbonGov", "CGOV") ERC20Permit("CarbonGov") {
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

}
