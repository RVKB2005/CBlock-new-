const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Adding Your Wallet as Verifier");
  console.log("==================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Your wallet address
  const YOUR_WALLET = "0xbA172aa10BB4C09862c97BcA34B09975f8d9f98e";
  console.log("Target wallet:", YOUR_WALLET);

  const VERIFIER_REGISTRY_ADDRESS = "0xD009D4EA4B9f546261433a75A32353a60d750200";
  console.log("Registry address:", VERIFIER_REGISTRY_ADDRESS);

  try {
    // Connect to the VerifierRegistry contract
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const registry = VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);
    
    console.log("📋 Connected to VerifierRegistry");

    // Check if already a verifier
    const isAlreadyVerifier = await registry.isVerifier(YOUR_WALLET);
    
    if (isAlreadyVerifier) {
      console.log(`✅ ${YOUR_WALLET} is already a registered verifier!`);
      return;
    }

    // Add as verifier
    console.log(`🔄 Adding ${YOUR_WALLET} as verifier...`);
    const tx = await registry.addVerifier(YOUR_WALLET);
    
    console.log(`📤 Transaction sent: ${tx.hash}`);
    console.log("⏳ Waiting for confirmation...");
    
    await tx.wait();
    
    // Verify it was added
    const isNowVerifier = await registry.isVerifier(YOUR_WALLET);
    
    if (isNowVerifier) {
      console.log(`✅ SUCCESS! ${YOUR_WALLET} is now a registered verifier!`);
      console.log("\n🎉 You can now mint carbon credits!");
      console.log("1. Go to your frontend");
      console.log("2. Connect with this wallet");
      console.log("3. Click 'Mint Carbon Credits' - it will work!");
    } else {
      console.log(`❌ Failed to add ${YOUR_WALLET} as verifier`);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };
