// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorSettings.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";

contract CarbonGovernor is Governor, GovernorSettings, GovernorCountingSimple, GovernorVotes, GovernorVotesQuorumFraction {
    constructor(IVotes _token)
        Governor("CarbonGovernor")
        GovernorSettings(1 /* voting delay */, 45818 /* voting period */, 0)
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(1) // 1% quorum for demo
    {}

    function votingDelay() public view override(IGovernor, GovernorSettings) returns (uint256) { return super.votingDelay(); }
    function votingPeriod() public view override(IGovernor, GovernorSettings) returns (uint256) { return super.votingPeriod(); }
    function quorum(uint256 blockNumber) public view override(IGovernor, GovernorVotesQuorumFraction) returns (uint256) { return super.quorum(blockNumber); }
    function proposalThreshold() public view override(Governor, GovernorSettings) returns (uint256) { return super.proposalThreshold(); }
}
