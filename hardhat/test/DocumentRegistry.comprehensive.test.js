const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("DocumentRegistry Comprehensive Tests", function () {
  // Fixture for deploying contracts
  async function deployDocumentRegistryFixture() {
    const [deployer, verifier1, verifier2, user1, user2, user3, nonVerifier] =
      await ethers.getSigners();

    // Deploy VerifierRegistry
    const VerifierRegistry = await ethers.getContractFactory(
      "VerifierRegistry"
    );
    const verifierRegistry = await VerifierRegistry.deploy(deployer.address);
    await verifierRegistry.waitForDeployment();

    // Add verifiers to registry
    await verifierRegistry.addVerifier(verifier1.address);
    await verifierRegistry.addVerifier(verifier2.address);

    // Deploy DocumentRegistry
    const DocumentRegistry = await ethers.getContractFactory(
      "DocumentRegistry"
    );
    const documentRegistry = await DocumentRegistry.deploy(
      await verifierRegistry.getAddress()
    );
    await documentRegistry.waitForDeployment();

    return {
      documentRegistry,
      verifierRegistry,
      deployer,
      verifier1,
      verifier2,
      user1,
      user2,
      user3,
      nonVerifier,
    };
  }

  // Sample document data
  const sampleDocuments = [
    {
      cid: "QmReforestation123",
      projectName: "Amazon Reforestation Project",
      projectType: "reforestation",
      description: "Large-scale reforestation in the Amazon rainforest",
      location: "Amazon Basin, Brazil",
      estimatedCredits: 1000,
    },
    {
      cid: "QmSolarFarm456",
      projectName: "Solar Farm Initiative",
      projectType: "renewable-energy",
      description: "100MW solar farm in California",
      location: "Mojave Desert, California",
      estimatedCredits: 2000,
    },
    {
      cid: "QmWindPower789",
      projectName: "Offshore Wind Project",
      projectType: "renewable-energy",
      description: "Offshore wind turbines generating clean energy",
      location: "North Sea, UK",
      estimatedCredits: 1500,
    },
  ];

  describe("Role-Based Access Control", function () {
    it("Should allow only verifiers to attest documents", async function () {
      const { documentRegistry, user1, verifier1, nonVerifier } =
        await loadFixture(deployDocumentRegistryFixture);

      // Register a document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // Verifier should be able to attest
      await expect(documentRegistry.connect(verifier1).attestDocument(1))
        .to.emit(documentRegistry, "DocumentAttested")
        .withArgs(1, verifier1.address, await getBlockTimestamp());

      // Non-verifier should not be able to attest
      await expect(
        documentRegistry.connect(nonVerifier).attestDocument(1)
      ).to.be.revertedWithCustomError(documentRegistry, "NotVerifier");
    });

    it("Should prevent multiple attestations by different verifiers", async function () {
      const { documentRegistry, user1, verifier1, verifier2 } =
        await loadFixture(deployDocumentRegistryFixture);

      // Register a document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // First verifier attests
      await documentRegistry.connect(verifier1).attestDocument(1);

      // Second verifier should not be able to attest the same document
      await expect(
        documentRegistry.connect(verifier2).attestDocument(1)
      ).to.be.revertedWithCustomError(
        documentRegistry,
        "DocumentAlreadyAttested"
      );
    });

    it("Should track which verifier attested each document", async function () {
      const { documentRegistry, user1, verifier1, verifier2 } =
        await loadFixture(deployDocumentRegistryFixture);

      // Register two documents
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[1].cid,
          sampleDocuments[1].projectName,
          sampleDocuments[1].projectType,
          sampleDocuments[1].description,
          sampleDocuments[1].location,
          sampleDocuments[1].estimatedCredits
        );

      // Different verifiers attest different documents
      await documentRegistry.connect(verifier1).attestDocument(1);
      await documentRegistry.connect(verifier2).attestDocument(2);

      // Check attestation details
      const doc1 = await documentRegistry.getDocument(1);
      const doc2 = await documentRegistry.getDocument(2);

      expect(doc1.verifier).to.equal(verifier1.address);
      expect(doc2.verifier).to.equal(verifier2.address);
      expect(doc1.isAttested).to.be.true;
      expect(doc2.isAttested).to.be.true;
    });
  });

  describe("Document Lifecycle Management", function () {
    it("Should handle complete document lifecycle", async function () {
      const { documentRegistry, user1, verifier1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Step 1: Register document
      const tx1 = await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      await expect(tx1)
        .to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(
          1,
          user1.address,
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName
        );

      // Verify initial state
      let doc = await documentRegistry.getDocument(1);
      expect(doc.uploader).to.equal(user1.address);
      expect(doc.isAttested).to.be.false;
      expect(doc.verifier).to.equal(ethers.ZeroAddress);

      // Step 2: Attest document
      const tx2 = await documentRegistry.connect(verifier1).attestDocument(1);
      const attestationTimestamp = await getBlockTimestamp(tx2);

      await expect(tx2)
        .to.emit(documentRegistry, "DocumentAttested")
        .withArgs(1, verifier1.address, attestationTimestamp);

      // Verify attested state
      doc = await documentRegistry.getDocument(1);
      expect(doc.isAttested).to.be.true;
      expect(doc.verifier).to.equal(verifier1.address);
      expect(doc.attestedAt).to.equal(attestationTimestamp);
    });

    it("Should maintain document integrity throughout lifecycle", async function () {
      const { documentRegistry, user1, verifier1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Register document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // Get initial document state
      const initialDoc = await documentRegistry.getDocument(1);

      // Attest document
      await documentRegistry.connect(verifier1).attestDocument(1);

      // Get final document state
      const finalDoc = await documentRegistry.getDocument(1);

      // Verify that core document data remains unchanged
      expect(finalDoc.cid).to.equal(initialDoc.cid);
      expect(finalDoc.uploader).to.equal(initialDoc.uploader);
      expect(finalDoc.projectName).to.equal(initialDoc.projectName);
      expect(finalDoc.projectType).to.equal(initialDoc.projectType);
      expect(finalDoc.description).to.equal(initialDoc.description);
      expect(finalDoc.location).to.equal(initialDoc.location);
      expect(finalDoc.estimatedCredits).to.equal(initialDoc.estimatedCredits);
      expect(finalDoc.timestamp).to.equal(initialDoc.timestamp);

      // Only attestation fields should change
      expect(finalDoc.isAttested).to.not.equal(initialDoc.isAttested);
      expect(finalDoc.verifier).to.not.equal(initialDoc.verifier);
      expect(finalDoc.attestedAt).to.not.equal(initialDoc.attestedAt);
    });
  });

  describe("Bulk Operations and Scalability", function () {
    it("Should handle multiple document registrations efficiently", async function () {
      const { documentRegistry, user1, user2, user3 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      const users = [user1, user2, user3];
      const registrationPromises = [];

      // Register multiple documents concurrently
      for (let i = 0; i < sampleDocuments.length; i++) {
        const user = users[i % users.length];
        const doc = sampleDocuments[i];

        registrationPromises.push(
          documentRegistry
            .connect(user)
            .registerDocument(
              doc.cid,
              doc.projectName,
              doc.projectType,
              doc.description,
              doc.location,
              doc.estimatedCredits
            )
        );
      }

      await Promise.all(registrationPromises);

      // Verify all documents were registered
      expect(await documentRegistry.getTotalDocuments()).to.equal(
        sampleDocuments.length
      );
      expect(await documentRegistry.nextDocumentId()).to.equal(
        sampleDocuments.length + 1
      );

      // Verify document details
      for (let i = 1; i <= sampleDocuments.length; i++) {
        const doc = await documentRegistry.getDocument(i);
        const expectedDoc = sampleDocuments[i - 1];
        expect(doc.cid).to.equal(expectedDoc.cid);
        expect(doc.projectName).to.equal(expectedDoc.projectName);
      }
    });

    it("Should handle bulk attestations by multiple verifiers", async function () {
      const { documentRegistry, user1, verifier1, verifier2 } =
        await loadFixture(deployDocumentRegistryFixture);

      // Register multiple documents
      for (const doc of sampleDocuments) {
        await documentRegistry
          .connect(user1)
          .registerDocument(
            doc.cid,
            doc.projectName,
            doc.projectType,
            doc.description,
            doc.location,
            doc.estimatedCredits
          );
      }

      // Attest documents with different verifiers
      await documentRegistry.connect(verifier1).attestDocument(1);
      await documentRegistry.connect(verifier2).attestDocument(2);
      await documentRegistry.connect(verifier1).attestDocument(3);

      // Verify attestations
      const attestedDocs = await documentRegistry.getDocumentsByStatus(true);
      expect(attestedDocs).to.have.lengthOf(3);

      expect(attestedDocs[0].verifier).to.equal(verifier1.address);
      expect(attestedDocs[1].verifier).to.equal(verifier2.address);
      expect(attestedDocs[2].verifier).to.equal(verifier1.address);
    });

    it("Should maintain performance with large document counts", async function () {
      const { documentRegistry, user1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      const documentCount = 100;
      const batchSize = 10;

      // Register documents in batches
      for (let batch = 0; batch < documentCount / batchSize; batch++) {
        const batchPromises = [];

        for (let i = 0; i < batchSize; i++) {
          const docIndex = batch * batchSize + i;
          batchPromises.push(
            documentRegistry
              .connect(user1)
              .registerDocument(
                `QmTestCID${docIndex}`,
                `Project ${docIndex}`,
                "reforestation",
                `Description ${docIndex}`,
                `Location ${docIndex}`,
                100 + docIndex
              )
          );
        }

        await Promise.all(batchPromises);
      }

      // Verify total count
      expect(await documentRegistry.getTotalDocuments()).to.equal(
        documentCount
      );

      // Test querying performance
      const startTime = Date.now();
      const allDocs = await documentRegistry.getAllDocuments();
      const endTime = Date.now();

      expect(allDocs).to.have.lengthOf(documentCount);
      expect(endTime - startTime).to.be.lessThan(5000); // Should complete within 5 seconds
    });
  });

  describe("Data Integrity and Validation", function () {
    it("Should validate document data on registration", async function () {
      const { documentRegistry, user1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Test empty CID
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            "",
            sampleDocuments[0].projectName,
            sampleDocuments[0].projectType,
            sampleDocuments[0].description,
            sampleDocuments[0].location,
            sampleDocuments[0].estimatedCredits
          )
      ).to.be.revertedWithCustomError(documentRegistry, "EmptyCID");

      // Test empty project name
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            sampleDocuments[0].cid,
            "",
            sampleDocuments[0].projectType,
            sampleDocuments[0].description,
            sampleDocuments[0].location,
            sampleDocuments[0].estimatedCredits
          )
      ).to.be.revertedWithCustomError(documentRegistry, "EmptyProjectName");
    });

    it("Should handle edge cases in document data", async function () {
      const { documentRegistry, user1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Test with maximum values
      const maxUint256 = ethers.MaxUint256;
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            sampleDocuments[0].cid,
            sampleDocuments[0].projectName,
            sampleDocuments[0].projectType,
            sampleDocuments[0].description,
            sampleDocuments[0].location,
            maxUint256
          )
      ).to.not.be.reverted;

      // Test with very long strings
      const longString = "A".repeat(1000);
      await expect(
        documentRegistry
          .connect(user1)
          .registerDocument(
            sampleDocuments[0].cid,
            longString,
            sampleDocuments[0].projectType,
            longString,
            longString,
            1000
          )
      ).to.not.be.reverted;
    });

    it("Should prevent duplicate CID registration", async function () {
      const { documentRegistry, user1, user2 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Register first document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // Attempt to register document with same CID
      await expect(
        documentRegistry.connect(user2).registerDocument(
          sampleDocuments[0].cid, // Same CID
          "Different Project Name",
          "different-type",
          "Different description",
          "Different location",
          500
        )
      ).to.be.revertedWithCustomError(documentRegistry, "DuplicateCID");
    });
  });

  describe("Query Optimization and Filtering", function () {
    beforeEach(async function () {
      const { documentRegistry, user1, user2, verifier1 } = await loadFixture(
        deployDocumentRegistryFixture
      );
      this.documentRegistry = documentRegistry;
      this.user1 = user1;
      this.user2 = user2;
      this.verifier1 = verifier1;

      // Register test documents
      for (let i = 0; i < sampleDocuments.length; i++) {
        const user = i % 2 === 0 ? user1 : user2;
        await documentRegistry
          .connect(user)
          .registerDocument(
            sampleDocuments[i].cid,
            sampleDocuments[i].projectName,
            sampleDocuments[i].projectType,
            sampleDocuments[i].description,
            sampleDocuments[i].location,
            sampleDocuments[i].estimatedCredits
          );
      }

      // Attest some documents
      await documentRegistry.connect(verifier1).attestDocument(1);
      await documentRegistry.connect(verifier1).attestDocument(3);
    });

    it("Should filter documents by attestation status efficiently", async function () {
      const attestedDocs = await this.documentRegistry.getDocumentsByStatus(
        true
      );
      const unattestedDocs = await this.documentRegistry.getDocumentsByStatus(
        false
      );

      expect(attestedDocs).to.have.lengthOf(2);
      expect(unattestedDocs).to.have.lengthOf(1);

      expect(attestedDocs[0].isAttested).to.be.true;
      expect(attestedDocs[1].isAttested).to.be.true;
      expect(unattestedDocs[0].isAttested).to.be.false;
    });

    it("Should retrieve user documents efficiently", async function () {
      const user1Docs = await this.documentRegistry.getUserDocuments(
        this.user1.address
      );
      const user2Docs = await this.documentRegistry.getUserDocuments(
        this.user2.address
      );

      expect(user1Docs).to.have.lengthOf(2); // Documents 1 and 3
      expect(user2Docs).to.have.lengthOf(1); // Document 2

      expect(user1Docs[0]).to.equal(1);
      expect(user1Docs[1]).to.equal(3);
      expect(user2Docs[0]).to.equal(2);
    });

    it("Should retrieve user documents with details efficiently", async function () {
      const user1DocsWithDetails =
        await this.documentRegistry.getUserDocumentsWithDetails(
          this.user1.address
        );

      expect(user1DocsWithDetails).to.have.lengthOf(2);
      expect(user1DocsWithDetails[0].projectName).to.equal(
        sampleDocuments[0].projectName
      );
      expect(user1DocsWithDetails[1].projectName).to.equal(
        sampleDocuments[2].projectName
      );
    });
  });

  describe("Gas Optimization", function () {
    it("Should optimize gas usage for document registration", async function () {
      const { documentRegistry, user1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      const tx = await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      const receipt = await tx.wait();

      // Gas usage should be reasonable (adjust based on actual measurements)
      expect(receipt.gasUsed).to.be.lessThan(200000);
    });

    it("Should optimize gas usage for document attestation", async function () {
      const { documentRegistry, user1, verifier1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Register document first
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      const tx = await documentRegistry.connect(verifier1).attestDocument(1);
      const receipt = await tx.wait();

      // Attestation should be gas-efficient
      expect(receipt.gasUsed).to.be.lessThan(100000);
    });

    it("Should optimize gas usage for batch queries", async function () {
      const { documentRegistry, user1 } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Register multiple documents
      for (let i = 0; i < 10; i++) {
        await documentRegistry
          .connect(user1)
          .registerDocument(
            `QmTestCID${i}`,
            `Project ${i}`,
            "reforestation",
            `Description ${i}`,
            `Location ${i}`,
            100 + i
          );
      }

      // Query all documents - should be gas efficient
      const gasEstimate = await documentRegistry.getAllDocuments.estimateGas();
      expect(gasEstimate).to.be.lessThan(500000);
    });
  });

  describe("Security and Access Control", function () {
    it("Should prevent unauthorized access to sensitive functions", async function () {
      const { documentRegistry, user1, nonVerifier } = await loadFixture(
        deployDocumentRegistryFixture
      );

      // Register a document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // Non-verifier should not be able to attest
      await expect(
        documentRegistry.connect(nonVerifier).attestDocument(1)
      ).to.be.revertedWithCustomError(documentRegistry, "NotVerifier");
    });

    it("Should handle verifier registry updates correctly", async function () {
      const {
        documentRegistry,
        verifierRegistry,
        user1,
        nonVerifier,
        deployer,
      } = await loadFixture(deployDocumentRegistryFixture);

      // Register a document
      await documentRegistry
        .connect(user1)
        .registerDocument(
          sampleDocuments[0].cid,
          sampleDocuments[0].projectName,
          sampleDocuments[0].projectType,
          sampleDocuments[0].description,
          sampleDocuments[0].location,
          sampleDocuments[0].estimatedCredits
        );

      // Initially, nonVerifier cannot attest
      await expect(
        documentRegistry.connect(nonVerifier).attestDocument(1)
      ).to.be.revertedWithCustomError(documentRegistry, "NotVerifier");

      // Add nonVerifier to verifier registry
      await verifierRegistry.connect(deployer).addVerifier(nonVerifier.address);

      // Now nonVerifier should be able to attest
      await expect(
        documentRegistry.connect(nonVerifier).attestDocument(1)
      ).to.emit(documentRegistry, "DocumentAttested");
    });
  });

  // Helper function to get block timestamp
  async function getBlockTimestamp(tx) {
    if (tx) {
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      return block.timestamp;
    }
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }
});
