const hre = require("hardhat");
require('dotenv').config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with", deployer.address);

  // Deploy Governance Token first
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const govToken = await GovernanceToken.deploy();
  await govToken.waitForDeployment();
  console.log("GovernanceToken:", await govToken.getAddress());

  // Deploy Governor
  const CarbonGovernor = await hre.ethers.getContractFactory("CarbonGovernor");
  const governor = await CarbonGovernor.deploy(await govToken.getAddress());
  await governor.waitForDeployment();
  console.log("CarbonGovernor:", await governor.getAddress());

  // Deploy VerifierRegistry with deployer as executor for demo (in production, use governor)
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const verifierRegistry = await VerifierRegistry.deploy(deployer.address);
  await verifierRegistry.waitForDeployment();
  console.log("VerifierRegistry:", await verifierRegistry.getAddress());

  const CarbonCredit = await hre.ethers.getContractFactory("CarbonCredit");
  const carbon = await CarbonCredit.deploy(await verifierRegistry.getAddress());
  await carbon.waitForDeployment();
  console.log("CarbonCredit:", await carbon.getAddress());

  const RetirementCertificate = await hre.ethers.getContractFactory("RetirementCertificate");
  const cert = await RetirementCertificate.deploy();
  await cert.waitForDeployment();
  console.log("RetirementCertificate:", await cert.getAddress());

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy(await carbon.getAddress(), await cert.getAddress());
  await market.waitForDeployment();
  console.log("Marketplace:", await market.getAddress());

  // transfer ownership of cert to marketplace for demo retirement minting
  await cert.transferOwnership(await market.getAddress());
  console.log("Transferred cert ownership to marketplace");
  
  // Add deployer as a verifier for testing
  console.log("\nAdding deployer as verifier for testing...");
  await verifierRegistry.addVerifier(deployer.address);
  console.log("✅ Added deployer as verifier");
  
  // Print all contract addresses for easy copying to .env
  console.log("\n==================================================");
  console.log("🚀 DEPLOYMENT COMPLETE - CONTRACT ADDRESSES:");
  console.log("==================================================\n");
  
  console.log("Copy these to your frontend .env file:");
  console.log(`VITE_CONTRACT_GOVERNANCE_TOKEN_ADDRESS=${await govToken.getAddress()}`);
  console.log(`VITE_CONTRACT_CARBON_GOVERNOR_ADDRESS=${await governor.getAddress()}`);
  console.log(`VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS=${await verifierRegistry.getAddress()}`);
  console.log(`VITE_CONTRACT_CARBON_ADDRESS=${await carbon.getAddress()}`);
  console.log(`VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS=${await cert.getAddress()}`);
  console.log(`VITE_CONTRACT_MARKETPLACE_ADDRESS=${await market.getAddress()}`);
  
  console.log(`\n📝 Deployer (${deployer.address}) has been added as a verifier for testing.`);
  console.log("💡 You can now use this address to sign attestations in the frontend.");
  console.log("\n✨ Ready to run the frontend with: npm run dev");
  console.log("==================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
