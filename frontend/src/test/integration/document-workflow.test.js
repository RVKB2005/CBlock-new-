import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter } from "react-router-dom";
import authService from "../../services/auth.js";
import documentService from "../../services/document.js";
import blockchainService from "../../services/blockchain.js";
import ipfsService from "../../services/ipfs.js";
import MintCreditsPage from "../../MintCreditsPage.jsx";
import VerifierDashboard from "../../components/VerifierDashboard.jsx";

// Mock all services
vi.mock("../../services/auth.js");
vi.mock("../../services/document.js");
vi.mock("../../services/blockchain.js");
vi.mock("../../services/ipfs.js");
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
}));

const TestWrapper = ({ children }) => <BrowserRouter>{children}</BrowserRouter>;

describe("Document Upload and Verification Workflow Integration Tests", () => {
  const mockFile = new File(["test content"], "test-document.pdf", {
    type: "application/pdf",
  });

  const mockDocument = {
    id: "1",
    cid: "QmTestCID123",
    filename: "test-document.pdf",
    projectName: "Test Project",
    projectType: "reforestation",
    description: "Test project description",
    location: "Test Location",
    estimatedCredits: 100,
    uploadedBy: "0x123...abc",
    uploaderType: "individual",
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default auth service mocks
    authService.isUserAuthenticated.mockReturnValue(true);
    authService.getCurrentUser.mockReturnValue({
      accountType: "individual",
      walletAddress: "0x123...abc",
      email: "test@example.com",
    });
    authService.hasPermission.mockReturnValue(true);

    // Default service mocks
    ipfsService.uploadFile.mockResolvedValue({ cid: "QmTestCID123" });
    documentService.uploadDocument.mockResolvedValue(mockDocument);
    documentService.getDocumentsForVerifier.mockResolvedValue([mockDocument]);
    blockchainService.registerDocument.mockResolvedValue({ success: true });
    blockchainService.getAllDocuments.mockResolvedValue([mockDocument]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Individual User Document Upload Flow", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
        email: "individual@example.com",
      });
    });

    it("should allow individual user to upload document successfully", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      // Should show upload interface for individual users
      expect(screen.getByText(/upload your documents/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/mint carbon credits/i)
      ).not.toBeInTheDocument();

      // Find and interact with file input
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      // Fill in project details
      const projectNameInput = screen.getByLabelText(/project name/i);
      await user.type(projectNameInput, "Test Reforestation Project");

      const projectTypeSelect = screen.getByLabelText(/project type/i);
      await user.selectOptions(projectTypeSelect, "reforestation");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(descriptionInput, "A test reforestation project");

      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, "Amazon Rainforest");

      const creditsInput = screen.getByLabelText(/estimated credits/i);
      await user.type(creditsInput, "100");

      // Submit the form
      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      // Verify the upload process
      await waitFor(() => {
        expect(ipfsService.uploadFile).toHaveBeenCalledWith(mockFile);
      });

      await waitFor(() => {
        expect(documentService.uploadDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            file: mockFile,
            cid: "QmTestCID123",
            projectName: "Test Reforestation Project",
            projectType: "reforestation",
            description: "A test reforestation project",
            location: "Amazon Rainforest",
            estimatedCredits: 100,
          }),
          "0x123...abc"
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(
          screen.getByText(/document uploaded successfully/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle upload errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock upload failure
      ipfsService.uploadFile.mockRejectedValue(new Error("IPFS upload failed"));

      render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });
    });

    it("should validate file types and sizes", async () => {
      const user = userEvent.setup();
      const invalidFile = new File(["test"], "test.txt", {
        type: "text/plain",
      });

      render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, invalidFile);

      await waitFor(() => {
        expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
      });
    });
  });

  describe("Business User Document Upload Flow", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "business",
        walletAddress: "0x456...def",
        email: "business@example.com",
        organization: "Test Corp",
      });
    });

    it("should allow business user to upload document with organization info", async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      // Should show upload interface for business users
      expect(screen.getByText(/upload your documents/i)).toBeInTheDocument();
      expect(
        screen.queryByText(/mint carbon credits/i)
      ).not.toBeInTheDocument();

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      // Business users should see organization field pre-filled
      const organizationInput = screen.getByDisplayValue("Test Corp");
      expect(organizationInput).toBeInTheDocument();

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(documentService.uploadDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            uploaderType: "business",
            organization: "Test Corp",
          }),
          "0x456...def"
        );
      });
    });
  });

  describe("Verifier Document Review and Attestation Flow", () => {
    beforeEach(() => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "verifier",
        walletAddress: "0x789...ghi",
        email: "verifier@example.com",
      });
      authService.hasPermission.mockImplementation((permission) => {
        const verifierPermissions = [
          "view_all_documents",
          "attest_document",
          "mint_credits",
        ];
        return verifierPermissions.includes(permission);
      });
    });

    it("should display all uploaded documents in verifier dashboard", async () => {
      const mockDocuments = [
        { ...mockDocument, id: "1", uploaderType: "individual" },
        {
          ...mockDocument,
          id: "2",
          uploaderType: "business",
          projectName: "Business Project",
        },
      ];

      documentService.getDocumentsForVerifier.mockResolvedValue(mockDocuments);

      render(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
        expect(screen.getByText("Business Project")).toBeInTheDocument();
      });

      // Should show uploader type
      expect(screen.getByText(/individual/i)).toBeInTheDocument();
      expect(screen.getByText(/business/i)).toBeInTheDocument();
    });

    it("should allow verifier to attest documents", async () => {
      const user = userEvent.setup();

      documentService.attestDocument.mockResolvedValue({
        success: true,
        transactionHash: "0xabc123",
      });

      render(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      // Click on document to view details
      const documentCard = screen
        .getByText("Test Project")
        .closest('[data-testid="document-card"]');
      await user.click(documentCard);

      // Should show attestation form
      await waitFor(() => {
        expect(screen.getByText(/attest document/i)).toBeInTheDocument();
      });

      // Fill attestation details
      const gsProjectIdInput = screen.getByLabelText(/gs project id/i);
      await user.type(gsProjectIdInput, "GS12345");

      const gsSerialInput = screen.getByLabelText(/gs serial/i);
      await user.type(gsSerialInput, "GS-VCS-12345-67890");

      // Submit attestation
      const attestButton = screen.getByRole("button", {
        name: /submit attestation/i,
      });
      await user.click(attestButton);

      await waitFor(() => {
        expect(documentService.attestDocument).toHaveBeenCalledWith(
          "1",
          expect.objectContaining({
            gsProjectId: "GS12345",
            gsSerial: "GS-VCS-12345-67890",
          }),
          "0x789...ghi"
        );
      });

      // Should show success message
      await waitFor(() => {
        expect(screen.getByText(/attestation successful/i)).toBeInTheDocument();
      });
    });

    it("should allow verifier to mint credits for attested documents", async () => {
      const user = userEvent.setup();

      const attestedDocument = {
        ...mockDocument,
        status: "attested",
        attestation: {
          verifierAddress: "0x789...ghi",
          gsProjectId: "GS12345",
          gsSerial: "GS-VCS-12345-67890",
        },
      };

      documentService.getDocumentsForVerifier.mockResolvedValue([
        attestedDocument,
      ]);
      blockchainService.mintWithAttestation.mockResolvedValue({
        success: true,
        transactionHash: "0xdef456",
        tokenId: 1,
      });

      render(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      // Should show mint button for attested documents
      const mintButton = screen.getByRole("button", { name: /mint credits/i });
      await user.click(mintButton);

      await waitFor(() => {
        expect(blockchainService.mintWithAttestation).toHaveBeenCalledWith(
          expect.objectContaining({
            gsProjectId: "GS12345",
            gsSerial: "GS-VCS-12345-67890",
            amount: 100,
            recipient: "0x123...abc", // Original uploader
          })
        );
      });

      // Should show minting success
      await waitFor(() => {
        expect(
          screen.getByText(/credits minted successfully/i)
        ).toBeInTheDocument();
      });
    });

    it("should handle attestation errors", async () => {
      const user = userEvent.setup();

      documentService.attestDocument.mockRejectedValue(
        new Error("Attestation failed")
      );

      render(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      const documentCard = screen
        .getByText("Test Project")
        .closest('[data-testid="document-card"]');
      await user.click(documentCard);

      const attestButton = screen.getByRole("button", {
        name: /submit attestation/i,
      });
      await user.click(attestButton);

      await waitFor(() => {
        expect(screen.getByText(/attestation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Complete Workflow Integration", () => {
    it("should complete full workflow from upload to credit allocation", async () => {
      const user = userEvent.setup();

      // Step 1: Individual uploads document
      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
        email: "individual@example.com",
      });

      const { rerender } = render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      // Upload document
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(documentService.uploadDocument).toHaveBeenCalled();
      });

      // Step 2: Switch to verifier view
      authService.getCurrentUser.mockReturnValue({
        accountType: "verifier",
        walletAddress: "0x789...ghi",
        email: "verifier@example.com",
      });

      rerender(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      // Step 3: Verifier attests document
      await waitFor(() => {
        expect(screen.getByText("Test Project")).toBeInTheDocument();
      });

      const documentCard = screen
        .getByText("Test Project")
        .closest('[data-testid="document-card"]');
      await user.click(documentCard);

      const attestButton = screen.getByRole("button", {
        name: /submit attestation/i,
      });
      await user.click(attestButton);

      await waitFor(() => {
        expect(documentService.attestDocument).toHaveBeenCalled();
      });

      // Step 4: Verifier mints credits
      const mintButton = screen.getByRole("button", { name: /mint credits/i });
      await user.click(mintButton);

      await waitFor(() => {
        expect(blockchainService.mintWithAttestation).toHaveBeenCalled();
      });

      // Verify complete workflow
      expect(ipfsService.uploadFile).toHaveBeenCalled();
      expect(documentService.uploadDocument).toHaveBeenCalled();
      expect(documentService.attestDocument).toHaveBeenCalled();
      expect(blockchainService.mintWithAttestation).toHaveBeenCalled();
    });
  });

  describe("Role-Based Access Control Integration", () => {
    it("should prevent individual users from accessing verifier functions", () => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
      });
      authService.hasPermission.mockReturnValue(false);

      render(
        <TestWrapper>
          <VerifierDashboard />
        </TestWrapper>
      );

      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    });

    it("should redirect verifiers from upload page to dashboard", () => {
      authService.getCurrentUser.mockReturnValue({
        accountType: "verifier",
        walletAddress: "0x789...ghi",
      });

      render(
        <TestWrapper>
          <MintCreditsPage />
        </TestWrapper>
      );

      // Should redirect to verifier dashboard
      expect(screen.getByText(/verifier dashboard/i)).toBeInTheDocument();
    });
  });
});
