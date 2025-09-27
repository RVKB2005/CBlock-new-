const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying DocumentRegistry with account:", deployer.address);

  // Get the VerifierRegistry address from environment
  const verifierRegistryAddress =
    process.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;

  if (!verifierRegistryAddress) {
    throw new Error(
      "VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS not found in environment variables"
    );
  }

  console.log("Using VerifierRegistry at:", verifierRegistryAddress);

  // Deploy DocumentRegistry
  const DocumentRegistry = await hre.ethers.getContractFactory(
    "DocumentRegistry"
  );
  const documentRegistry = await DocumentRegistry.deploy(
    verifierRegistryAddress
  );
  await documentRegistry.waitForDeployment();

  const documentRegistryAddress = await documentRegistry.getAddress();
  console.log("DocumentRegistry deployed to:", documentRegistryAddress);

  // Verify the deployment by checking the verifier registry reference
  const verifierRegistryRef = await documentRegistry.verifierRegistry();
  console.log(
    "DocumentRegistry verifierRegistry reference:",
    verifierRegistryRef
  );

  if (
    verifierRegistryRef.toLowerCase() !== verifierRegistryAddress.toLowerCase()
  ) {
    throw new Error("VerifierRegistry reference mismatch!");
  }

  console.log("\n==================================================");
  console.log("🚀 DOCUMENT REGISTRY DEPLOYMENT COMPLETE");
  console.log("==================================================\n");

  console.log("Add this to your frontend .env file:");
  console.log(
    `VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS="${documentRegistryAddress}"`
  );

  console.log("\n✅ DocumentRegistry is ready for use!");
  console.log(
    "📝 The contract is connected to VerifierRegistry at:",
    verifierRegistryAddress
  );
  console.log("==================================================");

  return {
    documentRegistry: documentRegistryAddress,
    verifierRegistry: verifierRegistryAddress,
  };
}

// Allow this script to be imported or run directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

module.exports = main;
