import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  signAttestation,
  validateAttestationData,
  createAttestationData,
  EIP712_DOMAIN,
  ATTESTATION_TYPES,
} from "../eip712.js";

describe("EIP-712 Utilities", () => {
  const mockSigner = {
    signTypedData: vi.fn(),
    provider: {
      getNetwork: vi.fn().mockResolvedValue({ chainId: 1337 }),
    },
  };

  const mockAttestationData = {
    gsProjectId: "GS12345",
    gsSerial: "GS12345-001-2024",
    ipfsCid: "QmTestCID123",
    amount: 100,
    recipient: "0x1234567890123456789012345678901234567890",
    nonce: 0,
  };

  const contractAddress = "0xcontract123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("signAttestation", () => {
    it("generates EIP-712 signature successfully", async () => {
      mockSigner.signTypedData.mockResolvedValue("0xsignature123");

      const signature = await signAttestation(
        mockAttestationData,
        contractAddress,
        mockSigner
      );

      expect(signature).toBe("0xsignature123");
      expect(mockSigner.signTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "CarbonCredit",
          version: "1",
          chainId: 1337,
          verifyingContract: contractAddress,
        }),
        ATTESTATION_TYPES,
        mockAttestationData
      );
    });

    it("throws error for missing parameters", async () => {
      await expect(
        signAttestation(null, contractAddress, mockSigner)
      ).rejects.toThrow("Missing required parameters for signature generation");

      await expect(
        signAttestation(mockAttestationData, null, mockSigner)
      ).rejects.toThrow("Missing required parameters for signature generation");

      await expect(
        signAttestation(mockAttestationData, contractAddress, null)
      ).rejects.toThrow("Missing required parameters for signature generation");
    });

    it("throws error for missing attestation data fields", async () => {
      const incompleteData = { ...mockAttestationData };
      delete incompleteData.gsProjectId;

      await expect(
        signAttestation(incompleteData, contractAddress, mockSigner)
      ).rejects.toThrow("Missing required attestation data fields");
    });

    it("throws error for invalid amount", async () => {
      const invalidData = { ...mockAttestationData, amount: 0 };

      await expect(
        signAttestation(invalidData, contractAddress, mockSigner)
      ).rejects.toThrow("Amount must be a positive number");
    });

    it("throws error for invalid nonce", async () => {
      const invalidData = { ...mockAttestationData, nonce: -1 };

      await expect(
        signAttestation(invalidData, contractAddress, mockSigner)
      ).rejects.toThrow("Nonce must be a non-negative number");
    });

    it("handles user rejection gracefully", async () => {
      mockSigner.signTypedData.mockRejectedValue(
        new Error("user rejected transaction")
      );

      await expect(
        signAttestation(mockAttestationData, contractAddress, mockSigner)
      ).rejects.toThrow("Signature was rejected by user");
    });

    it("uses default chain ID when network unavailable", async () => {
      const signerWithoutNetwork = {
        signTypedData: vi.fn().mockResolvedValue("0xsignature123"),
        provider: {
          getNetwork: vi.fn().mockRejectedValue(new Error("Network error")),
        },
      };

      await signAttestation(
        mockAttestationData,
        contractAddress,
        signerWithoutNetwork
      );

      expect(signerWithoutNetwork.signTypedData).toHaveBeenCalledWith(
        expect.objectContaining({
          chainId: 1337, // Default chain ID
        }),
        ATTESTATION_TYPES,
        mockAttestationData
      );
    });
  });

  describe("validateAttestationData", () => {
    it("validates correct attestation data", () => {
      expect(() => validateAttestationData(mockAttestationData)).not.toThrow();
    });

    it("throws error for missing gsProjectId", () => {
      const invalidData = { ...mockAttestationData };
      delete invalidData.gsProjectId;

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Gold Standard Project ID is required"
      );
    });

    it("throws error for empty gsProjectId", () => {
      const invalidData = { ...mockAttestationData, gsProjectId: "" };

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Gold Standard Project ID is required"
      );
    });

    it("throws error for missing gsSerial", () => {
      const invalidData = { ...mockAttestationData };
      delete invalidData.gsSerial;

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Gold Standard Serial Number is required"
      );
    });

    it("throws error for missing ipfsCid", () => {
      const invalidData = { ...mockAttestationData };
      delete invalidData.ipfsCid;

      expect(() => validateAttestationData(invalidData)).toThrow(
        "IPFS CID is required"
      );
    });

    it("throws error for missing recipient", () => {
      const invalidData = { ...mockAttestationData };
      delete invalidData.recipient;

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Recipient address is required"
      );
    });

    it("throws error for invalid recipient address format", () => {
      const invalidData = {
        ...mockAttestationData,
        recipient: "invalid-address",
      };

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Invalid recipient address format"
      );
    });

    it("throws error for invalid amount", () => {
      const invalidData = { ...mockAttestationData, amount: 0 };

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Amount must be a positive number between 1 and 1,000,000"
      );

      const tooLargeData = { ...mockAttestationData, amount: 2000000 };

      expect(() => validateAttestationData(tooLargeData)).toThrow(
        "Amount must be a positive number between 1 and 1,000,000"
      );
    });

    it("throws error for invalid nonce", () => {
      const invalidData = { ...mockAttestationData, nonce: -1 };

      expect(() => validateAttestationData(invalidData)).toThrow(
        "Nonce must be a non-negative number"
      );
    });

    it("throws error for invalid gsProjectId length", () => {
      const shortId = { ...mockAttestationData, gsProjectId: "GS" };

      expect(() => validateAttestationData(shortId)).toThrow(
        "Gold Standard Project ID must be between 3 and 50 characters"
      );

      const longId = { ...mockAttestationData, gsProjectId: "A".repeat(51) };

      expect(() => validateAttestationData(longId)).toThrow(
        "Gold Standard Project ID must be between 3 and 50 characters"
      );
    });

    it("throws error for invalid gsSerial length", () => {
      const shortSerial = { ...mockAttestationData, gsSerial: "GS" };

      expect(() => validateAttestationData(shortSerial)).toThrow(
        "Gold Standard Serial Number must be between 3 and 50 characters"
      );

      const longSerial = { ...mockAttestationData, gsSerial: "A".repeat(51) };

      expect(() => validateAttestationData(longSerial)).toThrow(
        "Gold Standard Serial Number must be between 3 and 50 characters"
      );
    });

    it("throws error for invalid IPFS CID format", () => {
      const invalidCid = { ...mockAttestationData, ipfsCid: "invalid-cid" };

      expect(() => validateAttestationData(invalidCid)).toThrow(
        "Invalid IPFS CID format"
      );
    });

    it("accepts valid IPFS CID formats", () => {
      const qmCid = {
        ...mockAttestationData,
        ipfsCid: "QmTestCID123456789012345678901234567890123456",
      };
      const bafyCid = {
        ...mockAttestationData,
        ipfsCid: "bafyTestCID123456789012345678901234567890123456",
      };
      const bafCid = {
        ...mockAttestationData,
        ipfsCid: "bafTestCID123456789012345678901234567890123456",
      };
      const k51Cid = {
        ...mockAttestationData,
        ipfsCid: "k51TestCID123456789012345678901234567890123456",
      };

      expect(() => validateAttestationData(qmCid)).not.toThrow();
      expect(() => validateAttestationData(bafyCid)).not.toThrow();
      expect(() => validateAttestationData(bafCid)).not.toThrow();
      expect(() => validateAttestationData(k51Cid)).not.toThrow();
    });
  });

  describe("createAttestationData", () => {
    const mockFormData = {
      gsProjectId: "GS12345",
      gsSerial: "GS12345-001-2024",
      amount: 150,
    };

    const mockDocument = {
      cid: "QmTestCID123",
      uploadedBy: "0x1234567890123456789012345678901234567890",
      estimatedCredits: 100,
    };

    it("creates attestation data from form and document", () => {
      const result = createAttestationData(mockFormData, mockDocument, 5);

      expect(result).toEqual({
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
        ipfsCid: "QmTestCID123",
        amount: 150,
        recipient: "0x1234567890123456789012345678901234567890",
        nonce: 5,
      });
    });

    it("uses document estimated credits when form amount is not provided", () => {
      const formDataWithoutAmount = {
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
      };

      const result = createAttestationData(
        formDataWithoutAmount,
        mockDocument,
        0
      );

      expect(result.amount).toBe(100); // Uses document.estimatedCredits
    });

    it("uses 0 as fallback when no amount is available", () => {
      const formDataWithoutAmount = {
        gsProjectId: "GS12345",
        gsSerial: "GS12345-001-2024",
      };

      const documentWithoutCredits = {
        ...mockDocument,
        estimatedCredits: undefined,
      };

      const result = createAttestationData(
        formDataWithoutAmount,
        documentWithoutCredits,
        0
      );

      expect(result.amount).toBe(0);
    });

    it("trims whitespace from string fields", () => {
      const formDataWithSpaces = {
        gsProjectId: "  GS12345  ",
        gsSerial: "  GS12345-001-2024  ",
        amount: 150,
      };

      const result = createAttestationData(formDataWithSpaces, mockDocument, 0);

      expect(result.gsProjectId).toBe("GS12345");
      expect(result.gsSerial).toBe("GS12345-001-2024");
    });
  });

  describe("EIP712_DOMAIN", () => {
    it("has correct domain structure", () => {
      expect(EIP712_DOMAIN).toEqual({
        name: "CarbonCredit",
        version: "1",
        chainId: 1337,
        verifyingContract: null,
      });
    });
  });

  describe("ATTESTATION_TYPES", () => {
    it("has correct type structure", () => {
      expect(ATTESTATION_TYPES).toEqual({
        Attestation: [
          { name: "gsProjectId", type: "string" },
          { name: "gsSerial", type: "string" },
          { name: "ipfsCid", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "recipient", type: "address" },
          { name: "nonce", type: "uint256" },
        ],
      });
    });
  });
});
