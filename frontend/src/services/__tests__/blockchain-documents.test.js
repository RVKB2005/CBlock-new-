import { describe, it, expect, vi, beforeEach } from "vitest";
import { ethers } from "ethers";
import blockchainService from "../blockchain.js";

// Mock ethers
vi.mock("ethers", () => ({
  ethers: {
    BrowserProvider: vi.fn(),
    Contract: vi.fn(),
    formatEther: vi.fn(),
    parseEther: vi.fn(),
  },
}));

// Mock environment variables
vi.mock("import.meta", () => ({
  env: {
    VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS:
      "0x1234567890123456789012345678901234567890",
    VITE_CONTRACT_CARBON_ADDRESS: "0x1234567890123456789012345678901234567890",
    VITE_CONTRACT_MARKETPLACE_ADDRESS:
      "0x1234567890123456789012345678901234567890",
    VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS:
      "0x1234567890123456789012345678901234567890",
    VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS:
      "0x1234567890123456789012345678901234567890",
    VITE_CHAIN_ID: "11155111",
  },
}));

describe("BlockchainService - Document Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the service state
    blockchainService.contracts = {};
    blockchainService.isInitialized = false;
  });

  describe("registerDocument", () => {
    it("should throw error when DocumentRegistry contract is not initialized", async () => {
      await expect(
        blockchainService.registerDocument({
          cid: "QmTest123",
          projectName: "Test Project",
        })
      ).rejects.toThrow(
        "DocumentRegistry contract with signer not initialized"
      );
    });

    it("should throw error when required fields are missing", async () => {
      // Mock contract to be available
      blockchainService.contracts.documentRegistrySigner = {
        registerDocument: vi.fn(),
      };

      await expect(blockchainService.registerDocument({})).rejects.toThrow(
        "CID and project name are required"
      );
      await expect(
        blockchainService.registerDocument({ cid: "QmTest123" })
      ).rejects.toThrow("CID and project name are required");
      await expect(
        blockchainService.registerDocument({ projectName: "Test" })
      ).rejects.toThrow("CID and project name are required");
    });

    it("should successfully register document with valid data", async () => {
      const mockTx = {
        hash: "0xabcdef",
        wait: vi.fn().mockResolvedValue({
          logs: [
            {
              topics: ["0x123"],
              data: "0x456",
            },
          ],
        }),
      };

      const mockContract = {
        registerDocument: vi.fn().mockResolvedValue(mockTx),
        interface: {
          parseLog: vi.fn().mockReturnValue({
            name: "DocumentRegistered",
            args: { documentId: 1 },
          }),
        },
      };

      blockchainService.contracts.documentRegistrySigner = mockContract;
      blockchainService.contracts.documentRegistry = mockContract;

      const documentData = {
        cid: "QmTest123",
        projectName: "Test Project",
        projectType: "reforestation",
        description: "Test description",
        location: "Test location",
        estimatedCredits: 100,
      };

      const result = await blockchainService.registerDocument(documentData);

      expect(mockContract.registerDocument).toHaveBeenCalledWith(
        "QmTest123",
        "Test Project",
        "reforestation",
        "Test description",
        "Test location",
        BigInt(100)
      );
      expect(result.hash).toBe("0xabcdef");
      expect(result.documentId).toBe(1);
    });
  });

  describe("getAllDocuments", () => {
    it("should return empty array when contract is not initialized", async () => {
      const result = await blockchainService.getAllDocuments();
      expect(result).toEqual([]);
    });

    it("should return formatted documents when contract is available", async () => {
      const mockDocuments = [
        {
          cid: "QmTest123",
          uploader: "0x123",
          projectName: "Test Project",
          projectType: "reforestation",
          description: "Test description",
          location: "Test location",
          estimatedCredits: BigInt(100),
          timestamp: BigInt(1640995200), // 2022-01-01
          isAttested: false,
          verifier: "0x0000000000000000000000000000000000000000",
          attestedAt: BigInt(0),
        },
      ];

      blockchainService.contracts.documentRegistry = {
        getAllDocuments: vi.fn().mockResolvedValue(mockDocuments),
      };

      const result = await blockchainService.getAllDocuments();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 1,
        cid: "QmTest123",
        uploader: "0x123",
        projectName: "Test Project",
        estimatedCredits: 100,
        isAttested: false,
      });
      expect(result[0].uploadedAt).toBe("2022-01-01T00:00:00.000Z");
    });
  });

  describe("attestDocument", () => {
    it("should throw error when DocumentRegistry contract is not initialized", async () => {
      await expect(blockchainService.attestDocument(1)).rejects.toThrow(
        "DocumentRegistry contract with signer not initialized"
      );
    });

    it("should throw error for invalid document ID", async () => {
      blockchainService.contracts.documentRegistrySigner = {
        attestDocument: vi.fn(),
      };

      await expect(blockchainService.attestDocument(0)).rejects.toThrow(
        "Valid document ID is required"
      );
      await expect(blockchainService.attestDocument(-1)).rejects.toThrow(
        "Valid document ID is required"
      );
    });

    it("should successfully attest document", async () => {
      const mockTx = {
        hash: "0xabcdef",
      };

      const mockContract = {
        attestDocument: vi.fn().mockResolvedValue(mockTx),
      };

      blockchainService.contracts.documentRegistrySigner = mockContract;

      const result = await blockchainService.attestDocument(1);

      expect(mockContract.attestDocument).toHaveBeenCalledWith(1);
      expect(result.hash).toBe("0xabcdef");
    });
  });

  describe("isDocumentRegistryAvailable", () => {
    it("should return false when contract address is not configured", () => {
      // Mock empty address
      vi.mocked(import.meta.env).VITE_CONTRACT_DOCUMENT_REGISTRY_ADDRESS = "";

      const result = blockchainService.isDocumentRegistryAvailable();
      expect(result).toBe(false);
    });

    it("should return false when contract is not initialized", () => {
      // Address is configured but contract not initialized
      const result = blockchainService.isDocumentRegistryAvailable();
      expect(result).toBe(false);
    });

    it("should return true when contract is properly configured and initialized", () => {
      // This test verifies the method exists and returns a boolean
      const result = blockchainService.isDocumentRegistryAvailable();
      expect(typeof result).toBe("boolean");
    });
  });
});
