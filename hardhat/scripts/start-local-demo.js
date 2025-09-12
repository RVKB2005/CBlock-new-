const hre = require("hardhat");

async function main() {
  console.log("🚀 Starting Local Carbon Market Demo...");
  console.log("=====================================\n");

  // Get the default hardhat accounts
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  console.log("💰 Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  console.log("📦 Deploying contracts...");
  
  // Deploy Governance Token first
  const GovernanceToken = await hre.ethers.getContractFactory("GovernanceToken");
  const govToken = await GovernanceToken.deploy();
  await govToken.waitForDeployment();
  console.log("✅ GovernanceToken deployed to:", await govToken.getAddress());

  // Deploy Governor
  const CarbonGovernor = await hre.ethers.getContractFactory("CarbonGovernor");
  const governor = await CarbonGovernor.deploy(await govToken.getAddress());
  await governor.waitForDeployment();
  console.log("✅ CarbonGovernor deployed to:", await governor.getAddress());

  // Deploy VerifierRegistry with deployer as executor for demo
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const verifierRegistry = await VerifierRegistry.deploy(deployer.address);
  await verifierRegistry.waitForDeployment();
  console.log("✅ VerifierRegistry deployed to:", await verifierRegistry.getAddress());

  const CarbonCredit = await hre.ethers.getContractFactory("CarbonCredit");
  const carbon = await CarbonCredit.deploy(await verifierRegistry.getAddress());
  await carbon.waitForDeployment();
  console.log("✅ CarbonCredit deployed to:", await carbon.getAddress());

  const RetirementCertificate = await hre.ethers.getContractFactory("RetirementCertificate");
  const cert = await RetirementCertificate.deploy();
  await cert.waitForDeployment();
  console.log("✅ RetirementCertificate deployed to:", await cert.getAddress());

  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const market = await Marketplace.deploy(await carbon.getAddress(), await cert.getAddress());
  await market.waitForDeployment();
  console.log("✅ Marketplace deployed to:", await market.getAddress());

  // Setup relationships
  await cert.transferOwnership(await market.getAddress());
  console.log("✅ Transferred cert ownership to marketplace");
  
  // Add deployer as a verifier for testing
  await verifierRegistry.addVerifier(deployer.address);
  console.log("✅ Added deployer as verifier for testing");
  
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("=======================");
  console.log("\n📋 Contract Addresses for .env file:");
  console.log(`VITE_CONTRACT_GOVERNANCE_TOKEN_ADDRESS=${await govToken.getAddress()}`);
  console.log(`VITE_CONTRACT_CARBON_GOVERNOR_ADDRESS=${await governor.getAddress()}`);
  console.log(`VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS=${await verifierRegistry.getAddress()}`);
  console.log(`VITE_CONTRACT_CARBON_ADDRESS=${await carbon.getAddress()}`);
  console.log(`VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS=${await cert.getAddress()}`);
  console.log(`VITE_CONTRACT_MARKETPLACE_ADDRESS=${await market.getAddress()}`);
  
  console.log(`\n🔑 Verifier Address (for signing): ${deployer.address}`);
  console.log(`\n💡 Make sure your MetaMask is connected to: http://localhost:8545`);
  console.log(`💡 Import the account with private key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
  console.log(`\n✨ Ready to run the frontend!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
