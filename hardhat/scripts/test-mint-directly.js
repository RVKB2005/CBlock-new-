const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Testing Direct Mint with Correct Signature");
  console.log("==============================================");

  const [signer] = await ethers.getSigners();
  console.log("Signer address:", signer.address);

  const CARBON_ADDRESS = "0xe74f9e14F5858a92eD59ECF21866afc42101a45E";
  const recipient = signer.address; // Same as signer for testing

  try {
    const CarbonCredit = await ethers.getContractFactory("CarbonCredit");
    const carbon = CarbonCredit.attach(CARBON_ADDRESS);
    
    // Get current nonce BEFORE signing
    const currentNonce = await carbon.nonces(recipient);
    console.log("Current nonce:", currentNonce.toString());

    // Create EIP-712 signature
    const network = await ethers.provider.getNetwork();
    
    const domain = {
      name: 'CarbonCredit',
      version: '1',
      chainId: network.chainId,
      verifyingContract: CARBON_ADDRESS
    };

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
      nonce: Number(currentNonce)
    };

    console.log("\n📝 Signing attestation with:");
    console.log("- Project ID:", attestationValue.gsProjectId);
    console.log("- Serial:", attestationValue.gsSerial);
    console.log("- IPFS CID:", attestationValue.ipfsCid);
    console.log("- Amount:", attestationValue.amount);
    console.log("- Recipient:", attestationValue.recipient);
    console.log("- Nonce:", attestationValue.nonce);

    const signature = await signer.signTypedData(domain, types, attestationValue);
    console.log("\n✅ Signature created:", signature);

    // Now try to mint
    console.log("\n🔄 Attempting to mint...");
    
    const tx = await carbon.mintWithAttestation(
      attestationValue.gsProjectId,
      attestationValue.gsSerial,
      attestationValue.ipfsCid,
      attestationValue.amount,
      attestationValue.recipient,
      signature,
      { gasLimit: 500000 }
    );

    console.log("📤 Transaction sent:", tx.hash);
    console.log("⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      console.log("🎉 SUCCESS! Carbon credits minted!");
      console.log("Gas used:", receipt.gasUsed.toString());
      
      // Get the token ID from logs
      const mintEvent = receipt.logs.find(log => 
        log.topics[0] === ethers.id("MintedWithAttestation(uint256,address,uint256,address)")
      );
      
      if (mintEvent) {
        const tokenId = ethers.AbiCoder.defaultAbiCoder().decode(['uint256'], mintEvent.topics[1])[0];
        console.log("Token ID:", tokenId.toString());
      }
      
    } else {
      console.log("❌ Transaction failed");
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
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
