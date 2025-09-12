const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Adding Verifier to Registry (Local Development)");
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer/Governor address:", deployer.address);
  console.log("Deployer balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH");

  // Get contract addresses from environment or use default local addresses
  const VERIFIER_REGISTRY_ADDRESS = process.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  if (!VERIFIER_REGISTRY_ADDRESS || VERIFIER_REGISTRY_ADDRESS === "YOUR_VERIFIER_REGISTRY_ADDRESS") {
    console.log("❌ Please set VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS in your environment or run deployment first");
    console.log("   Run: npm run deploy:local or npm run deploy:sepolia");
    return;
  }

  try {
    // Connect to the VerifierRegistry contract
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const registry = VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);
    
    console.log("📋 Connected to VerifierRegistry at:", VERIFIER_REGISTRY_ADDRESS);

    // Check current governor executor
    const currentExecutor = await registry.governanceExecutor();
    console.log("Current governance executor:", currentExecutor);
    
    if (currentExecutor.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ This account is not the governance executor");
      console.log("   Current executor:", currentExecutor);
      console.log("   Your address:", deployer.address);
      return;
    }

    // Get all provided addresses or use deployer as default
    const addressesToAdd = process.argv.slice(2);
    
    if (addressesToAdd.length === 0) {
      // Add the deployer as a verifier by default
      addressesToAdd.push(deployer.address);
      console.log("🎯 No addresses provided, adding deployer as verifier");
    }

    console.log("📝 Addresses to add as verifiers:", addressesToAdd);

    for (const address of addressesToAdd) {
      try {
        // Validate address
        if (!ethers.isAddress(address)) {
          console.log(`❌ Invalid address: ${address}`);
          continue;
        }

        // Check if already a verifier
        const isAlreadyVerifier = await registry.isVerifier(address);
        
        if (isAlreadyVerifier) {
          console.log(`✅ ${address} is already a registered verifier`);
          continue;
        }

        // Add as verifier
        console.log(`🔄 Adding ${address} as verifier...`);
        const tx = await registry.addVerifier(address);
        
        console.log(`📤 Transaction sent: ${tx.hash}`);
        await tx.wait();
        
        // Verify it was added
        const isNowVerifier = await registry.isVerifier(address);
        
        if (isNowVerifier) {
          console.log(`✅ Successfully added ${address} as verifier`);
        } else {
          console.log(`❌ Failed to add ${address} as verifier`);
        }
        
      } catch (error) {
        console.log(`❌ Error adding ${address}:`, error.message);
      }
    }

    console.log("\n🎉 Verifier registration complete!");
    console.log("\n📋 Next Steps:");
    console.log("1. Use one of these verifier addresses to sign attestations");
    console.log("2. In the frontend, connect with a verifier wallet");
    console.log("3. Complete the Upload → Sign → Mint workflow");
    console.log("4. The signature will now be accepted by the contract");

  } catch (error) {
    console.error("❌ Script failed:", error.message);
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
