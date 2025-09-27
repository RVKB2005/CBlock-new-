const hre = require("hardhat");

async function main() {
    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Contract addresses from environment
    const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS;
    const VERIFIER_ADDRESS = process.env.VERIFIER_ADDRESS;
    
    if (!VERIFIER_REGISTRY_ADDRESS || !VERIFIER_ADDRESS) {
        console.error("Please set VERIFIER_REGISTRY_ADDRESS and VERIFIER_ADDRESS in .env");
        process.exit(1);
    }

    console.log("Verifier Registry:", VERIFIER_REGISTRY_ADDRESS);
    console.log("Verifier to add:", VERIFIER_ADDRESS);

    // Get the verifier registry contract
    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);

    try {
        // Check current verifier status
        const isVerifier = await verifierRegistry.isVerifier(VERIFIER_ADDRESS);
        console.log("Current verifier status:", isVerifier ? "✅ Already a verifier" : "❌ Not a verifier");
        
        if (isVerifier) {
            return; // Already a verifier, nothing to do
        }

        // Get current nonce for the deployer
        const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
        console.log("Current nonce:", nonce);

        // Get current gas price and add 20%
        const feeData = await hre.ethers.provider.getFeeData();
        const gasPrice = feeData.gasPrice.mul(120).div(100);
        console.log("Using gas price:", hre.ethers.utils.formatUnits(gasPrice, 'gwei'), "gwei");

        // Build the transaction
        const tx = await verifierRegistry.populateTransaction.addVerifier(VERIFIER_ADDRESS);
        
        // Send the transaction with explicit gas settings
        const txResponse = await deployer.sendTransaction({
            to: VERIFIER_REGISTRY_ADDRESS,
            data: tx.data,
            gasPrice: gasPrice,
            gasLimit: 200000, // Sufficient gas limit
            nonce: nonce
        });

        console.log("\nTransaction sent:", txResponse.hash);
        console.log("Waiting for confirmation...");
        
        const receipt = await txResponse.wait();
        console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
        
        // Verify the addition
        const isVerifierNow = await verifierRegistry.isVerifier(VERIFIER_ADDRESS);
        console.log("New verifier status:", isVerifierNow ? "✅ Successfully added" : "❌ Failed to add verifier");
        
    } catch (error) {
        console.error("\n❌ Error:");
        console.error(error.message);
        
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
