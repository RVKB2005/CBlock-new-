const hre = require("hardhat");

async function main() {
  // Get signers
  const [deployer] = await hre.ethers.getSigners();
  console.log("Adding verifier with account:", deployer.address);

  // Contract address
  const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS;
  const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS;
  
  if (!VERIFIER_REGISTRY_ADDRESS || !VERIFIER_ADDRESS) {
    console.error("Please set both VERIFIER_REGISTRY_ADDRESS and VERIFIER_ADDRESS in .env");
    process.exit(1);
  }

  // Get the verifier registry contract
  const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
  const verifierRegistry = await VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);

  console.log("Checking if address is already a verifier...");
  const isVerifier = await verifierRegistry.isVerifier(VERIFIER_ADDRESS);
  if (isVerifier) {
    console.log("✅ Address is already a registered verifier");
    return;
  }

  console.log("Estimating gas...");
  try {
    // Get current gas price and add 20% to ensure quick inclusion
    const gasPrice = (await hre.ethers.provider.getFeeData()).gasPrice;
    const increasedGasPrice = gasPrice.mul(120).div(100); // 20% increase
    
    console.log(`Current gas price: ${hre.ethers.utils.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`Using increased gas price: ${hre.ethers.utils.formatUnits(increasedGasPrice, 'gwei')} gwei`);
    
    // Estimate gas
    const gasEstimate = await verifierRegistry.estimateGas.addVerifier(VERIFIER_ADDRESS);
    console.log(`Estimated gas: ${gasEstimate.toString()}`);
    
    // Send transaction with higher gas price
    console.log("Sending transaction...");
    const tx = await verifierRegistry.addVerifier(VERIFIER_ADDRESS, {
      gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
      gasPrice: increasedGasPrice
    });
    
    console.log("Transaction submitted:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Verify the addition
    const isVerifierNow = await verifierRegistry.isVerifier(VERIFIER_ADDRESS);
    console.log("Verification status:", isVerifierNow ? "✅ Verified" : "❌ Not verified");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("Not governor executor")) {
      console.log("\n⚠️  The sender doesn't have permission to add verifiers.");
      console.log("Only the governor can add verifiers. Check if you're using the correct account.");
      console.log("Current signer:", deployer.address);
    }
    
    if (error.reason) {
      console.log("Reason:", error.reason);
    }
    
    if (error.transaction) {
      console.log("Transaction hash:", error.transaction.hash);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
