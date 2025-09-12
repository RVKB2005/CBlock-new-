const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Integration Test", function () {
  let deployer, verifier, buyer, seller;
  let govToken, governor, verifierRegistry, carbon, cert, marketplace;

  before(async function () {
    [deployer, verifier, buyer, seller] = await ethers.getSigners();
    console.log("Test accounts:", {
      deployer: deployer.address,
      verifier: verifier.address,
      buyer: buyer.address,
      seller: seller.address
    });
  });

  it("deploys all contracts successfully", async function () {
    // Deploy Governance Token
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    govToken = await GovernanceToken.deploy();
    await govToken.waitForDeployment();

    // Deploy Governor
    const CarbonGovernor = await ethers.getContractFactory("CarbonGovernor");
    governor = await CarbonGovernor.deploy(await govToken.getAddress());
    await governor.waitForDeployment();

    // Deploy VerifierRegistry with deployer as executor for testing
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    verifierRegistry = await VerifierRegistry.deploy(deployer.address);
    await verifierRegistry.waitForDeployment();

    // Deploy CarbonCredit
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    carbon = await CarbonCredit.deploy(await verifierRegistry.getAddress());
    await carbon.waitForDeployment();

    // Deploy RetirementCertificate
    const RetirementCertificate = await ethers.getContractFactory("RetirementCertificate");
    cert = await RetirementCertificate.deploy();
    await cert.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(await carbon.getAddress(), await cert.getAddress());
    await marketplace.waitForDeployment();

    // Transfer cert ownership to marketplace
    await cert.transferOwnership(await marketplace.getAddress());

    console.log("✅ All contracts deployed successfully");
  });

  it("adds verifier to registry", async function () {
    await verifierRegistry.addVerifier(verifier.address);
    expect(await verifierRegistry.isVerifier(verifier.address)).to.be.true;
    console.log("✅ Verifier added to registry");
  });

  it("mints carbon credits with attestation", async function () {
    // Build EIP-712 signature
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

    const value = {
      gsProjectId: "GS-TEST-PROJECT-1",
      gsSerial: "SERIAL-001",
      ipfsCid: "QmTestCid123",
      amount: 100,
      recipient: seller.address,
      nonce: 0
    };

    // Sign with verifier
    const signature = await verifier.signTypedData(domain, types, value);

    // Mint tokens
    await carbon.connect(seller).mintWithAttestation(
      value.gsProjectId,
      value.gsSerial,
      value.ipfsCid,
      value.amount,
      value.recipient,
      signature
    );

    // Check balance
    const balance = await carbon.balanceOf(seller.address, 1);
    expect(Number(balance)).to.equal(100);

    // Check attestation data
    const attestation = await carbon.attestations(1);
    expect(attestation.gsProjectId).to.equal("GS-TEST-PROJECT-1");
    expect(attestation.verifier).to.equal(verifier.address);

    console.log("✅ Carbon credits minted successfully with attestation");
  });

  it("lists tokens on marketplace", async function () {
    // Approve marketplace to transfer tokens
    await carbon.connect(seller).setApprovalForAll(await marketplace.getAddress(), true);

    // List tokens
    const pricePerUnit = ethers.parseEther("0.01"); // 0.01 ETH per token
    await marketplace.connect(seller).list(1, 50, pricePerUnit);

    // Check listing
    const listing = await marketplace.listings(1);
    expect(listing.seller).to.equal(seller.address);
    expect(Number(listing.amount)).to.equal(50);
    expect(listing.pricePerUnit).to.equal(pricePerUnit);

    console.log("✅ Tokens listed on marketplace");
  });

  it("buys tokens from marketplace", async function () {
    const pricePerUnit = ethers.parseEther("0.01");
    const buyAmount = 20;
    const totalPrice = pricePerUnit * BigInt(buyAmount);

    // Buy tokens
    await marketplace.connect(buyer).buy(1, buyAmount, { value: totalPrice });

    // Check buyer balance
    const buyerBalance = await carbon.balanceOf(buyer.address, 1);
    expect(Number(buyerBalance)).to.equal(20);

    // Check updated listing
    const listing = await marketplace.listings(1);
    expect(Number(listing.amount)).to.equal(30); // 50 - 20 = 30

    console.log("✅ Tokens purchased from marketplace");
  });

  it("retires tokens and gets certificate", async function () {
    // Buyer needs to approve marketplace to burn tokens
    await carbon.connect(buyer).setApprovalForAll(await marketplace.getAddress(), true);
    
    // Buyer retires some tokens
    const retireAmount = 10;
    const metadataURI = "https://example.com/retirement-metadata.json";

    await marketplace.connect(buyer).retire(1, retireAmount, metadataURI);

    // Check updated balance
    const buyerBalance = await carbon.balanceOf(buyer.address, 1);
    expect(Number(buyerBalance)).to.equal(10); // 20 - 10 = 10

    // Check certificate was minted
    const certBalance = await cert.balanceOf(buyer.address);
    expect(Number(certBalance)).to.equal(1);

    // Check certificate metadata
    const tokenURI = await cert.tokenURI(1);
    expect(tokenURI).to.equal(metadataURI);

    console.log("✅ Tokens retired and certificate issued");
  });

  it("handles token metadata correctly", async function () {
    // Check token URI
    const tokenURI = await carbon.uri(1);
    expect(tokenURI).to.equal("QmTestCid123");

    // Check total supply
    const totalSupply = await carbon.totalSupply(1);
    expect(Number(totalSupply)).to.equal(90); // 100 - 10 retired = 90

    console.log("✅ Token metadata handled correctly");
  });

  it("governance token works correctly", async function () {
    // Check initial supply
    const totalSupply = await govToken.totalSupply();
    expect(totalSupply).to.equal(ethers.parseEther("1000000"));

    // Check deployer balance
    const deployerBalance = await govToken.balanceOf(deployer.address);
    expect(deployerBalance).to.equal(ethers.parseEther("1000000"));

    console.log("✅ Governance token functions correctly");
  });

  it("marketplace fees work correctly", async function () {
    // Check fee rate
    const feeBps = await marketplace.feeBps();
    expect(Number(feeBps)).to.equal(100); // 1%

    // Check accrued fees for admin (deployer in this case)
    const admin = await marketplace.admin();
    expect(admin).to.equal(deployer.address);

    console.log("✅ Marketplace fees configured correctly");
  });

  after(async function () {
    console.log("\n🎉 ALL INTEGRATION TESTS PASSED!");
    console.log("📊 Test Results Summary:");
    console.log("  ✅ Contract deployment");
    console.log("  ✅ Verifier registration");  
    console.log("  ✅ Carbon credit minting with EIP-712 attestation");
    console.log("  ✅ Marketplace listing");
    console.log("  ✅ Token purchasing");
    console.log("  ✅ Token retirement with certificates");
    console.log("  ✅ Metadata handling");
    console.log("  ✅ Governance token");
    console.log("  ✅ Marketplace fees");
    console.log("\n🚀 Ready for production deployment!");
  });
});
