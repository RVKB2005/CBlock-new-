const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Attestation flow", function () {
  it("signs EIP-712 attestation and mints token", async function () {
    const [deployer, verifier, recipient] = await ethers.getSigners();

    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.deploy(deployer.address);
    await verifierRegistry.waitForDeployment();

    // authorize verifier (deployer acts as governance executor in this demo)
    await verifierRegistry.addVerifier(verifier.address);

    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbon = await CarbonCredit.deploy(await verifierRegistry.getAddress());
    await carbon.waitForDeployment();

    // Build domain
    const domain = {
      name: 'CarbonCredit',
      version: '1',
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await carbon.getAddress()
    };

    const types = {
      Attestation: [
        { name: 'gsProjectId', type: 'string' },
        { name: 'gsSerial', type: 'string' },
        { name: 'ipfsCid', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'recipient', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    const gsProjectId = "GS-TEST-1";
    const gsSerial = "SERIAL-1";
    const ipfsCid = "QmFakeCid";
    const amount = 5;
    const recipientAddress = recipient.address;
    const nonce = 0; // first nonce

    const value = { gsProjectId, gsSerial, ipfsCid, amount, recipient: recipientAddress, nonce };

    // verifier signs the typed data
    const signature = await verifier.signTypedData(domain, types, value);

    // call mintWithAttestation from recipient (external caller)
    await expect(carbon.connect(recipient).mintWithAttestation(gsProjectId, gsSerial, ipfsCid, amount, recipientAddress, signature))
      .to.emit(carbon, 'MintedWithAttestation');

    // check token minted
    const tokenId = Number(await carbon.nextTokenId());
    const balance = await carbon.balanceOf(recipientAddress, tokenId);
    expect(Number(balance)).to.equal(amount);
  });
});
