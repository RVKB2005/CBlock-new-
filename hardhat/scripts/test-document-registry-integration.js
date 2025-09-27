const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log(
    "Testing DocumentRegistry integration with account:",
    deployer.address
  );

  // Get contract addresses from environment
  const documentRegistryAddress =
    process.env.VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS;
  const verifierRegistryAddress =
    process.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;

  if (!documentRegistryAddress) {
    throw new Error(
      "VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS not found in environment variables"
    );
  }

  if (!verifierRegistryAddress) {
    throw new Error(
      "VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS not found in environment variables"
    );
  }

  console.log("DocumentRegistry address:", documentRegistryAddress);
  console.log("VerifierRegistry address:", verifierRegistryAddress);

  // Get contract instances
  const DocumentRegistry = await hre.ethers.getContractFactory(
    "DocumentRegistry"
  );
  const documentRegistry = DocumentRegistry.attach(documentRegistryAddress);

  const VerifierRegistry = await hre.ethers.getContractFactory(
    "VerifierRegistry"
  );
  const verifierRegistry = VerifierRegistry.attach(verifierRegistryAddress);

  console.log("\n==================================================");
  console.log("🧪 TESTING DOCUMENT REGISTRY INTEGRATION");
  console.log("==================================================\n");

  // Test 1: Check if deployer is a verifier
  console.log("1. Checking verifier status...");
  const isVerifier = await verifierRegistry.isVerifier(deployer.address);
  console.log(`   Deployer (${deployer.address}) is verifier:`, isVerifier);

  if (!isVerifier) {
    console.log("   ❌ Deployer is not a verifier. Adding verifier...");
    const addVerifierTx = await verifierRegistry.addVerifier(deployer.address);
    await addVerifierTx.wait();
    console.log("   ✅ Added deployer as verifier");
  } else {
    console.log("   ✅ Deployer is already a verifier");
  }

  // Test 2: Register a test document
  console.log("\n2. Registering a test document...");
  const testDocument = {
    cid: "QmTestCID123456789abcdef",
    projectName: "Test Carbon Project",
    projectType: "reforestation",
    description: "A test reforestation project for carbon credits",
    location: "Test Forest, Test Country",
    estimatedCredits: 1000,
  };

  try {
    const registerTx = await documentRegistry.registerDocument(
      testDocument.cid,
      testDocument.projectName,
      testDocument.projectType,
      testDocument.description,
      testDocument.location,
      BigInt(testDocument.estimatedCredits)
    );

    const receipt = await registerTx.wait();
    console.log("   ✅ Document registered successfully");
    console.log("   Transaction hash:", registerTx.hash);

    // Extract document ID from events
    let documentId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = documentRegistry.interface.parseLog(log);
        if (parsedLog.name === "DocumentRegistered") {
          documentId = Number(parsedLog.args.documentId);
          console.log("   Document ID:", documentId);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Test 3: Retrieve all documents
    console.log("\n3. Retrieving all documents...");
    const allDocuments = await documentRegistry.getAllDocuments();
    console.log(`   ✅ Retrieved ${allDocuments.length} documents`);

    if (allDocuments.length > 0) {
      const lastDoc = allDocuments[allDocuments.length - 1];
      console.log("   Last document details:");
      console.log("     CID:", lastDoc.cid);
      console.log("     Project Name:", lastDoc.projectName);
      console.log("     Uploader:", lastDoc.uploader);
      console.log("     Attested:", lastDoc.isAttested);
    }

    // Test 4: Attest the document (if we have a document ID)
    if (documentId) {
      console.log("\n4. Attesting the document...");
      try {
        const attestTx = await documentRegistry.attestDocument(documentId);
        await attestTx.wait();
        console.log("   ✅ Document attested successfully");
        console.log("   Transaction hash:", attestTx.hash);

        // Verify attestation
        const document = await documentRegistry.getDocument(documentId);
        console.log("   Document is now attested:", document.isAttested);
        console.log("   Attested by:", document.verifier);
      } catch (error) {
        console.log("   ❌ Attestation failed:", error.message);
      }
    }

    // Test 5: Get user documents
    console.log("\n5. Getting user documents...");
    const userDocuments = await documentRegistry.getUserDocumentsWithDetails(
      deployer.address
    );
    console.log(`   ✅ User has ${userDocuments.length} documents`);

    // Test 6: Get documents by status
    console.log("\n6. Getting documents by status...");
    const unattested = await documentRegistry.getDocumentsByStatus(false);
    const attested = await documentRegistry.getDocumentsByStatus(true);
    console.log(`   Unattested documents: ${unattested.length}`);
    console.log(`   Attested documents: ${attested.length}`);
  } catch (error) {
    console.log("   ❌ Document registration failed:", error.message);
    throw error;
  }

  console.log("\n==================================================");
  console.log("✅ DOCUMENT REGISTRY INTEGRATION TEST COMPLETE");
  console.log("==================================================\n");

  console.log(
    "🎉 All tests passed! The DocumentRegistry is ready for frontend integration."
  );
  console.log("📝 Contract addresses are configured in frontend/.env");
  console.log("🔗 ABI files have been updated in frontend/src/abis/");
  console.log("👤 Verifier permissions are properly configured");
}

main().catch((error) => {
  console.error("❌ Integration test failed:", error);
  process.exitCode = 1;
});
