import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import documentService, { DOCUMENT_STATUS } from "../document.js";

// Integration test to verify DocumentService works with real service instances
describe("DocumentService Integration", () => {
  beforeEach(() => {
    // Clear localStorage and reset service state
    localStorage.clear();
    documentService.documents.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with empty document storage", () => {
    expect(documentService.documents.size).toBe(0);
  });

  it("should return correct service status", () => {
    const status = documentService.getServiceStatus();

    expect(status).toHaveProperty("ipfs");
    expect(status).toHaveProperty("blockchain");
    expect(status).toHaveProperty("overall");

    expect(status.ipfs).toHaveProperty("status");
    expect(status.blockchain).toHaveProperty("status");
    expect(status.overall).toHaveProperty("status");
  });

  it("should validate file types correctly", () => {
    const allowedTypes = documentService.getAllowedFileTypes();

    expect(allowedTypes).toContain("application/pdf");
    expect(allowedTypes).toContain("application/msword");
    expect(allowedTypes).toContain("image/jpeg");
    expect(allowedTypes).toContain("image/png");
  });

  it("should format file sizes correctly", () => {
    expect(documentService.formatFileSize(0)).toBe("0 Bytes");
    expect(documentService.formatFileSize(1024)).toBe("1 KB");
    expect(documentService.formatFileSize(1048576)).toBe("1 MB");
    expect(documentService.formatFileSize(1073741824)).toBe("1 GB");
  });

  it("should return correct max file size", () => {
    const maxSize = documentService.getMaxFileSize();
    expect(maxSize).toBe(10 * 1024 * 1024); // 10MB
  });

  it("should handle localStorage persistence", () => {
    const testDoc = {
      id: "test-integration",
      cid: "QmTestIntegration",
      projectName: "Integration Test Project",
      status: DOCUMENT_STATUS.PENDING,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add document and save
    documentService.documents.set("test-integration", testDoc);
    documentService.saveToStorage();

    // Verify it's saved in localStorage
    const stored = localStorage.getItem("cblock_documents");
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored);
    expect(parsed).toBeInstanceOf(Array);
    expect(parsed.length).toBe(1);
    expect(parsed[0][0]).toBe("test-integration");
    expect(parsed[0][1].projectName).toBe("Integration Test Project");
  });

  it("should load documents from localStorage on initialization", () => {
    // Manually set localStorage data
    const testData = [
      [
        "doc1",
        {
          id: "doc1",
          cid: "QmDoc1",
          projectName: "Loaded Project",
          status: DOCUMENT_STATUS.PENDING,
          createdAt: new Date().toISOString(),
        },
      ],
    ];

    localStorage.setItem("cblock_documents", JSON.stringify(testData));

    // Create new service instance to test loading
    const newService = new documentService.constructor();

    expect(newService.documents.size).toBe(1);
    expect(newService.documents.has("doc1")).toBe(true);
    expect(newService.documents.get("doc1").projectName).toBe("Loaded Project");
  });

  it("should handle corrupted localStorage data gracefully", () => {
    // Set invalid JSON in localStorage
    localStorage.setItem("cblock_documents", "invalid json");

    // Should not throw error when initializing
    expect(() => {
      const newService = new documentService.constructor();
      expect(newService.documents.size).toBe(0);
    }).not.toThrow();
  });

  it("should validate document metadata correctly", () => {
    const validMetadata = {
      projectName: "Valid Project",
      projectType: "Reforestation",
      description: "A valid project description",
      location: "Valid Location",
      estimatedCredits: 100,
    };

    expect(() => documentService.validateMetadata(validMetadata)).not.toThrow();

    // Test invalid cases
    expect(() => documentService.validateMetadata({})).toThrow(
      "Project name is required"
    );
    expect(() => documentService.validateMetadata({ projectName: "" })).toThrow(
      "Project name is required"
    );
    expect(() =>
      documentService.validateMetadata({
        projectName: "a".repeat(101),
      })
    ).toThrow("Project name must be 100 characters or less");
  });

  it("should validate files correctly", () => {
    // Valid file
    const validFile = new File(["content"], "test.pdf", {
      type: "application/pdf",
    });
    expect(() => documentService.validateFile(validFile)).not.toThrow();

    // Invalid file type
    const invalidFile = new File(["content"], "test.exe", {
      type: "application/x-executable",
    });
    expect(() => documentService.validateFile(invalidFile)).toThrow(
      "Invalid file type"
    );

    // No file
    expect(() => documentService.validateFile(null)).toThrow(
      "No file provided"
    );

    // Empty filename
    const emptyNameFile = new File(["content"], "", {
      type: "application/pdf",
    });
    expect(() => documentService.validateFile(emptyNameFile)).toThrow(
      "File must have a valid name"
    );
  });

  it("should export document status constants correctly", () => {
    expect(DOCUMENT_STATUS.PENDING).toBe("pending");
    expect(DOCUMENT_STATUS.ATTESTED).toBe("attested");
    expect(DOCUMENT_STATUS.MINTED).toBe("minted");
    expect(DOCUMENT_STATUS.REJECTED).toBe("rejected");
  });
});
