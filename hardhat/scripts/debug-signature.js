const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Debugging Signature Verification");
  console.log("====================================");

  // Your actual data from the frontend
  const gsProjectId = "GS-1234";
  const gsSerial = "123456";
  const ipfsCid = "QmDemoz4989vgp689";
  const amount = 1;
  const recipient = "0xbA172aa10BB4C09862c97BcA34B09975f8d9f98e";
  const signature = "0xf873e0924a78ecabdaddc0e636174a3b662f1123d474b41931ef781b7ae3d0d8614b001e158f14d64609358c7ec5b92d1f6b33f46534cddc5f7928aca9b1b5fa1c";

  console.log("📋 Data being verified:");
  console.log("- Project ID:", gsProjectId);
  console.log("- Serial:", gsSerial);
  console.log("- IPFS CID:", ipfsCid);
  console.log("- Amount:", amount);
  console.log("- Recipient:", recipient);
  console.log("- Signature:", signature);

  const CARBON_ADDRESS = "0xe74f9e14F5858a92eD59ECF21866afc42101a45E";
  const VERIFIER_REGISTRY_ADDRESS = "0xD009D4EA4B9f546261433a75A32353a60d750200";

  try {
    // Connect to contracts
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbon = CarbonCredit.attach(CARBON_ADDRESS);
    
    const VerifierRegistry = await ethers.getContractFactory("VerifierRegistry");
    const registry = VerifierRegistry.attach(VERIFIER_REGISTRY_ADDRESS);

    console.log("\n🔗 Connected to contracts");

    // Get domain separator and nonce
    const domainSeparator = await carbon.DOMAIN_SEPARATOR();
    const nonce = await carbon.nonces(recipient);
    const typehash = await carbon.ATTESTATION_TYPEHASH();

    console.log("\n📝 Contract state:");
    console.log("- Domain Separator:", domainSeparator);
    console.log("- Nonce for recipient:", nonce.toString());
    console.log("- Typehash:", typehash);

    // Recreate the message hash exactly as the contract does
    const structHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ["bytes32", "bytes32", "bytes32", "bytes32", "uint256", "address", "uint256"],
        [
          typehash,
          ethers.keccak256(ethers.toUtf8Bytes(gsProjectId)),
          ethers.keccak256(ethers.toUtf8Bytes(gsSerial)),
          ethers.keccak256(ethers.toUtf8Bytes(ipfsCid)),
          amount,
          recipient,
          nonce
        ]
      )
    );

    const digest = ethers.keccak256(
      ethers.solidityPacked(["string", "bytes32", "bytes32"], ["\\x19\\x01", domainSeparator, structHash])
    );

    console.log("\n🔐 Message reconstruction:");
    console.log("- Struct Hash:", structHash);
    console.log("- Digest:", digest);

    // Recover the signer
    const recoveredSigner = ethers.recoverAddress(digest, signature);
    console.log("- Recovered Signer:", recoveredSigner);
    console.log("- Expected Signer:", recipient);

    // Check if recovered signer is a verifier
    const isVerifier = await registry.isVerifier(recoveredSigner);
    console.log("- Is recovered signer a verifier?", isVerifier);

    const isExpectedVerifier = await registry.isVerifier(recipient);
    console.log("- Is expected signer a verifier?", isExpectedVerifier);

    console.log("\n🎯 Analysis:");
    if (recoveredSigner.toLowerCase() === recipient.toLowerCase()) {
      console.log("✅ Signature recovery is correct!");
      if (isVerifier) {
        console.log("✅ Recovered signer is a registered verifier!");
        console.log("❓ The transaction should work... Check gas limits or other issues");
      } else {
        console.log("❌ Recovered signer is NOT a registered verifier");
      }
    } else {
      console.log("❌ Signature recovery failed!");
      console.log("   Expected:", recipient);
      console.log("   Got:", recoveredSigner);
      console.log("   This means the signature was created with different data or key");
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
