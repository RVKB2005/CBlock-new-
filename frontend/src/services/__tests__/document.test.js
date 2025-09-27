import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import documentService, { DOCUMENT_STATUS } from "../document.js";
import ipfsService from "../ipfs.js";
import blockchainService from "../blockchain.js";
import authService from "../auth.js";

// Mock the services
vi.mock("../ipfs.js");
vi.mock("../blockchain.js");
vi.mock("../auth.js");

describe("DocumentService", () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset document service
    documentService.documents.clear();

    // Reset mocks
    vi.clearAllMocks();

    // Setup default auth mock
    authService.getCurrentUser.mockReturnValue({
      id: "user1",
      name: "John Doe",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      accountType: "individual",
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    authService.hasPermission.mockReturnValue(true);
    authService.isVerifier.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("File Validation", () => {
    it("should validate file types correctly", () => {
      const validFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      expect(() => documentService.validateFile(validFile)).not.toThrow();

      const invalidFile = new File(["content"], "test.exe", {
        type: "application/x-executable",
      });
      expect(() => documentService.validateFile(invalidFile)).toThrow(
        "Invalid file type"
      );
    });

    it("should validate file size correctly", () => {
      const validFile = new File(["content"], "test.pdf", {
        type: "application/pdf",
      });
      expect(() => documentService.validateFile(validFile)).not.toThrow();

      // Create a file that's too large (mock the size property)
      const largeFile = new File(["content"], "large.pdf", {
        type: "application/pdf",
      });
      Object.defineProperty(largeFile, "size", { value: 11 * 1024 * 1024 }); // 11MB

      expect(() => documentService.validateFile(largeFile)).toThrow(
        "File too large"
      );
    });

    it("should require a valid file name", () => {
      const fileWithoutName = new File(["content"], "", {
        type: "application/pdf",
      });
      expect(() => documentService.validateFile(fileWithoutName)).toThrow(
        "File must have a valid name"
      );
    });

    it("should throw error for null file", () => {
      expect(() => documentService.validateFile(null)).toThrow(
        "No file provided"
      );
    });
  });

  describe("Metadata Validation", () => {
    it("should validate required metadata fields", () => {
      const validMetadata = {
        projectName: "Test Project",
        projectType: "Reforestation",
        description: "A test project",
        location: "Test Location",
        estimatedCredits: 100,
      };

      expect(() =>
        documentService.validateMetadata(validMetadata)
      ).not.toThrow();
    });

    it("should require project name", () => {
      const invalidMetadata = {
        projectType: "Reforestation",
      };

      expect(() => documentService.validateMetadata(invalidMetadata)).toThrow(
        "Project name is required"
      );
    });

    it("should validate field lengths", () => {
      const longProjectName = "a".repeat(101);
      const invalidMetadata = {
        projectName: longProjectName,
      };

      expect(() => documentService.validateMetadata(invalidMetadata)).toThrow(
        "Project name must be 100 characters or less"
      );
    });

    it("should validate estimated credits range", () => {
      const invalidMetadata = {
        projectName: "Test Project",
        estimatedCredits: -1,
      };

      expect(() => documentService.validateMetadata(invalidMetadata)).toThrow(
        "Estimated credits must be a number between 0 and 1,000,000"
      );
    });
  });

  describe("Document Upload", () => {
    const mockFile = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    const mockMetadata = {
      projectName: "Test Project",
      projectType: "Reforestation",
      description: "A test project",
      location: "Test Location",
      estimatedCredits: 100,
    };

    beforeEach(() => {
      // Mock IPFS service
      ipfsService.uploadFile.mockResolvedValue({
        cid: "QmTestCID123",
        url: "https://w3s.link/ipfs/QmTestCID123",
        name: "test.pdf",
        size: 1024,
        type: "application/pdf",
      });

      // Mock blockchain service
      blockchainService.registerDocument.mockResolvedValue({
        hash: "0xTransactionHash123",
        documentId: 1,
        transaction: { hash: "0xTransactionHash123" },
      });
    });

    it("should upload document successfully with blockchain registration", async () => {
      const result = await documentService.uploadDocument(
        mockFile,
        mockMetadata
      );

      expect(result.success).toBe(true);
      expect(result.documentId).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.status).toBe(DOCUMENT_STATUS.PENDING);
      expect(result.document.blockchainRegistered).toBe(true);

      // Verify IPFS upload was called
      expect(ipfsService.uploadFile).toHaveBeenCalledWith(mockFile);

      // Verify blockchain registration was called
      expect(blockchainService.registerDocument).toHaveBeenCalledWith({
        cid: "QmTestCID123",
        projectName: "Test Project",
        projectType: "Reforestation",
        description: "A test project",
        location: "Test Location",
        estimatedCredits: 100,
      });
    });

    it("should handle blockchain registration failure gracefully", async () => {
      blockchainService.registerDocument.mockRejectedValue(
        new Error("Blockchain error")
      );

      const result = await documentService.uploadDocument(
        mockFile,
        mockMetadata
      );

      expect(result.success).toBe(true);
      expect(result.document.blockchainRegistered).toBe(false);
      expect(result.documentId).toMatch(/^local_/);
      expect(result.message).toContain("blockchain registration pending");
    });

    it("should require user authentication", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      await expect(
        documentService.uploadDocument(mockFile, mockMetadata)
      ).rejects.toThrow("User must be authenticated");
    });

    it("should check user permissions", async () => {
      authService.hasPermission.mockReturnValue(false);

      await expect(
        documentService.uploadDocument(mockFile, mockMetadata)
      ).rejects.toThrow("You do not have permission to upload documents");
    });

    it("should handle IPFS upload failure", async () => {
      ipfsService.uploadFile.mockRejectedValue(new Error("IPFS error"));

      await expect(
        documentService.uploadDocument(mockFile, mockMetadata)
      ).rejects.toThrow("Upload failed");
    });
  });

  describe("Get Documents for Verifier", () => {
    beforeEach(() => {
      authService.isVerifier.mockReturnValue(true);

      // Mock blockchain service
      blockchainService.getAllDocuments.mockResolvedValue([
        {
          id: 1,
          cid: "QmTestCID1",
          uploader: "0x1234567890123456789012345678901234567890",
          projectName: "Project 1",
          projectType: "Reforestation",
          description: "Description 1",
          location: "Location 1",
          estimatedCredits: 100,
          timestamp: Math.floor(Date.now() / 1000),
          isAttested: false,
          verifier: "0x0000000000000000000000000000000000000000",
          attestedAt: 0,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should fetch documents for verifier successfully", async () => {
      const documents = await documentService.getDocumentsForVerifier();

      expect(documents).toHaveLength(1);
      expect(documents[0].projectName).toBe("Project 1");
      expect(documents[0].status).toBe(DOCUMENT_STATUS.PENDING);
      expect(blockchainService.getAllDocuments).toHaveBeenCalled();
    });

    it("should require verifier role", async () => {
      authService.isVerifier.mockReturnValue(false);

      await expect(documentService.getDocumentsForVerifier()).rejects.toThrow(
        "Only verifiers can access all documents"
      );
    });

    it("should handle blockchain fetch failure gracefully", async () => {
      blockchainService.getAllDocuments.mockRejectedValue(
        new Error("Blockchain error")
      );

      // Clear any existing documents first
      documentService.documents.clear();

      // Add a local document to test fallback
      const localDoc = {
        id: "local_1",
        cid: "QmLocalCID",
        projectName: "Local Project",
        status: DOCUMENT_STATUS.PENDING,
        blockchainRegistered: false,
        createdAt: new Date().toISOString(),
      };
      documentService.documents.set("local_1", localDoc);

      const documents = await documentService.getDocumentsForVerifier();

      expect(documents.length).toBeGreaterThanOrEqual(1);
      const localProject = documents.find(
        (doc) => doc.projectName === "Local Project"
      );
      expect(localProject).toBeDefined();
      expect(localProject.source).toBe("local");
    });

    it("should apply status filter", async () => {
      const documents = await documentService.getDocumentsForVerifier({
        status: DOCUMENT_STATUS.ATTESTED,
      });

      expect(documents).toHaveLength(0); // No attested documents in mock data
    });

    it("should apply search filter", async () => {
      const documents = await documentService.getDocumentsForVerifier({
        search: "Project 1",
      });

      expect(documents).toHaveLength(1);
      expect(documents[0].projectName).toBe("Project 1");
    });
  });

  describe("Get User Documents", () => {
    beforeEach(() => {
      // Mock blockchain service for user documents
      blockchainService.getUserDocuments.mockResolvedValue([
        {
          cid: "QmUserCID1",
          uploader: "0x1234567890123456789012345678901234567890",
          projectName: "User Project 1",
          projectType: "Solar",
          description: "User description",
          location: "User location",
          estimatedCredits: 50,
          timestamp: Math.floor(Date.now() / 1000),
          isAttested: false,
          verifier: "0x0000000000000000000000000000000000000000",
          attestedAt: 0,
          uploadedAt: new Date().toISOString(),
        },
      ]);
    });

    it("should fetch user documents successfully", async () => {
      const documents = await documentService.getUserDocuments();

      expect(documents).toHaveLength(1);
      expect(documents[0].projectName).toBe("User Project 1");
      expect(blockchainService.getUserDocuments).toHaveBeenCalledWith(
        "0x1234567890123456789012345678901234567890"
      );
    });

    it("should require user authentication", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      await expect(documentService.getUserDocuments()).rejects.toThrow(
        "User must be authenticated"
      );
    });

    it("should handle blockchain fetch failure", async () => {
      blockchainService.getUserDocuments.mockRejectedValue(
        new Error("Blockchain error")
      );

      // Should still return empty array without throwing
      const documents = await documentService.getUserDocuments();
      expect(documents).toHaveLength(0);
    });
  });

  describe("Document Status Updates", () => {
    beforeEach(() => {
      // Add a test document
      const testDoc = {
        id: "test_doc_1",
        cid: "QmTestCID",
        projectName: "Test Project",
        status: DOCUMENT_STATUS.PENDING,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      documentService.documents.set("test_doc_1", testDoc);
    });

    it("should update document status successfully", async () => {
      const updatedDoc = await documentService.updateDocumentStatus(
        "test_doc_1",
        DOCUMENT_STATUS.ATTESTED,
        { verifierAddress: "0xVerifier123" }
      );

      expect(updatedDoc.status).toBe(DOCUMENT_STATUS.ATTESTED);
      expect(updatedDoc.verifierAddress).toBe("0xVerifier123");
      expect(updatedDoc.updatedAt).toBeDefined();
    });

    it("should validate document ID", async () => {
      await expect(
        documentService.updateDocumentStatus("", DOCUMENT_STATUS.ATTESTED)
      ).rejects.toThrow("Document ID is required");
    });

    it("should validate status value", async () => {
      await expect(
        documentService.updateDocumentStatus("test_doc_1", "invalid_status")
      ).rejects.toThrow("Invalid document status");
    });

    it("should handle document not found", async () => {
      await expect(
        documentService.updateDocumentStatus(
          "nonexistent",
          DOCUMENT_STATUS.ATTESTED
        )
      ).rejects.toThrow("Document not found");
    });
  });

  describe("Document Statistics", () => {
    beforeEach(() => {
      // Add test documents with different statuses
      const docs = [
        {
          id: "1",
          status: DOCUMENT_STATUS.PENDING,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          status: DOCUMENT_STATUS.ATTESTED,
          createdAt: new Date().toISOString(),
        },
        {
          id: "3",
          status: DOCUMENT_STATUS.MINTED,
          createdAt: new Date().toISOString(),
        },
        {
          id: "4",
          status: DOCUMENT_STATUS.PENDING,
          createdAt: new Date().toISOString(),
        },
      ];

      docs.forEach((doc) => documentService.documents.set(doc.id, doc));

      // Mock getUserDocuments to return these docs
      vi.spyOn(documentService, "getUserDocuments").mockResolvedValue(docs);
    });

    it("should calculate document statistics correctly", async () => {
      const stats = await documentService.getDocumentStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(2);
      expect(stats.attested).toBe(1);
      expect(stats.minted).toBe(1);
      expect(stats.rejected).toBe(0);
    });

    it("should return zero stats for unauthenticated user", async () => {
      authService.getCurrentUser.mockReturnValue(null);

      const stats = await documentService.getDocumentStats();

      expect(stats.total).toBe(0);
      expect(stats.pending).toBe(0);
      expect(stats.attested).toBe(0);
      expect(stats.minted).toBe(0);
      expect(stats.rejected).toBe(0);
    });
  });

  describe("Utility Methods", () => {
    it("should return allowed file types", () => {
      const allowedTypes = documentService.getAllowedFileTypes();
      expect(allowedTypes).toContain("application/pdf");
      expect(allowedTypes).toContain("image/jpeg");
    });

    it("should return max file size", () => {
      const maxSize = documentService.getMaxFileSize();
      expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it("should format file size correctly", () => {
      expect(documentService.formatFileSize(0)).toBe("0 Bytes");
      expect(documentService.formatFileSize(1024)).toBe("1 KB");
      expect(documentService.formatFileSize(1024 * 1024)).toBe("1 MB");
    });

    it("should check service status", () => {
      // Mock service statuses
      ipfsService.getUploadStatus.mockReturnValue({
        status: "ready",
        message: "Ready to upload files",
      });

      blockchainService.isConfigured.mockReturnValue(true);

      const status = documentService.getServiceStatus();

      expect(status.ipfs.status).toBe("ready");
      expect(status.blockchain.status).toBe("ready");
      expect(status.overall.status).toBe("ready");
    });
  });

  describe("Document Attestation", () => {
    beforeEach(() => {
      // Set up verifier user
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.isVerifier.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue({
        walletAddress: "0xverifier123",
        accountType: "verifier",
      });

      // Add a test document
      const testDoc = {
        id: "test_doc_1",
        cid: "QmTestCID123",
        status: DOCUMENT_STATUS.PENDING,
        uploadedBy: "0xuser123",
        blockchainRegistered: true,
        blockchainDocumentId: 1,
      };
      documentService.documents.set("test_doc_1", testDoc);
    });

    it("should attest document successfully", async () => {
      const attestationData = {
        signature: "0xsignature123",
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
        amount: 100,
      };

      blockchainService.attestDocument.mockResolvedValue({
        hash: "0xtxhash123",
      });

      const result = await documentService.attestDocument(
        "test_doc_1",
        attestationData
      );

      expect(result.success).toBe(true);
      expect(result.document.status).toBe(DOCUMENT_STATUS.ATTESTED);
      expect(result.document.attestation.verifierAddress).toBe("0xverifier123");
      expect(result.document.attestation.gsProjectId).toBe("GS12345");
      expect(result.document.attestation.gsSerial).toBe("GS12345-001-2024");
      expect(result.document.attestation.signature).toBe("0xsignature123");
      expect(blockchainService.attestDocument).toHaveBeenCalledWith(1);
    });

    it("should handle blockchain attestation failure gracefully", async () => {
      const attestationData = {
        signature: "0xsignature123",
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
        amount: 100,
      };

      blockchainService.attestDocument.mockRejectedValue(
        new Error("Blockchain error")
      );

      const result = await documentService.attestDocument(
        "test_doc_1",
        attestationData
      );

      expect(result.success).toBe(true);
      expect(result.document.status).toBe(DOCUMENT_STATUS.ATTESTED);
      expect(result.document.attestation.blockchainAttested).toBe(false);
      expect(result.message).toContain("locally");
    });

    it("should require verifier authentication", async () => {
      authService.isUserAuthenticated.mockReturnValue(false);

      await expect(
        documentService.attestDocument("test_doc_1", {})
      ).rejects.toThrow("Please log in to attest documents");
    });

    it("should require verifier role", async () => {
      authService.isVerifier.mockReturnValue(false);

      await expect(
        documentService.attestDocument("test_doc_1", {})
      ).rejects.toThrow("Only verifiers can attest documents");
    });

    it("should validate document ID", async () => {
      await expect(documentService.attestDocument("", {})).rejects.toThrow(
        "Document ID is required"
      );

      await expect(documentService.attestDocument(null, {})).rejects.toThrow(
        "Document ID is required"
      );
    });

    it("should validate attestation data", async () => {
      await expect(
        documentService.attestDocument("test_doc_1", null)
      ).rejects.toThrow("Attestation data is required");
    });

    it("should handle document not found", async () => {
      await expect(
        documentService.attestDocument("nonexistent", {})
      ).rejects.toThrow("Document not found");
    });

    it("should prevent double attestation", async () => {
      // Set document as already attested
      const attestedDoc = {
        id: "attested_doc",
        status: DOCUMENT_STATUS.ATTESTED,
      };
      documentService.documents.set("attested_doc", attestedDoc);

      await expect(
        documentService.attestDocument("attested_doc", {})
      ).rejects.toThrow("Document has already been attested");
    });

    it("should prevent attestation of minted documents", async () => {
      // Set document as already minted
      const mintedDoc = {
        id: "minted_doc",
        status: DOCUMENT_STATUS.MINTED,
      };
      documentService.documents.set("minted_doc", mintedDoc);

      await expect(
        documentService.attestDocument("minted_doc", {})
      ).rejects.toThrow("Document has already been minted");
    });

    it("should prevent attestation of rejected documents", async () => {
      // Set document as rejected
      const rejectedDoc = {
        id: "rejected_doc",
        status: DOCUMENT_STATUS.REJECTED,
      };
      documentService.documents.set("rejected_doc", rejectedDoc);

      await expect(
        documentService.attestDocument("rejected_doc", {})
      ).rejects.toThrow("Document has been rejected and cannot be attested");
    });

    it("should require verifier wallet address", async () => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "verifier",
        // No walletAddress
      });

      await expect(
        documentService.attestDocument("test_doc_1", {})
      ).rejects.toThrow("Verifier wallet address not found");
    });
  });

  describe("Storage Persistence", () => {
    it("should save and load documents from localStorage", () => {
      const testDoc = {
        id: "test_persistence",
        cid: "QmTestPersistence",
        projectName: "Persistence Test",
        status: DOCUMENT_STATUS.PENDING,
        createdAt: new Date().toISOString(),
      };

      documentService.documents.set("test_persistence", testDoc);
      documentService.saveToStorage();

      // Create new instance to test loading
      const newService = new documentService.constructor();

      expect(newService.documents.has("test_persistence")).toBe(true);
      expect(newService.documents.get("test_persistence").projectName).toBe(
        "Persistence Test"
      );
    });

    it("should handle localStorage errors gracefully", () => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("Storage error");
      });

      // Should not throw error
      expect(() => documentService.saveToStorage()).not.toThrow();

      // Restore original method
      localStorage.setItem = originalSetItem;
    });
  });
});
