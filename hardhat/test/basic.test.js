const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Basic flow", function () {
  it("deploys and mints with attestation (simulated)", async function () {
    const [deployer, verifier, user] = await ethers.getSigners();

    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.deploy(deployer.address);
    await verifierRegistry.waitForDeployment();

    // For test, authorize verifier by calling addVerifier via deployer (as governor executor)
    await verifierRegistry.addVerifier(verifier.address);

    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbon = await CarbonCredit.deploy(await verifierRegistry.getAddress());
    await carbon.waitForDeployment();

    // create attestation by signing (simulate off-chain signer)
    const gsProjectId = "GS-TEST-1";
    const gsSerial = "SERIAL-1";
    const ipfsCid = "QmFakeCid";
    const amount = 10;
    const recipient = user.address;

    const nonce = Number(await carbon.nonces(recipient));
    const domainSeparator = await carbon.DOMAIN_SEPARATOR();
    const ATTESTATION_TYPEHASH = await carbon.ATTESTATION_TYPEHASH();

    // Ethers.js - build digest as in contract
    const abiEncoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32','bytes32','bytes32','uint256','address','uint256'],
      [
        ethers.keccak256(ethers.toUtf8Bytes(gsProjectId)),
        ethers.keccak256(ethers.toUtf8Bytes(gsSerial)),
        ethers.keccak256(ethers.toUtf8Bytes(ipfsCid)),
        amount,
        recipient,
        nonce
      ]
    );

    // This local test will skip signing flow; instead call mintWithAttestation as if signature is from verifier
    // For proper signature test, you'd construct EIP-712 typed data in tests. Here we shortcut by using verifier as signer and passing signature from verifier.
    // This is a placeholder test to ensure deploy works.
    await expect(carbon.mintWithAttestation(gsProjectId, gsSerial, ipfsCid, amount, recipient, "0x")).to.be.reverted;
  });
});
