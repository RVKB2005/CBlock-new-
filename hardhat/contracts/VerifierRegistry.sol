// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract VerifierRegistry {
    mapping(address => bool) public isVerifier;
    address public governanceExecutor;

    event VerifierAdded(address indexed verifier);
    event VerifierRemoved(address indexed verifier);

    modifier onlyGovernorExecutor() {
        require(msg.sender == governanceExecutor, "Not governor executor");
        _;
    }

    constructor(address _governanceExecutor) {
        governanceExecutor = _governanceExecutor;
    }

    function addVerifier(address verifier) external onlyGovernorExecutor {
        isVerifier[verifier] = true;
        emit VerifierAdded(verifier);
    }

    function removeVerifier(address verifier) external onlyGovernorExecutor {
        isVerifier[verifier] = false;
        emit VerifierRemoved(verifier);
    }
}
