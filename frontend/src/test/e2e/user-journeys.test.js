import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import App from "../../App.jsx";
import authService from "../../services/auth.js";
import documentService from "../../services/document.js";
import blockchainService from "../../services/blockchain.js";
import ipfsService from "../../services/ipfs.js";
import creditAllocationService from "../../services/creditAllocation.js";

// Mock all services
vi.mock("../../services/auth.js");
vi.mock("../../services/document.js");
vi.mock("../../services/blockchain.js");
vi.mock("../../services/ipfs.js");
vi.mock("../../services/creditAllocation.js");
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
    nav: ({ children, ...props }) => <nav {...props}>{children}</nav>,
  },
}));

const TestWrapper = ({ initialEntries = ["/"], children }) => (
  <MemoryRouter initialEntries={initialEntries}>
    {children || <App />}
  </MemoryRouter>
);

describe("End-to-End User Journey Tests", () => {
  const mockFile = new File(["test content"], "carbon-project.pdf", {
    type: "application/pdf",
  });

  beforeEach(() => {
    vi.clearAllMocks();

    // Default service mocks
    ipfsService.uploadFile.mockResolvedValue({ cid: "QmTestCID123" });
    blockchainService.isConnected.mockReturnValue(true);
    blockchainService.getCurrentAccount.mockReturnValue("0x123...abc");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Individual User Complete Journey", () => {
    const individualUser = {
      accountType: "individual",
      walletAddress: "0x123...abc",
      email: "john.doe@example.com",
      firstName: "John",
      lastName: "Doe",
    };

    beforeEach(() => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue(individualUser);
      authService.hasPermission.mockImplementation((permission) => {
        const individualPermissions = ["upload_document", "view_credits"];
        return individualPermissions.includes(permission);
      });
    });

    it("should complete full individual user journey", async () => {
      const user = userEvent.setup();

      // Mock document upload response
      const uploadedDocument = {
        id: "1",
        cid: "QmTestCID123",
        filename: "carbon-project.pdf",
        projectName: "Amazon Reforestation",
        status: "pending",
        uploadedBy: "0x123...abc",
        uploaderType: "individual",
        estimatedCredits: 500,
      };

      documentService.uploadDocument.mockResolvedValue(uploadedDocument);
      documentService.getUserDocuments.mockResolvedValue([uploadedDocument]);
      creditAllocationService.getUserBalance.mockResolvedValue(0);
      creditAllocationService.getUserTransactions.mockResolvedValue([]);

      render(<TestWrapper initialEntries={["/"]} />);

      // Step 1: User should see individual landing page
      await waitFor(() => {
        expect(screen.getByText(/welcome, john/i)).toBeInTheDocument();
      });

      // Step 2: Navigate to upload documents
      const uploadLink = screen.getByRole("link", {
        name: /upload documents/i,
      });
      await user.click(uploadLink);

      await waitFor(() => {
        expect(screen.getByText(/upload your documents/i)).toBeInTheDocument();
      });

      // Step 3: Upload a document
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      // Fill project details
      const projectNameInput = screen.getByLabelText(/project name/i);
      await user.type(projectNameInput, "Amazon Reforestation");

      const projectTypeSelect = screen.getByLabelText(/project type/i);
      await user.selectOptions(projectTypeSelect, "reforestation");

      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(
        descriptionInput,
        "Large scale reforestation project in the Amazon rainforest"
      );

      const locationInput = screen.getByLabelText(/location/i);
      await user.type(locationInput, "Amazon Basin, Brazil");

      const creditsInput = screen.getByLabelText(/estimated credits/i);
      await user.type(creditsInput, "500");

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      // Step 4: Verify upload success
      await waitFor(() => {
        expect(documentService.uploadDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            projectName: "Amazon Reforestation",
            projectType: "reforestation",
            estimatedCredits: 500,
          }),
          "0x123...abc"
        );
      });

      await waitFor(() => {
        expect(
          screen.getByText(/document uploaded successfully/i)
        ).toBeInTheDocument();
      });

      // Step 5: Navigate to dashboard to view uploaded documents
      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText("Amazon Reforestation")).toBeInTheDocument();
        expect(screen.getByText(/pending/i)).toBeInTheDocument();
      });

      // Step 6: Check credit balance (should be 0 initially)
      expect(screen.getByText(/credit balance: 0/i)).toBeInTheDocument();

      // Step 7: Simulate document verification and credit allocation
      const verifiedDocument = {
        ...uploadedDocument,
        status: "minted",
        mintingResult: {
          tokenId: 1,
          amount: 500,
          transactionHash: "0xabc123",
        },
      };

      const creditTransaction = {
        id: "1",
        amount: 500,
        source: "document_verification",
        documentId: "1",
        transactionHash: "0xabc123",
        timestamp: new Date().toISOString(),
      };

      documentService.getUserDocuments.mockResolvedValue([verifiedDocument]);
      creditAllocationService.getUserBalance.mockResolvedValue(500);
      creditAllocationService.getUserTransactions.mockResolvedValue([
        creditTransaction,
      ]);

      // Refresh dashboard
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText(/credit balance: 500/i)).toBeInTheDocument();
        expect(screen.getByText(/minted/i)).toBeInTheDocument();
      });

      // Step 8: View transaction history
      const transactionHistoryButton = screen.getByRole("button", {
        name: /view transactions/i,
      });
      await user.click(transactionHistoryButton);

      await waitFor(() => {
        expect(screen.getByText(/500 credits/i)).toBeInTheDocument();
        expect(screen.getByText(/document verification/i)).toBeInTheDocument();
      });
    });

    it("should handle upload errors gracefully in user journey", async () => {
      const user = userEvent.setup();

      // Mock upload failure
      ipfsService.uploadFile.mockRejectedValue(new Error("Network error"));

      render(<TestWrapper initialEntries={["/mint-credits"]} />);

      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/upload failed/i)).toBeInTheDocument();
      });

      // User should be able to retry
      const retryButton = screen.getByRole("button", { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe("Business User Complete Journey", () => {
    const businessUser = {
      accountType: "business",
      walletAddress: "0x456...def",
      email: "contact@greencorp.com",
      firstName: "Jane",
      lastName: "Smith",
      organization: "Green Corp Ltd",
    };

    beforeEach(() => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue(businessUser);
      authService.hasPermission.mockImplementation((permission) => {
        const businessPermissions = ["upload_document", "view_credits"];
        return businessPermissions.includes(permission);
      });
    });

    it("should complete full business user journey", async () => {
      const user = userEvent.setup();

      const businessDocument = {
        id: "2",
        cid: "QmBusinessCID456",
        filename: "solar-farm-project.pdf",
        projectName: "Solar Farm Initiative",
        status: "pending",
        uploadedBy: "0x456...def",
        uploaderType: "business",
        organization: "Green Corp Ltd",
        estimatedCredits: 1000,
      };

      documentService.uploadDocument.mockResolvedValue(businessDocument);
      documentService.getUserDocuments.mockResolvedValue([businessDocument]);

      render(<TestWrapper initialEntries={["/"]} />);

      // Step 1: Business user landing page
      await waitFor(() => {
        expect(screen.getByText(/welcome, jane/i)).toBeInTheDocument();
        expect(screen.getByText(/green corp ltd/i)).toBeInTheDocument();
      });

      // Step 2: Navigate to upload
      const uploadLink = screen.getByRole("link", {
        name: /upload documents/i,
      });
      await user.click(uploadLink);

      // Step 3: Upload business document
      const fileInput = screen.getByLabelText(/choose file/i);
      await user.upload(fileInput, mockFile);

      // Business-specific fields should be pre-filled
      const organizationInput = screen.getByDisplayValue("Green Corp Ltd");
      expect(organizationInput).toBeInTheDocument();

      const projectNameInput = screen.getByLabelText(/project name/i);
      await user.type(projectNameInput, "Solar Farm Initiative");

      const projectTypeSelect = screen.getByLabelText(/project type/i);
      await user.selectOptions(projectTypeSelect, "renewable-energy");

      const uploadButton = screen.getByRole("button", {
        name: /upload document/i,
      });
      await user.click(uploadButton);

      // Step 4: Verify business-specific upload
      await waitFor(() => {
        expect(documentService.uploadDocument).toHaveBeenCalledWith(
          expect.objectContaining({
            uploaderType: "business",
            organization: "Green Corp Ltd",
            projectName: "Solar Farm Initiative",
          }),
          "0x456...def"
        );
      });

      // Step 5: View in dashboard with business context
      const dashboardLink = screen.getByRole("link", { name: /dashboard/i });
      await user.click(dashboardLink);

      await waitFor(() => {
        expect(screen.getByText("Solar Farm Initiative")).toBeInTheDocument();
        expect(screen.getByText(/business project/i)).toBeInTheDocument();
      });
    });
  });

  describe("Verifier Complete Journey", () => {
    const verifierUser = {
      accountType: "verifier",
      walletAddress: "0x789...ghi",
      email: "verifier@certify.org",
      firstName: "Dr. Alice",
      lastName: "Johnson",
      verifierCredentials: {
        certificationId: "CERT-12345",
        issuingAuthority: "Global Carbon Council",
      },
    };

    beforeEach(() => {
      authService.isUserAuthenticated.mockReturnValue(true);
      authService.getCurrentUser.mockReturnValue(verifierUser);
      authService.hasPermission.mockImplementation((permission) => {
        const verifierPermissions = [
          "view_all_documents",
          "attest_document",
          "mint_credits",
          "view_credits",
        ];
        return verifierPermissions.includes(permission);
      });
    });

    it("should complete full verifier journey", async () => {
      const user = userEvent.setup();

      const pendingDocuments = [
        {
          id: "1",
          projectName: "Amazon Reforestation",
          uploaderType: "individual",
          uploadedBy: "0x123...abc",
          status: "pending",
          estimatedCredits: 500,
        },
        {
          id: "2",
          projectName: "Solar Farm Initiative",
          uploaderType: "business",
          uploadedBy: "0x456...def",
          status: "pending",
          estimatedCredits: 1000,
        },
      ];

      documentService.getDocumentsForVerifier.mockResolvedValue(
        pendingDocuments
      );
      documentService.attestDocument.mockResolvedValue({ success: true });
      blockchainService.mintWithAttestation.mockResolvedValue({
        success: true,
        tokenId: 1,
        transactionHash: "0xmint123",
      });

      render(<TestWrapper initialEntries={["/"]} />);

      // Step 1: Verifier should be redirected to dashboard
      await waitFor(() => {
        expect(screen.getByText(/verifier dashboard/i)).toBeInTheDocument();
        expect(screen.getByText(/dr\. alice/i)).toBeInTheDocument();
      });

      // Step 2: View pending documents
      await waitFor(() => {
        expect(screen.getByText("Amazon Reforestation")).toBeInTheDocument();
        expect(screen.getByText("Solar Farm Initiative")).toBeInTheDocument();
      });

      // Step 3: Review and attest first document
      const firstDocumentCard = screen
        .getByText("Amazon Reforestation")
        .closest('[data-testid="document-card"]');
      await user.click(firstDocumentCard);

      // Should show document details modal
      await waitFor(() => {
        expect(screen.getByText(/document details/i)).toBeInTheDocument();
        expect(screen.getByText(/individual user/i)).toBeInTheDocument();
      });

      // Fill attestation form
      const gsProjectIdInput = screen.getByLabelText(/gs project id/i);
      await user.type(gsProjectIdInput, "GS-VCS-001");

      const gsSerialInput = screen.getByLabelText(/gs serial/i);
      await user.type(gsSerialInput, "GS-VCS-001-12345");

      const attestButton = screen.getByRole("button", {
        name: /submit attestation/i,
      });
      await user.click(attestButton);

      // Step 4: Verify attestation
      await waitFor(() => {
        expect(documentService.attestDocument).toHaveBeenCalledWith(
          "1",
          expect.objectContaining({
            gsProjectId: "GS-VCS-001",
            gsSerial: "GS-VCS-001-12345",
          }),
          "0x789...ghi"
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/attestation successful/i)).toBeInTheDocument();
      });

      // Step 5: Mint credits for attested document
      const mintButton = screen.getByRole("button", { name: /mint credits/i });
      await user.click(mintButton);

      await waitFor(() => {
        expect(blockchainService.mintWithAttestation).toHaveBeenCalledWith(
          expect.objectContaining({
            gsProjectId: "GS-VCS-001",
            gsSerial: "GS-VCS-001-12345",
            amount: 500,
            recipient: "0x123...abc", // Original uploader
          })
        );
      });

      // Step 6: Verify minting success
      await waitFor(() => {
        expect(
          screen.getByText(/credits minted successfully/i)
        ).toBeInTheDocument();
      });

      // Step 7: Check document status updated
      const updatedDocuments = pendingDocuments.map((doc) =>
        doc.id === "1" ? { ...doc, status: "minted" } : doc
      );
      documentService.getDocumentsForVerifier.mockResolvedValue(
        updatedDocuments
      );

      // Refresh dashboard
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(screen.getByText(/minted/i)).toBeInTheDocument();
      });
    });

    it("should handle batch operations for multiple documents", async () => {
      const user = userEvent.setup();

      const multipleDocuments = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        projectName: `Project ${i + 1}`,
        uploaderType: i % 2 === 0 ? "individual" : "business",
        status: "pending",
        estimatedCredits: 100 * (i + 1),
      }));

      documentService.getDocumentsForVerifier.mockResolvedValue(
        multipleDocuments
      );

      render(<TestWrapper initialEntries={["/verifier-dashboard"]} />);

      await waitFor(() => {
        expect(screen.getByText(/5 pending documents/i)).toBeInTheDocument();
      });

      // Should show pagination or filtering options
      expect(screen.getByLabelText(/filter by type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/search documents/i)).toBeInTheDocument();

      // Filter by individual documents
      const filterSelect = screen.getByLabelText(/filter by type/i);
      await user.selectOptions(filterSelect, "individual");

      await waitFor(() => {
        expect(screen.getByText("Project 1")).toBeInTheDocument();
        expect(screen.getByText("Project 3")).toBeInTheDocument();
        expect(screen.queryByText("Project 2")).not.toBeInTheDocument();
      });
    });
  });

  describe("Cross-Role Interactions", () => {
    it("should prevent unauthorized access between roles", async () => {
      const user = userEvent.setup();

      // Start as individual user
      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
      });
      authService.hasPermission.mockReturnValue(false);

      render(<TestWrapper initialEntries={["/verifier-dashboard"]} />);

      // Should show access denied
      expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      expect(screen.getByText(/insufficient permissions/i)).toBeInTheDocument();

      // Should provide navigation back to appropriate page
      const backToDashboardLink = screen.getByRole("link", {
        name: /go to dashboard/i,
      });
      expect(backToDashboardLink).toBeInTheDocument();
    });

    it("should handle role changes during session", async () => {
      const user = userEvent.setup();

      // Start as individual user
      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
      });

      const { rerender } = render(<TestWrapper initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText(/individual user/i)).toBeInTheDocument();
      });

      // Simulate role change to verifier
      authService.getCurrentUser.mockReturnValue({
        accountType: "verifier",
        walletAddress: "0x123...abc",
      });
      authService.hasPermission.mockImplementation((permission) => {
        const verifierPermissions = ["view_all_documents", "attest_document"];
        return verifierPermissions.includes(permission);
      });

      rerender(<TestWrapper initialEntries={["/"]} />);

      await waitFor(() => {
        expect(screen.getByText(/verifier dashboard/i)).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network errors gracefully", async () => {
      const user = userEvent.setup();

      authService.getCurrentUser.mockReturnValue({
        accountType: "individual",
        walletAddress: "0x123...abc",
      });

      // Mock network error
      documentService.getUserDocuments.mockRejectedValue(
        new Error("Network error")
      );

      render(<TestWrapper initialEntries={["/dashboard"]} />);

      await waitFor(() => {
        expect(
          screen.getByText(/failed to load documents/i)
        ).toBeInTheDocument();
      });

      // Should show retry option
      const retryButton = screen.getByRole("button", { name: /retry/i });
      await user.click(retryButton);

      expect(documentService.getUserDocuments).toHaveBeenCalledTimes(2);
    });

    it("should handle authentication errors", async () => {
      authService.isUserAuthenticated.mockReturnValue(false);
      authService.getCurrentUser.mockReturnValue(null);

      render(<TestWrapper initialEntries={["/dashboard"]} />);

      // Should redirect to login
      await waitFor(() => {
        expect(screen.getByText(/please log in/i)).toBeInTheDocument();
      });
    });
  });
});
