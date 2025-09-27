const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let documentRegistry;
  let verifierRegistry;
  let deployer, verifier, user1, user2, nonVerifier;

  // Sample document data
  const sampleDoc = {
    cid: "QmSampleCID123",
    projectName: "Reforestation Project Alpha",
    projectType: "reforestation",
    description: "A large-scale reforestation project in the Amazon",
    location: "Amazon Rainforest, Brazil",
    estimatedCredits: 1000,
  };

  beforeEach(async function () {
    [deployer, verifier, user1, user2, nonVerifier] = await ethers.getSigners();

    // Deploy VerifierRegistry
    const VerifierRegistry = await ethers.getContractFactory(
      "VerifierRegistry"
    );
    verifierRegistry = await VerifierRegistry.deploy(deployer.address);
    await verifierRegistry.waitForDeployment();

    // Add verifier to registry
    await verifierRegistry.addVerifier(verifier.address);

    // Deploy DocumentRegistry
    const DocumentRegistry = await ethers.getContractFactory(
      "DocumentRegistry"
    );
    documentRegistry = await DocumentRegistry.deploy(
      await verifierRegistry.getAddress()
    );
    await documentRegistry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct verifier registry address", async function () {
      expect(await documentRegistry.verifierRegistry()).to.equal(
        await verifierRegistry.getAddress()
      );
    });

    it("Should initialize nextDocumentId to 1", async function () {
      expect(await documentRegistry.nextDocumentId()).to.equal(1);
    });

    it("Should have zero total documents initially", async function () {
      expect(await documentRegistry.getTotalDocuments()).to.equal(0);
    });
  });

  describe("Document Registration", function () {
    it("Should register a document successfully", async function () {
      const tx = await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          sampleDoc.estimatedCredits
        );

      await expect(tx)
        .to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(1, user1.address, sampleDoc.cid, sampleDoc.projectName);

      // Check document details
      const doc = await documentRegistry.getDocument(1);
      expect(doc.cid).to.equal(sampleDoc.cid);
      expect(doc.uploader).to.equal(user1.address);
      expect(doc.projectName).to.equal(sampleDoc.projectName);
      expect(doc.projectType).to.equal(sampleDoc.projectType);
      expect(doc.description).to.equal(sampleDoc.description);
      expect(doc.location).to.equal(sampleDoc.location);
      expect(doc.estimatedCredits).to.equal(sampleDoc.estimatedCredits);
      expect(doc.isAttested).to.be.false;
      expect(doc.verifier).to.equal(ethers.ZeroAddress);
      expect(doc.attestedAt).to.equal(0);
    });

    it("Should increment document ID for each registration", async function () {
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          sampleDoc.estimatedCredits
        );

      await documentRegistry
        .connect(user2)
        .registerDocument(
          "QmAnotherCID456",
          "Solar Farm Project",
          "renewable-energy",
          "Solar energy generation project",
          "California, USA",
          500
        );

      expect(await documentRegistry.nextDocumentId()).to.equal(3);
      expect(await documentRegistry.getTotalDocuments()).to.equal(2);
    });

    it("Should add document to user's document list", async function () {
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          sampleDoc.estimatedCredits
        );

      const userDocs = await documentRegistry.getUserDocuments(user1.address);
      expect(userDocs).to.have.lengthOf(1);
      expect(userDocs[0]).to.equal(1);
    });

    it("Should revert with empty CID", async function () {
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            "",
            sampleDoc.projectName,
            sampleDoc.projectType,
            sampleDoc.description,
            sampleDoc.location,
            sampleDoc.estimatedCredits
          )
      ).to.be.revertedWithCustomError(documentRegistry, "EmptyCID");
    });

    it("Should revert with empty project name", async function () {
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            sampleDoc.cid,
            "",
            sampleDoc.projectType,
            sampleDoc.description,
            sampleDoc.location,
            sampleDoc.estimatedCredits
          )
      ).to.be.revertedWithCustomError(documentRegistry, "EmptyProjectName");
    });
  });

  describe("Document Attestation", function () {
    beforeEach(async function () {
      // Register a document first
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          sampleDoc.estimatedCredits
        );
    });

    it("Should allow verifier to attest document", async function () {
      const tx = await documentRegistry.connect(verifier).attestDocument(1);

      await expect(tx)
        .to.emit(documentRegistry, "DocumentAttested")
        .withArgs(1, verifier.address, await getBlockTimestamp(tx));

      const doc = await documentRegistry.getDocument(1);
      expect(doc.isAttested).to.be.true;
      expect(doc.verifier).to.equal(verifier.address);
      expect(doc.attestedAt).to.be.greaterThan(0);
    });

    it("Should revert when non-verifier tries to attest", async function () {
      await expect(
        documentRegistry.connect(nonVerifier).attestDocument(1)
      ).to.be.revertedWithCustomError(documentRegistry, "NotVerifier");
    });

    it("Should revert when attesting non-existent document", async function () {
      await expect(
        documentRegistry.connect(verifier).attestDocument(999)
      ).to.be.revertedWithCustomError(documentRegistry, "DocumentNotFound");
    });

    it("Should revert when attesting already attested document", async function () {
      await documentRegistry.connect(verifier).attestDocument(1);

      await expect(
        documentRegistry.connect(verifier).attestDocument(1)
      ).to.be.revertedWithCustomError(
        documentRegistry,
        "DocumentAlreadyAttested"
      );
    });
  });

  describe("Document Querying", function () {
    beforeEach(async function () {
      // Register multiple documents
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          sampleDoc.estimatedCredits
        );

      await documentRegistry
        .connect(user2)
        .registerDocument(
          "QmAnotherCID456",
          "Solar Farm Project",
          "renewable-energy",
          "Solar energy generation project",
          "California, USA",
          500
        );

      await documentRegistry
        .connect(user1)
        .registerDocument(
          "QmThirdCID789",
          "Wind Farm Project",
          "renewable-energy",
          "Wind energy generation project",
          "Texas, USA",
          750
        );

      // Attest one document
      await documentRegistry.connect(verifier).attestDocument(1);
    });

    it("Should return all documents", async function () {
      const allDocs = await documentRegistry.getAllDocuments();
      expect(allDocs).to.have.lengthOf(3);
      expect(allDocs[0].cid).to.equal(sampleDoc.cid);
      expect(allDocs[1].cid).to.equal("QmAnotherCID456");
      expect(allDocs[2].cid).to.equal("QmThirdCID789");
    });

    it("Should return user documents by ID", async function () {
      const user1Docs = await documentRegistry.getUserDocuments(user1.address);
      const user2Docs = await documentRegistry.getUserDocuments(user2.address);

      expect(user1Docs).to.have.lengthOf(2);
      expect(user1Docs[0]).to.equal(1);
      expect(user1Docs[1]).to.equal(3);

      expect(user2Docs).to.have.lengthOf(1);
      expect(user2Docs[0]).to.equal(2);
    });

    it("Should return user documents with details", async function () {
      const user1Docs = await documentRegistry.getUserDocumentsWithDetails(
        user1.address
      );
      expect(user1Docs).to.have.lengthOf(2);
      expect(user1Docs[0].cid).to.equal(sampleDoc.cid);
      expect(user1Docs[1].cid).to.equal("QmThirdCID789");
    });

    it("Should return documents by attestation status", async function () {
      const attestedDocs = await documentRegistry.getDocumentsByStatus(true);
      const unattestedDocs = await documentRegistry.getDocumentsByStatus(false);

      expect(attestedDocs).to.have.lengthOf(1);
      expect(attestedDocs[0].cid).to.equal(sampleDoc.cid);
      expect(attestedDocs[0].isAttested).to.be.true;

      expect(unattestedDocs).to.have.lengthOf(2);
      expect(unattestedDocs[0].isAttested).to.be.false;
      expect(unattestedDocs[1].isAttested).to.be.false;
    });

    it("Should return correct total documents count", async function () {
      expect(await documentRegistry.getTotalDocuments()).to.equal(3);
    });

    it("Should revert when getting non-existent document", async function () {
      await expect(
        documentRegistry.getDocument(999)
      ).to.be.revertedWithCustomError(documentRegistry, "DocumentNotFound");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty document lists correctly", async function () {
      const allDocs = await documentRegistry.getAllDocuments();
      const userDocs = await documentRegistry.getUserDocuments(user1.address);
      const attestedDocs = await documentRegistry.getDocumentsByStatus(true);

      expect(allDocs).to.have.lengthOf(0);
      expect(userDocs).to.have.lengthOf(0);
      expect(attestedDocs).to.have.lengthOf(0);
    });

    it("Should handle large estimated credits values", async function () {
      const largeCredits = ethers.parseEther("1000000"); // 1 million credits

      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          sampleDoc.projectName,
          sampleDoc.projectType,
          sampleDoc.description,
          sampleDoc.location,
          largeCredits
        );

      const doc = await documentRegistry.getDocument(1);
      expect(doc.estimatedCredits).to.equal(largeCredits);
    });

    it("Should handle long strings in document fields", async function () {
      const longString = "A".repeat(1000); // 1000 character string

      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDoc.cid,
          longString,
          sampleDoc.projectType,
          longString,
          longString,
          sampleDoc.estimatedCredits
        );

      const doc = await documentRegistry.getDocument(1);
      expect(doc.projectName).to.equal(longString);
      expect(doc.description).to.equal(longString);
      expect(doc.location).to.equal(longString);
    });
  });

  // Helper function to get block timestamp from transaction
  async function getBlockTimestamp(tx) {
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);
    return block.timestamp;
  }
});
