const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Frontend Signature Verification");
  console.log("===================================");

  const CARBON_ADDRESS = "0xe74f9e14F5858a92eD59ECF21866afc42101a45E";
  const recipient = "0xbA172aa10BB4C09862c97BcA34B09975f8d9f98e";

  try {
    const [signer] = await ethers.getSigners();
    console.log("Script signer:", signer.address);
    
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbon = CarbonCredit.attach(CARBON_ADDRESS);
    
    // Get contract state
    const domainSeparator = await carbon.DOMAIN_SEPARATOR();
    const nonce = await carbon.nonces(recipient);
    const typehash = await carbon.ATTESTATION_TYPEHASH();
    
    console.log("\n📋 Contract State:");
    console.log("Domain Separator:", domainSeparator);
    console.log("Current nonce for", recipient + ":", nonce.toString());
    console.log("Typehash:", typehash);
    
    // Check network
    const network = await ethers.provider.getNetwork();
    console.log("Chain ID:", network.chainId.toString());
    
    // Recreate the EIP-712 domain exactly as the frontend does
    const domain = {
      name: 'CarbonCredit',
      version: '1',
      chainId: network.chainId,
      verifyingContract: CARBON_ADDRESS
    };
    
    console.log("\n🌐 EIP-712 Domain:");
    console.log("Name:", domain.name);
    console.log("Version:", domain.version);
    console.log("ChainId:", domain.chainId.toString());
    console.log("Contract:", domain.verifyingContract);
    
    // Create test signature with same data as frontend
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
    
    const attestationValue = {
      gsProjectId: "GS-1234",
      gsSerial: "123456", 
      ipfsCid: "QmDemoz4989vgp689",
      amount: 1,
      recipient: recipient,
      nonce: Number(nonce)
    };
    
    console.log("\n📝 Attestation Value:");
    console.log("Project ID:", attestationValue.gsProjectId);
    console.log("Serial:", attestationValue.gsSerial);
    console.log("IPFS CID:", attestationValue.ipfsCid);
    console.log("Amount:", attestationValue.amount);
    console.log("Recipient:", attestationValue.recipient);
    console.log("Nonce:", attestationValue.nonce);
    
    // Create signature using the contract signer (the private key that can actually sign)
    const signature = await signer.signTypedData(domain, types, attestationValue);
    
    console.log("\n✅ Generated New Signature:", signature);
    console.log("🔑 Signed by:", signer.address);
    
    // Test if this signature would work
    const structHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "uint256", "address", "uint256"],
        [
          typehash,
          ethers.keccak256(ethers.toUtf8Bytes(attestationValue.gsProjectId)),
          ethers.keccak256(ethers.toUtf8Bytes(attestationValue.gsSerial)),
          ethers.keccak256(ethers.toUtf8Bytes(attestationValue.ipfsCid)),
          attestationValue.amount,
          attestationValue.recipient,
          attestationValue.nonce
        ]
      )
    );

    const digest = ethers.keccak256(
      ethers.solidityPacked(["string", "bytes32", "bytes32"], ["\\x19\\x01", domainSeparator, structHash])
    );

    const recoveredSigner = ethers.recoverAddress(digest, signature);
    
    console.log("\n🔍 Signature Verification:");
    console.log("Recovered signer:", recoveredSigner);
    console.log("Expected signer:", signer.address);
    console.log("Match:", recoveredSigner.toLowerCase() === signer.address.toLowerCase());
    
    // Check if recovered signer is a verifier
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const registry = VerifierRegistry.attach("0xD009D4EA4B9f546261433a75A32353a60d750200");
    const isVerifier = await registry.isVerifier(recoveredSigner);
    
    console.log("Is recovered signer a verifier?", isVerifier);
    
    console.log("\n🎯 SOLUTION:");
    console.log("Your frontend should sign with the SAME wallet that is registered as a verifier.");
    console.log("The verifier wallet is:", signer.address);
    console.log("But the frontend is trying to sign with:", recipient);
    console.log("Make sure MetaMask is connected with the verifier wallet!");

  } catch (error) {
    console.error("❌ Error:", error.message);
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
