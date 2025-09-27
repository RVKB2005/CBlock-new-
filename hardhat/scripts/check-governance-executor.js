const hre = require("hardhat");

async function main() {
    const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS;
    
    if (!VERIFIER_REGISTRY_ADDRESS) {
        console.error("VERIFIER_REGISTRY_ADDRESS not set in .env");
        process.exit(1);
    }

    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);
    
    // Get the current governance executor
    const governanceExecutor = await verifierRegistry.governanceExecutor();
    console.log("Current Governance Executor:", governanceExecutor);
    
    // Get current signer
    const [signer] = await hre.ethers.getSigners();
    console.log("\nCurrent signer:", signer.address);
    console.log("Is signer the governance executor?", 
        signer.address.toLowerCase() === governanceExecutor.toLowerCase() ? "✅ Yes" : "❌ No");
    
    if (signer.address.toLowerCase() !== governanceExecutor.toLowerCase()) {
        console.log("\nTo add a verifier, you need to use the governance executor's private key.");
        console.log("Current governance executor:", governanceExecutor);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
