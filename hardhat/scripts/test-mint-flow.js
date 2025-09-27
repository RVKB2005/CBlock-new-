const hre = require("hardhat");
const { ethers } = hre;
const { Wallet } = ethers;

async function main() {
    // Load environment variables
    const VERIFIER_PRIVATE_KEY = process.env.VERIFIER_PRIVATE_KEY;
    const VERIFIER_REGISTRY_ADDRESS = process.env.VERIFIER_REGISTRY_ADDRESS;
    const CARBON_CREDIT_ADDRESS = process.env.VITE_CONTRACT_CARBON_ADDRESS;
    
    if (!VERIFIER_PRIVATE_KEY || !VERIFIER_REGISTRY_ADDRESS || !CARBON_CREDIT_ADDRESS) {
        console.error("Missing required environment variables");
        process.exit(1);
    }

    // Get provider and signers
    const provider = hre.ethers.provider;
    const [deployer] = await hre.ethers.getSigners();
    const verifierWallet = new Wallet(VERIFIER_PRIVATE_KEY, provider);
    
    console.log("Deployer:", deployer.address);
    console.log("Verifier:", verifierWallet.address);

    // Get contract instances
    const CarbonCredit = await hre.ethers.getContractFactory("CarbonCredit");
    const carbonCredit = await CarbonCredit.attach(CARBON_CREDIT_ADDRESS);
    
    const VerifierRegistry = await hre.ethers.getContractFactory("VerifierRegistry");
    const verifierRegistry = await VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);

    // Check if verifier is registered
    const isVerifier = await verifierRegistry.isVerifier(verifierWallet.address);
    console.log("Is verifier registered?", isVerifier);
    
    if (!isVerifier) {
        console.log("Verifier not registered. Registering...");
        const tx = await verifierRegistry.connect(deployer).addVerifier(verifierWallet.address);
        await tx.wait();
        console.log("Verifier registered successfully");
    }

    // Prepare minting data
    const recipient = deployer.address; // Or any other recipient address
    const nonce = (await carbonCredit.nonces(recipient)).toNumber();
    const tokenData = {
        gsProjectId: "test-project-123",
        gsSerial: "SERIAL-001",
        ipfsCid: "QmXyZ123...", // Replace with actual IPFS CID
        amount: 1000, // Amount to mint (in smallest unit)
        recipient: recipient,
        nonce: nonce
    };

    console.log("\nMinting data:", JSON.stringify(tokenData, null, 2));

    // Get chain ID
    const chainId = (await provider.getNetwork()).chainId;
    
    // EIP-712 Domain Separator
    const domain = {
        name: 'CarbonCredit',
        version: '1',
        chainId: chainId,
        verifyingContract: CARBON_CREDIT_ADDRESS
    };

    // EIP-712 Types
    const types = {
        Attestation: [
            { name: 'gsProjectId', type: 'string' },
            { name: 'gsSerial', type: 'string' },
            { name: 'ipfsCid', type: 'string' },
            { name: 'amount', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'nonce', type: 'uint256' }
        ]
    };

    console.log("\nSigning EIP-712 message...");
    
    // Sign the EIP-712 message
    const signature = await verifierWallet._signTypedData(domain, types, {
        gsProjectId: tokenData.gsProjectId,
        gsSerial: tokenData.gsSerial,
        ipfsCid: tokenData.ipfsCid,
        amount: tokenData.amount,
        recipient: tokenData.recipient,
        nonce: tokenData.nonce
    });

    console.log("Signature:", signature);

    // Submit the minting transaction
    console.log("\nSubmitting mint transaction...");
    const tx = await carbonCredit.connect(deployer).mintWithAttestation(
        tokenData.gsProjectId,
        tokenData.gsSerial,
        tokenData.ipfsCid,
        tokenData.amount,
        tokenData.recipient,
        signature
    );

    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Check the new token balance
    const tokenId = (await carbonCredit.nextTokenId()).toNumber();
    const balance = await carbonCredit.balanceOf(recipient, tokenId);
    console.log(`\nMinted ${balance} tokens with ID ${tokenId} to ${recipient}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\nError:", error);
        if (error.reason) console.error("Reason:", error.reason);
        process.exit(1);
    });
