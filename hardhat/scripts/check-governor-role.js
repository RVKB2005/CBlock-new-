const hre = require("hardhat");

async function main() {
    const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS;
    
    if (!VERIFIER_REGISTRY_ADDRESS) {
        console.error("VERIFIER_REGISTRY_ADDRESS not set in .env");
        process.exit(1);
    }

    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);
    
    // Get the governor role hash (usually DEFAULT_ADMIN_ROLE or a custom role)
    const GOVERNOR_ROLE = await verifierRegistry.GOVERNOR_ROLE();
    console.log("GOVERNOR_ROLE:", GOVERNOR_ROLE);
    
    // Get the current governor
    const governorCount = await verifierRegistry.getRoleMemberCount(GOVERNOR_ROLE);
    console.log("Number of governors:", governorCount.toString());
    
    for (let i = 0; i < governorCount; i++) {
        const governor = await verifierRegistry.getRoleMember(GOVERNOR_ROLE, i);
        console.log(`Governor ${i + 1}:`, governor);
    }
    
    // Check if current signer is a governor
    const [signer] = await hre.ethers.getSigners();
    const isSignerGovernor = await verifierRegistry.hasRole(GOVERNOR_ROLE, signer.address);
    console.log("\nCurrent signer:", signer.address);
    console.log("Is signer a governor?", isSignerGovernor ? "✅ Yes" : "❌ No");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
