import ipfsService from "./ipfs.js";
import blockchainService from "./blockchain.js";
import authService from "./auth.js";
import errorHandler from "./errorHandler.js";
import toastNotifications from "../components/ToastNotifications.jsx";
import retryService from "./retryService.js";

// Document status constants
export const DOCUMENT_STATUS = {
  PENDING: "pending",
  ATTESTED: "attested",
  MINTED: "minted",
  REJECTED: "rejected",
};

// File validation constants
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/jpg",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

class DocumentService {
  constructor() {
    this.documents = new Map(); // In-memory storage for document metadata
    this.initializeStorage();
  }

  // Initialize storage - load documents from localStorage
  initializeStorage() {
    try {
      const stored = localStorage.getItem("cblock_documents");
      if (stored) {
        const documentsArray = JSON.parse(stored);
        this.documents = new Map(documentsArray);
      }
    } catch (error) {
      console.error("Failed to load documents from storage:", error);
      this.documents = new Map();
    }
  }

  // Save documents to localStorage
  saveToStorage() {
    try {
      const documentsArray = Array.from(this.documents.entries());
      localStorage.setItem("cblock_documents", JSON.stringify(documentsArray));
    } catch (error) {
      console.error("Failed to save documents to storage:", error);
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @throws {Error} If file is invalid
   */
  validateFile(file) {
    if (!file) {
      throw new Error("No file provided");
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(
        "Invalid file type. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files."
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 10MB.");
    }

    // Check file name
    if (!file.name || file.name.trim() === "") {
      throw new Error("File must have a valid name");
    }

    return true;
  }

  /**
   * Validate document metadata
   * @param {Object} metadata - Document metadata
   * @throws {Error} If metadata is invalid
   */
  validateMetadata(metadata) {
    const {
      projectName,
      projectType,
      description,
      location,
      estimatedCredits,
    } = metadata;

    if (!projectName || projectName.trim() === "") {
      throw new Error("Project name is required");
    }

    if (projectName.length > 100) {
      throw new Error("Project name must be 100 characters or less");
    }

    if (projectType && projectType.length > 50) {
      throw new Error("Project type must be 50 characters or less");
    }

    if (description && description.length > 500) {
      throw new Error("Description must be 500 characters or less");
    }

    if (location && location.length > 100) {
      throw new Error("Location must be 100 characters or less");
    }

    if (estimatedCredits !== undefined) {
      const credits = Number(estimatedCredits);
      if (isNaN(credits) || credits < 0 || credits > 1000000) {
        throw new Error(
          "Estimated credits must be a number between 0 and 1,000,000"
        );
      }
    }

    return true;
  }

  /**
   * Upload document to IPFS and register on blockchain
   * @param {File} file - File to upload
   * @param {Object} metadata - Document metadata
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result with document ID and transaction info
   */
  async uploadDocument(file, metadata, options = {}) {
    try {
      // Get current user
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be authenticated to upload documents");
      }

      // Check user permissions
      if (!authService.hasPermission("upload_document")) {
        throw new Error("User does not have permission to upload documents");
      }

      // Validate file
      this.validateFile(file);

      // Validate metadata
      this.validateMetadata(metadata);

      console.log("📤 Starting document upload process...", {
        fileName: file.name,
        fileSize: file.size,
        projectName: metadata.projectName,
        userRole: currentUser.accountType,
      });

      // Show loading notification
      const loadingToastId = toastNotifications.loading(
        "Uploading document to IPFS...",
        {
          roleSpecific: true,
          operation: "document_upload",
        }
      );

      // Step 1: Upload file to IPFS with retry logic
      let ipfsResult;
      try {
        ipfsResult = await retryService.executeWithRetry(
          () => ipfsService.uploadFile(file),
          {
            maxRetries: 3,
            retryableErrors: ["NETWORK_ERROR", "TIMEOUT_ERROR", "IPFS_ERROR"],
          }
        );
      } catch (ipfsError) {
        toastNotifications.dismiss(loadingToastId);

        // Enhanced IPFS error handling
        const processedError = errorHandler.handleIPFSError(ipfsError, {
          fileName: file.name,
          fileSize: file.size,
          userRole: currentUser.accountType,
          retryAction: () => ipfsService.uploadFile(file),
        });

        throw processedError.error;
      }

      console.log("📁 File uploaded to IPFS:", {
        cid: ipfsResult.cid,
        url: ipfsResult.url,
        isMock: ipfsResult.isMock,
      });

      // Step 2: Prepare document data for blockchain registration
      const documentData = {
        cid: ipfsResult.cid,
        projectName: metadata.projectName,
        projectType: metadata.projectType || "",
        description: metadata.description || "",
        location: metadata.location || "",
        estimatedCredits: Number(metadata.estimatedCredits || 0),
      };

      // Update loading message
      toastNotifications.dismiss(loadingToastId);
      const blockchainLoadingId = toastNotifications.loading(
        "Registering document on blockchain...",
        {
          roleSpecific: true,
          operation: "document_upload",
        }
      );

      // Step 3: Register document on blockchain with retry logic
      let blockchainResult = null;
      let documentId = null;

      try {
        blockchainResult = await retryService.executeWithRetry(
          () => blockchainService.registerDocument(documentData),
          {
            maxRetries: 2,
            retryableErrors: ["NETWORK_ERROR", "BLOCKCHAIN_CONGESTION"],
          }
        );
        documentId = blockchainResult.documentId;

        console.log("⛓️ Document registered on blockchain:", {
          documentId,
          transactionHash: blockchainResult.hash,
        });
      } catch (blockchainError) {
        console.warn(
          "⚠️ Blockchain registration failed, storing locally:",
          blockchainError.message
        );

        // Enhanced blockchain error handling with role-specific guidance
        errorHandler.handleBlockchainError(
          blockchainError,
          "document_registration",
          {
            documentCid: ipfsResult.cid,
            projectName: metadata.projectName,
            userRole: currentUser.accountType,
            retryAction: () => blockchainService.registerDocument(documentData),
          }
        );

        // Generate local document ID if blockchain fails
        documentId = `local_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
      } finally {
        toastNotifications.dismiss(blockchainLoadingId);
      }

      // Step 4: Create local document record
      const documentRecord = {
        id: documentId,
        cid: ipfsResult.cid,
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedBy: currentUser.walletAddress || currentUser.email,
        uploaderType: currentUser.accountType,
        uploaderName: currentUser.name,
        uploaderEmail: currentUser.email,
        projectName: metadata.projectName,
        projectType: metadata.projectType || "",
        description: metadata.description || "",
        location: metadata.location || "",
        estimatedCredits: Number(metadata.estimatedCredits || 0),
        status: DOCUMENT_STATUS.PENDING,
        ipfsUrl: ipfsResult.url,
        isMockIPFS: ipfsResult.isMock || false,

        // Attestation info (initially empty)
        attestation: {
          verifierAddress: null,
          attestedAt: null,
          signature: null,
          gsProjectId: null,
          gsSerial: null,
        },

        // Minting info (initially empty)
        mintingResult: {
          tokenId: null,
          amount: null,
          transactionHash: null,
          mintedAt: null,
        },

        // Blockchain info
        blockchainRegistered: !!blockchainResult,
        transactionHash: blockchainResult?.hash || null,
        blockchainDocumentId: blockchainResult?.documentId || null,

        // Timestamps
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Step 5: Save document record locally
      this.documents.set(documentId, documentRecord);
      this.saveToStorage();

      console.log("✅ Document upload completed successfully:", {
        documentId,
        status: documentRecord.status,
        blockchainRegistered: documentRecord.blockchainRegistered,
      });

      // Show success notification
      toastNotifications.documentUploadSuccess(
        documentRecord.filename,
        currentUser.accountType
      );

      return {
        success: true,
        documentId,
        document: documentRecord,
        ipfs: ipfsResult,
        blockchain: blockchainResult,
        message: blockchainResult
          ? "Document uploaded and registered on blockchain successfully"
          : "Document uploaded to IPFS successfully (blockchain registration pending)",
      };
    } catch (error) {
      console.error("❌ Document upload failed:", error);

      // Use enhanced error handler for document uploads
      const processedError = errorHandler.handleDocumentUploadError(
        error,
        currentUser?.accountType || "guest",
        {
          fileName: file.name,
          fileSize: file.size,
          projectName: metadata.projectName,
          retryAction: () => this.uploadDocument(file, metadata, options),
        }
      );

      // Show error notification
      toastNotifications.documentUploadError(
        processedError.message.message || error.message,
        currentUser?.accountType || "guest"
      );

      throw processedError.error;
    }
  }

  /**
   * Get all documents for verifier dashboard
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of all documents
   */
  async getDocumentsForVerifier(filters = {}) {
    try {
      // Check if user is a verifier
      if (!authService.isVerifier()) {
        throw new Error("Only verifiers can access all documents");
      }

      console.log("📋 Fetching documents for verifier dashboard...");

      let documents = [];

      // Try to get documents from blockchain first
      try {
        const blockchainDocs = await blockchainService.getAllDocuments();

        // Merge with local documents to get additional metadata
        documents = blockchainDocs.map((blockchainDoc) => {
          const localDoc =
            this.documents.get(blockchainDoc.id?.toString()) ||
            this.documents.get(blockchainDoc.cid);

          return {
            ...blockchainDoc,
            // Add local metadata if available
            filename: localDoc?.filename || "Unknown",
            fileSize: localDoc?.fileSize || 0,
            mimeType: localDoc?.mimeType || "application/octet-stream",
            uploaderName: localDoc?.uploaderName || "Unknown",
            uploaderEmail: localDoc?.uploaderEmail || "Unknown",
            ipfsUrl:
              localDoc?.ipfsUrl || `https://w3s.link/ipfs/${blockchainDoc.cid}`,
            isMockIPFS: localDoc?.isMockIPFS || false,

            // Map blockchain status to our status enum
            status: blockchainDoc.isAttested
              ? DOCUMENT_STATUS.ATTESTED
              : DOCUMENT_STATUS.PENDING,

            // Use blockchain data as primary source
            uploaderType: this.getUserTypeFromAddress(blockchainDoc.uploader),
            blockchainRegistered: true,
            source: "blockchain",
          };
        });

        console.log(
          `📋 Retrieved ${documents.length} documents from blockchain`
        );
      } catch (blockchainError) {
        console.warn(
          "⚠️ Failed to fetch from blockchain, using local documents:",
          blockchainError.message
        );

        // Fallback to local documents
        documents = Array.from(this.documents.values()).map((doc) => ({
          ...doc,
          source: "local",
        }));
      }

      // Add any local-only documents that aren't on blockchain
      const localOnlyDocs = Array.from(this.documents.values())
        .filter((localDoc) => !localDoc.blockchainRegistered)
        .map((doc) => ({
          ...doc,
          source: "local_only",
        }));

      documents = [...documents, ...localOnlyDocs];

      // Apply filters
      if (filters.status) {
        documents = documents.filter((doc) => doc.status === filters.status);
      }

      if (filters.uploaderType) {
        documents = documents.filter(
          (doc) => doc.uploaderType === filters.uploaderType
        );
      }

      if (filters.projectType) {
        documents = documents.filter((doc) =>
          doc.projectType
            ?.toLowerCase()
            .includes(filters.projectType.toLowerCase())
        );
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        documents = documents.filter(
          (doc) =>
            doc.projectName?.toLowerCase().includes(searchTerm) ||
            doc.description?.toLowerCase().includes(searchTerm) ||
            doc.uploaderName?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by creation date (newest first)
      documents.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || a.createdAt);
        const dateB = new Date(b.uploadedAt || b.createdAt);
        return dateB - dateA;
      });

      console.log(`📋 Returning ${documents.length} documents after filtering`);
      return documents;
    } catch (error) {
      console.error("❌ Failed to get documents for verifier:", error);

      if (error.message.includes("Only verifiers")) {
        throw error;
      }

      throw new Error(`Failed to fetch documents: ${error.message}`);
    }
  }

  /**
   * Get documents uploaded by current user
   * @returns {Promise<Array>} Array of user's documents
   */
  async getUserDocuments() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error("User must be authenticated to view documents");
      }

      console.log("📋 Fetching documents for current user...");

      let userDocuments = [];

      // Try to get user documents from blockchain first
      if (currentUser.walletAddress) {
        try {
          const blockchainDocs = await blockchainService.getUserDocuments(
            currentUser.walletAddress
          );

          // Merge with local documents
          userDocuments = blockchainDocs.map((blockchainDoc) => {
            const localDoc = this.documents.get(blockchainDoc.cid);

            return {
              ...blockchainDoc,
              filename: localDoc?.filename || "Unknown",
              fileSize: localDoc?.fileSize || 0,
              mimeType: localDoc?.mimeType || "application/octet-stream",
              ipfsUrl:
                localDoc?.ipfsUrl ||
                `https://w3s.link/ipfs/${blockchainDoc.cid}`,
              isMockIPFS: localDoc?.isMockIPFS || false,
              status: blockchainDoc.isAttested
                ? DOCUMENT_STATUS.ATTESTED
                : DOCUMENT_STATUS.PENDING,
              blockchainRegistered: true,
              source: "blockchain",
            };
          });
        } catch (blockchainError) {
          console.warn(
            "⚠️ Failed to fetch user documents from blockchain:",
            blockchainError.message
          );
        }
      }

      // Add local documents for this user
      const localUserDocs = Array.from(this.documents.values())
        .filter(
          (doc) =>
            doc.uploadedBy === currentUser.walletAddress ||
            doc.uploadedBy === currentUser.email ||
            doc.uploaderEmail === currentUser.email
        )
        .map((doc) => ({
          ...doc,
          source: doc.blockchainRegistered ? "blockchain" : "local",
        }));

      // Merge and deduplicate
      const allUserDocs = [...userDocuments, ...localUserDocs];
      const uniqueDocs = allUserDocs.filter(
        (doc, index, self) => index === self.findIndex((d) => d.cid === doc.cid)
      );

      // Sort by creation date (newest first)
      uniqueDocs.sort((a, b) => {
        const dateA = new Date(a.uploadedAt || a.createdAt);
        const dateB = new Date(b.uploadedAt || b.createdAt);
        return dateB - dateA;
      });

      console.log(`📋 Retrieved ${uniqueDocs.length} documents for user`);
      return uniqueDocs;
    } catch (error) {
      console.error("❌ Failed to get user documents:", error);
      throw new Error(`Failed to fetch your documents: ${error.message}`);
    }
  }

  /**
   * Get a specific document by ID
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Document details
   */
  async getDocument(documentId) {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      console.log(`📄 Fetching document: ${documentId}`);

      // Try local storage first
      let document = this.documents.get(documentId);

      // If not found locally, try blockchain
      if (!document) {
        try {
          const blockchainDoc = await blockchainService.getDocument(documentId);
          if (blockchainDoc) {
            document = {
              ...blockchainDoc,
              filename: "Unknown",
              fileSize: 0,
              mimeType: "application/octet-stream",
              uploaderName: "Unknown",
              uploaderEmail: "Unknown",
              ipfsUrl: `https://w3s.link/ipfs/${blockchainDoc.cid}`,
              isMockIPFS: false,
              status: blockchainDoc.isAttested
                ? DOCUMENT_STATUS.ATTESTED
                : DOCUMENT_STATUS.PENDING,
              uploaderType: this.getUserTypeFromAddress(blockchainDoc.uploader),
              blockchainRegistered: true,
              source: "blockchain",
            };
          }
        } catch (blockchainError) {
          console.warn(
            "⚠️ Failed to fetch document from blockchain:",
            blockchainError.message
          );
        }
      }

      if (!document) {
        throw new Error("Document not found");
      }

      return document;
    } catch (error) {
      console.error("❌ Failed to get document:", error);
      throw new Error(`Failed to fetch document: ${error.message}`);
    }
  }

  /**
   * Update document status
   * @param {string} documentId - Document ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Updated document
   */
  async updateDocumentStatus(documentId, status, additionalData = {}) {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      if (!Object.values(DOCUMENT_STATUS).includes(status)) {
        throw new Error("Invalid document status");
      }

      console.log(`📝 Updating document ${documentId} status to: ${status}`);

      const document = this.documents.get(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Update document
      const updatedDocument = {
        ...document,
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData,
      };

      this.documents.set(documentId, updatedDocument);
      this.saveToStorage();

      console.log(`✅ Document status updated successfully`);
      return updatedDocument;
    } catch (error) {
      console.error("❌ Failed to update document status:", error);
      throw new Error(`Failed to update document: ${error.message}`);
    }
  }

  /**
   * Get document statistics
   * @returns {Promise<Object>} Document statistics
   */
  async getDocumentStats() {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        return {
          total: 0,
          pending: 0,
          attested: 0,
          minted: 0,
          rejected: 0,
        };
      }

      let documents = [];

      if (authService.isVerifier()) {
        documents = await this.getDocumentsForVerifier();
      } else {
        documents = await this.getUserDocuments();
      }

      const stats = {
        total: documents.length,
        pending: documents.filter(
          (doc) => doc.status === DOCUMENT_STATUS.PENDING
        ).length,
        attested: documents.filter(
          (doc) => doc.status === DOCUMENT_STATUS.ATTESTED
        ).length,
        minted: documents.filter((doc) => doc.status === DOCUMENT_STATUS.MINTED)
          .length,
        rejected: documents.filter(
          (doc) => doc.status === DOCUMENT_STATUS.REJECTED
        ).length,
      };

      return stats;
    } catch (error) {
      console.error("❌ Failed to get document stats:", error);
      return {
        total: 0,
        pending: 0,
        attested: 0,
        minted: 0,
        rejected: 0,
      };
    }
  }

  /**
   * Attest a document (verifier only)
   * @param {string} documentId - Document ID
   * @param {Object} attestationData - Attestation data including signature
   * @returns {Promise<Object>} Updated document with attestation info
   */
  async attestDocument(documentId, attestationData) {
    try {
      // Check if user is authenticated and is a verifier
      if (!authService.isUserAuthenticated()) {
        throw new Error("Please log in to attest documents");
      }

      if (!authService.isVerifier()) {
        throw new Error("Only verifiers can attest documents");
      }

      if (!documentId) {
        throw new Error("Document ID is required");
      }

      if (!attestationData) {
        throw new Error("Attestation data is required");
      }

      console.log(`🔍 Attesting document: ${documentId}`);

      // Get the document
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Check if document is already attested
      if (document.status === DOCUMENT_STATUS.ATTESTED) {
        throw new Error("Document has already been attested");
      }

      if (document.status === DOCUMENT_STATUS.MINTED) {
        throw new Error("Document has already been minted");
      }

      if (document.status === DOCUMENT_STATUS.REJECTED) {
        throw new Error("Document has been rejected and cannot be attested");
      }

      const currentUser = authService.getCurrentUser();
      const verifierAddress = currentUser.walletAddress;

      if (!verifierAddress) {
        throw new Error("Verifier wallet address not found");
      }

      // Try to attest on blockchain first
      let blockchainResult = null;
      try {
        if (document.blockchainRegistered && document.blockchainDocumentId) {
          blockchainResult = await blockchainService.attestDocument(
            document.blockchainDocumentId
          );
          console.log("⛓️ Document attested on blockchain:", blockchainResult);
        }
      } catch (blockchainError) {
        console.warn(
          "⚠️ Blockchain attestation failed:",
          blockchainError.message
        );
        // Continue with local attestation even if blockchain fails
      }

      // Update local document record
      const attestationInfo = {
        verifierAddress,
        attestedAt: new Date().toISOString(),
        signature: attestationData.signature,
        gsProjectId: attestationData.gsProjectId,
        gsSerial: attestationData.gsSerial,
        amount: attestationData.amount,
        blockchainAttested: !!blockchainResult,
        blockchainTransactionHash: blockchainResult?.hash || null,
      };

      const updatedDocument = await this.updateDocumentStatus(
        documentId,
        DOCUMENT_STATUS.ATTESTED,
        {
          attestation: attestationInfo,
        }
      );

      console.log("✅ Document attestation completed successfully");

      return {
        success: true,
        document: updatedDocument,
        blockchain: blockchainResult,
        message: blockchainResult
          ? "Document attested successfully on blockchain"
          : "Document attested locally (blockchain attestation pending)",
      };
    } catch (error) {
      console.error("❌ Document attestation failed:", error);

      // Provide user-friendly error messages
      if (error.message.includes("Only verifiers")) {
        throw error;
      }

      if (error.message.includes("already been attested")) {
        throw error;
      }

      if (error.message.includes("not found")) {
        throw error;
      }

      throw new Error(`Attestation failed: ${error.message}`);
    }
  }

  /**
   * Helper method to determine user type from wallet address
   * @param {string} address - Wallet address
   * @returns {string} User type
   */
  getUserTypeFromAddress(address) {
    // Try to find user in local storage by wallet address
    const users = Array.from(authService.users?.values() || []);
    const user = users.find((u) => u.walletAddress === address);
    return user?.accountType || "individual";
  }

  /**
   * Get allowed file types
   * @returns {Array} Array of allowed MIME types
   */
  getAllowedFileTypes() {
    return [...ALLOWED_FILE_TYPES];
  }

  /**
   * Get maximum file size
   * @returns {number} Maximum file size in bytes
   */
  getMaxFileSize() {
    return MAX_FILE_SIZE;
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Update document with minting information
   * @param {string} documentId - Document ID
   * @param {Object} mintingData - Minting result data
   * @returns {Promise<Object>} Updated document
   */
  async updateDocumentMinting(documentId, mintingData) {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      if (!mintingData) {
        throw new Error("Minting data is required");
      }

      console.log(`🪙 Updating document ${documentId} with minting data`);

      const document = this.documents.get(documentId);
      if (!document) {
        throw new Error("Document not found");
      }

      // Check if document is already minted
      if (document.status === DOCUMENT_STATUS.MINTED) {
        throw new Error("Document has already been minted");
      }

      // Check if document is attested
      if (document.status !== DOCUMENT_STATUS.ATTESTED) {
        throw new Error("Document must be attested before minting");
      }

      // Update document with minting information
      const updatedDocument = await this.updateDocumentStatus(
        documentId,
        DOCUMENT_STATUS.MINTED,
        {
          mintingResult: {
            transactionHash: mintingData.transactionHash,
            mintedAt: mintingData.mintedAt || new Date().toISOString(),
            mintedBy: mintingData.mintedBy,
            amount: mintingData.amount,
            recipient: mintingData.recipient,
            tokenId: mintingData.tokenId || null,
          },
        }
      );

      console.log(`✅ Document minting information updated successfully`);
      return updatedDocument;
    } catch (error) {
      console.error("❌ Failed to update document minting:", error);
      throw new Error(`Failed to update minting information: ${error.message}`);
    }
  }

  /**
   * Check if document can be minted
   * @param {string} documentId - Document ID
   * @returns {Promise<Object>} Minting eligibility status
   */
  async canDocumentBeMinted(documentId) {
    try {
      if (!documentId) {
        throw new Error("Document ID is required");
      }

      const document = await this.getDocument(documentId);
      if (!document) {
        return {
          canMint: false,
          reason: "Document not found",
        };
      }

      // Check if already minted
      if (document.status === DOCUMENT_STATUS.MINTED) {
        return {
          canMint: false,
          reason: "Document has already been minted",
        };
      }

      // Check if attested
      if (document.status !== DOCUMENT_STATUS.ATTESTED) {
        return {
          canMint: false,
          reason: "Document must be attested before minting",
        };
      }

      // Check if attestation data exists
      if (!document.attestation || !document.attestation.signature) {
        return {
          canMint: false,
          reason: "Document attestation data is incomplete",
        };
      }

      return {
        canMint: true,
        reason: "Document is eligible for minting",
      };
    } catch (error) {
      console.error("❌ Failed to check minting eligibility:", error);
      return {
        canMint: false,
        reason: `Error checking eligibility: ${error.message}`,
      };
    }
  }

  /**
   * Check if service is properly configured
   * @returns {Object} Configuration status
   */
  getServiceStatus() {
    const ipfsStatus = ipfsService.getUploadStatus();
    const blockchainConfigured = blockchainService.isConfigured();

    return {
      ipfs: ipfsStatus,
      blockchain: {
        status: blockchainConfigured ? "ready" : "warning",
        message: blockchainConfigured
          ? "Blockchain service configured"
          : "Blockchain service not fully configured - documents will be stored locally",
      },
      overall: {
        status: ipfsStatus.status === "ready" ? "ready" : "warning",
        message:
          ipfsStatus.status === "ready"
            ? "Document service ready"
            : "Document service partially configured",
      },
    };
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
