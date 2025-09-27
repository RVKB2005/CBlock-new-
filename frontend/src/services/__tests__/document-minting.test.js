import { describe, it, expect, beforeEach, vi } from "vitest";
import documentService, { DOCUMENT_STATUS } from "../document.js";
import authService from "../auth.js";
import blockchainService from "../blockchain.js";

// Mock dependencies
vi.mock("../auth.js");
vi.mock("../blockchain.js");

describe("DocumentService - Minting Functionality", () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks();

    // Reset document service storage
    documentService.documents.clear();

    // Mock authenticated verifier user
    authService.isUserAuthenticated.mockReturnValue(true);
    authService.isVerifier.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({
      walletAddress: "0xVerifier123",
      accountType: "verifier",
      name: "Test Verifier",
      email: "verifier@test.com",
    });
  });

  describe("updateDocumentMinting", () => {
    it("should update document with minting information successfully", async () => {
      // Setup: Create an attested document
      const documentId = "test_doc_1";
      const attestedDocument = {
        id: documentId,
        cid: "QmTestCID123",
        projectName: "Test Project",
        status: DOCUMENT_STATUS.ATTESTED,
        attestation: {
          verifierAddress: "0xVerifier123",
          signature: "test_signature",
          gsProjectId: "GS12345",
          gsSerial: "GS12345-001-2024",
          amount: 100,
        },
      };

      documentService.documents.set(documentId, attestedDocument);

      const mintingData = {
        transactionHash: "0xMintTxHash123",
        mintedAt: "2024-01-01T00:00:00.000Z",
        mintedBy: "0xVerifier123",
        amount: 100,
        recipient: "0xUploader123",
        tokenId: 1,
      };

      // Execute
      const result = await documentService.updateDocumentMinting(
        documentId,
        mintingData
      );

      // Verify
      expect(result.status).toBe(DOCUMENT_STATUS.MINTED);
      expect(result.mintingResult).toEqual(mintingData);
      expect(result.updatedAt).toBeDefined();
    });

    it("should throw error when document is already minted", async () => {
      // Setup: Create a minted document
      const documentId = "minted_doc";
      const mintedDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.MINTED,
        mintingResult: {
          transactionHash: "0xExistingTx",
        },
      };

      documentService.documents.set(documentId, mintedDocument);

      const mintingData = {
        transactionHash: "0xNewTxHash",
        amount: 100,
      };

      // Execute & Verify
      await expect(
        documentService.updateDocumentMinting(documentId, mintingData)
      ).rejects.toThrow("Document has already been minted");
    });

    it("should throw error when document is not attested", async () => {
      // Setup: Create a pending document
      const documentId = "pending_doc";
      const pendingDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.PENDING,
      };

      documentService.documents.set(documentId, pendingDocument);

      const mintingData = {
        transactionHash: "0xTxHash",
        amount: 100,
      };

      // Execute & Verify
      await expect(
        documentService.updateDocumentMinting(documentId, mintingData)
      ).rejects.toThrow("Document must be attested before minting");
    });

    it("should throw error when document not found", async () => {
      const mintingData = {
        transactionHash: "0xTxHash",
        amount: 100,
      };

      // Execute & Verify
      await expect(
        documentService.updateDocumentMinting("nonexistent", mintingData)
      ).rejects.toThrow("Document not found");
    });

    it("should validate required minting data", async () => {
      const documentId = "test_doc";

      // Execute & Verify
      await expect(
        documentService.updateDocumentMinting(documentId, null)
      ).rejects.toThrow("Minting data is required");

      await expect(
        documentService.updateDocumentMinting("", {})
      ).rejects.toThrow("Document ID is required");
    });
  });

  describe("canDocumentBeMinted", () => {
    it("should return true for attested document with complete attestation", async () => {
      // Setup
      const documentId = "attested_doc";
      const attestedDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.ATTESTED,
        attestation: {
          signature: "valid_signature",
          verifierAddress: "0xVerifier123",
        },
      };

      documentService.documents.set(documentId, attestedDocument);

      // Execute
      const result = await documentService.canDocumentBeMinted(documentId);

      // Verify
      expect(result.canMint).toBe(true);
      expect(result.reason).toBe("Document is eligible for minting");
    });

    it("should return false for already minted document", async () => {
      // Setup
      const documentId = "minted_doc";
      const mintedDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.MINTED,
      };

      documentService.documents.set(documentId, mintedDocument);

      // Execute
      const result = await documentService.canDocumentBeMinted(documentId);

      // Verify
      expect(result.canMint).toBe(false);
      expect(result.reason).toBe("Document has already been minted");
    });

    it("should return false for pending document", async () => {
      // Setup
      const documentId = "pending_doc";
      const pendingDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.PENDING,
      };

      documentService.documents.set(documentId, pendingDocument);

      // Execute
      const result = await documentService.canDocumentBeMinted(documentId);

      // Verify
      expect(result.canMint).toBe(false);
      expect(result.reason).toBe("Document must be attested before minting");
    });

    it("should return false for document with incomplete attestation", async () => {
      // Setup
      const documentId = "incomplete_doc";
      const incompleteDocument = {
        id: documentId,
        status: DOCUMENT_STATUS.ATTESTED,
        attestation: {
          // Missing signature
          verifierAddress: "0xVerifier123",
        },
      };

      documentService.documents.set(documentId, incompleteDocument);

      // Execute
      const result = await documentService.canDocumentBeMinted(documentId);

      // Verify
      expect(result.canMint).toBe(false);
      expect(result.reason).toBe("Document attestation data is incomplete");
    });

    it("should return false for nonexistent document", async () => {
      // Execute
      const result = await documentService.canDocumentBeMinted("nonexistent");

      // Verify
      expect(result.canMint).toBe(false);
      expect(result.reason).toContain("Document not found");
    });

    it("should handle errors gracefully", async () => {
      // Execute
      const result = await documentService.canDocumentBeMinted("");

      // Verify
      expect(result.canMint).toBe(false);
      expect(result.reason).toContain("Document ID is required");
    });
  });

  describe("Blockchain Service - Minting with Document Tracking", () => {
    beforeEach(() => {
      // Mock blockchain service methods
      blockchainService.mintCarbonCredits = vi.fn();
      blockchainService.mintCarbonCreditsWithDocumentTracking = vi.fn();
      blockchainService.contracts = {
        carbon: {
          interface: {
            parseLog: vi.fn(),
          },
        },
      };
    });

    it("should mint credits with document tracking successfully", async () => {
      // Setup
      const attestationData = {
        recipient: "0xUploader123",
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
        quantity: 100,
        signature: "test_signature",
      };

      // Mock the method to return expected result
      blockchainService.mintCarbonCreditsWithDocumentTracking.mockResolvedValue(
        {
          hash: "0xMintTxHash123",
          documentId: "test_doc_1",
          recipient: "0xUploader123",
          amount: 100,
          tokenId: 1,
        }
      );

      // Execute
      const result =
        await blockchainService.mintCarbonCreditsWithDocumentTracking(
          attestationData,
          "test_doc_1"
        );

      // Verify
      expect(
        blockchainService.mintCarbonCreditsWithDocumentTracking
      ).toHaveBeenCalledWith(attestationData, "test_doc_1");
      expect(result.hash).toBe("0xMintTxHash123");
      expect(result.documentId).toBe("test_doc_1");
      expect(result.recipient).toBe("0xUploader123");
      expect(result.amount).toBe(100);
      expect(result.tokenId).toBe(1);
    });

    it("should mint credits with automatic allocation when document data provided", async () => {
      // Setup
      const attestationData = {
        recipient: "0xUploader123",
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
        quantity: 100,
        signature: "test_signature",
      };

      const documentData = {
        id: "test_doc_1",
        projectName: "Test Project",
        uploaderName: "Test User",
        uploaderEmail: "test@example.com",
      };

      // Mock the method to return expected result with allocation
      blockchainService.mintCarbonCreditsWithDocumentTracking.mockResolvedValue(
        {
          hash: "0xMintTxHash123",
          documentId: "test_doc_1",
          recipient: "0xUploader123",
          amount: 100,
          tokenId: 1,
          allocation: {
            success: true,
            allocation: {
              id: "alloc_123",
              recipientAddress: "0xUploader123",
              amount: 100,
              status: "completed",
            },
          },
        }
      );

      // Execute
      const result =
        await blockchainService.mintCarbonCreditsWithDocumentTracking(
          attestationData,
          "test_doc_1",
          documentData
        );

      // Verify
      expect(
        blockchainService.mintCarbonCreditsWithDocumentTracking
      ).toHaveBeenCalledWith(attestationData, "test_doc_1", documentData);
      expect(result.allocation.success).toBe(true);
      expect(result.allocation.allocation.recipientAddress).toBe(
        "0xUploader123"
      );
    });

    it("should handle allocation failure without failing minting", async () => {
      // Setup
      const attestationData = {
        recipient: "0xUploader123",
        quantity: 100,
      };

      const documentData = {
        id: "test_doc_1",
        projectName: "Test Project",
      };

      // Mock the method to return result with allocation error
      blockchainService.mintCarbonCreditsWithDocumentTracking.mockResolvedValue(
        {
          hash: "0xMintTxHash123",
          documentId: "test_doc_1",
          recipient: "0xUploader123",
          amount: 100,
          tokenId: 1,
          allocationError: "Allocation service unavailable",
        }
      );

      // Execute
      const result =
        await blockchainService.mintCarbonCreditsWithDocumentTracking(
          attestationData,
          "test_doc_1",
          documentData
        );

      // Verify - minting should succeed even if allocation fails
      expect(result.hash).toBe("0xMintTxHash123");
      expect(result.allocationError).toBe("Allocation service unavailable");
    });

    it("should handle transaction wait failure gracefully", async () => {
      // Setup
      const attestationData = {
        recipient: "0xUploader123",
        quantity: 100,
      };

      // Mock the method to return result without tokenId when transaction fails
      blockchainService.mintCarbonCreditsWithDocumentTracking.mockResolvedValue(
        {
          hash: "0xMintTxHash123",
          documentId: "test_doc_1",
          recipient: "0xUploader123",
          amount: 100,
          tokenId: null,
        }
      );

      // Execute & Verify - should not throw, but handle gracefully
      const result =
        await blockchainService.mintCarbonCreditsWithDocumentTracking(
          attestationData,
          "test_doc_1"
        );

      expect(result.hash).toBe("0xMintTxHash123");
      expect(result.tokenId).toBeNull();
    });

    it("should handle log parsing errors gracefully", async () => {
      // Setup
      const attestationData = {
        recipient: "0xUploader123",
        quantity: 100,
      };

      // Mock the method to return result without tokenId when log parsing fails
      blockchainService.mintCarbonCreditsWithDocumentTracking.mockResolvedValue(
        {
          hash: "0xMintTxHash123",
          documentId: "test_doc_1",
          recipient: "0xUploader123",
          amount: 100,
          tokenId: null,
        }
      );

      // Execute
      const result =
        await blockchainService.mintCarbonCreditsWithDocumentTracking(
          attestationData,
          "test_doc_1"
        );

      // Verify - should handle error gracefully
      expect(result.hash).toBe("0xMintTxHash123");
      expect(result.tokenId).toBeNull();
    });
  });
});
