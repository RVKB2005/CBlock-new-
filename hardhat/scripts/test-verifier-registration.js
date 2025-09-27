const hre = require("hardhat");

async function main() {
    // Get signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    
    // Get contract instances
    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.attach(process.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS);
    
    // Check current governor
    const governor = await verifierRegistry.governanceExecutor();
    console.log("Current governor:", governor);
    
    // Check if verifier is already registered
    const verifierAddress = "0x32659CC1783F69000874f15947deB13248091d67";
    const isVerifier = await verifierRegistry.isVerifier(verifierAddress);
    console.log(`Is ${verifierAddress} a verifier?`, isVerifier);
    
    if (!isVerifier) {
        console.log("\nAttempting to add verifier...");
        try {
            const tx = await verifierRegistry.addVerifier(verifierAddress);
            console.log("Transaction hash:", tx.hash);
            await tx.wait();
            console.log("Verifier added successfully!");
            
            // Verify
            const isNowVerifier = await verifierRegistry.isVerifier(verifierAddress);
            console.log(`Is ${verifierAddress} now a verifier?`, isNowVerifier);
        } catch (error) {
            console.error("Error adding verifier:", error.reason || error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
