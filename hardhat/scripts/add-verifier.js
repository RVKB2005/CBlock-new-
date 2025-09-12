const hre = require("hardhat");

async function main() {
  // Get signers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Adding verifier with account:", deployer.address);

  // Contract addresses - you'll need to update these after deployment
  const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS || "";
  
  if (!VERIFIER_REGISTRY_ADDRESS) {
    console.error("Please set VERIFIER_REGISTRY_ADDRESS environment variable");
    console.log("Example: VERIFIER_REGISTRY_ADDRESS=0x... npx hardhat run scripts/add-verifier.js");
    return;
  }

  // Get the verifier registry contract
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const verifierRegistry = VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);

  // The address to add as a verifier (default to deployer for demo)
  const verifierAddress = process.env.VERIFIER_ADDRESS || deployer.address;
  
  console.log("Adding verifier:", verifierAddress);

  try {
    // Check if already a verifier
    const isVerifier = await verifierRegistry.isVerifier(verifierAddress);
    if (isVerifier) {
      console.log("✅ Address is already a registered verifier");
      return;
    }

    // Add the verifier
    const tx = await verifierRegistry.addVerifier(verifierAddress);
    console.log("Transaction submitted:", tx.hash);
    
    const receipt = await tx.wait();
    console.log("✅ Verifier added successfully!");
    console.log("Block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Verify the addition
    const isVerifierNow = await verifierRegistry.isVerifier(verifierAddress);
    console.log("Verification status:", isVerifierNow ? "✅ Verified" : "❌ Not verified");

  } catch (error) {
    console.error("❌ Error adding verifier:", error.message);
    
    if (error.message.includes("Not governor executor")) {
      console.log("\n💡 Note: Only the governance executor can add verifiers.");
      console.log("For demo purposes, the deployer should be the governance executor.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
