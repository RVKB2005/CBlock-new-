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

        // Fix any documents missing uploadedBy field (for backward compatibility)
        setTimeout(() => {
          this.fixDocumentsMissingUploader();
        }, 1000); // Delay to ensure auth service is initialized
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
      if (!ipfsResult.cid) {
        throw new Error("IPFS upload did not return a valid CID");
      }

      const documentData = {
        cid: ipfsResult.cid,
        projectName: metadata.projectName,
        projectType: metadata.projectType || "",
        description: metadata.description || "",
        location: metadata.location || "",
        estimatedCredits: Number(metadata.estimatedCredits || 0),
      };

      console.log("📋 Document data for blockchain registration:", {
        cid: documentData.cid,
        projectName: documentData.projectName,
        hasValidCid: !!documentData.cid,
        cidLength: documentData.cid?.length,
      });

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

      // Get current user for error handling (in case it wasn't defined earlier)
      const currentUser = authService.getCurrentUser();

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

      // Load local documents first for faster response
      const localDocuments = Array.from(this.documents.values()).map((doc) => ({
        ...doc,
        source: doc.blockchainRegistered ? "blockchain" : "local",
      }));

      // If we have local documents, return them for fast loading
      if (localDocuments.length > 0) {
        console.log(
          `📋 Fast load: Retrieved ${localDocuments.length} documents from local storage`
        );
        documents = localDocuments;
      } else {
        // Only fetch from blockchain if no local documents
        try {
          const blockchainDocs = await blockchainService.getAllDocuments();

          // Merge with local documents to get additional metadata
          documents = blockchainDocs.map((blockchainDoc) => {
            // Try multiple ways to find the local document
            let localDoc =
              this.documents.get(blockchainDoc.id?.toString()) ||
              this.documents.get(blockchainDoc.cid) ||
              this.documents.get(blockchainDoc.id);

            // If not found by direct lookup, search by CID or ID match
            if (!localDoc) {
              for (const [key, doc] of this.documents.entries()) {
                if (
                  doc.cid === blockchainDoc.cid ||
                  doc.id === blockchainDoc.id ||
                  doc.id === blockchainDoc.id?.toString()
                ) {
                  localDoc = doc;
                  break;
                }
              }
            }

            return {
              ...blockchainDoc,
              // Add local metadata if available
              filename: localDoc?.filename || "Unknown",
              fileSize: localDoc?.fileSize || 0,
              mimeType: localDoc?.mimeType || "application/octet-stream",
              uploaderName: localDoc?.uploaderName || "Unknown",
              uploaderEmail: localDoc?.uploaderEmail || "Unknown",
              ipfsUrl:
                localDoc?.ipfsUrl ||
                `https://w3s.link/ipfs/${blockchainDoc.cid}`,
              isMockIPFS: localDoc?.isMockIPFS || false,

              // Map blockchain status to our status enum, but preserve local status if more advanced
              status:
                localDoc?.status &&
                (localDoc.status === DOCUMENT_STATUS.MINTED ||
                  localDoc.status === DOCUMENT_STATUS.REJECTED)
                  ? localDoc.status // Preserve minted/rejected status from local storage
                  : blockchainDoc.isAttested
                  ? DOCUMENT_STATUS.ATTESTED
                  : DOCUMENT_STATUS.PENDING,

              // Use blockchain data as primary source - FIX: Map uploader to uploadedBy
              uploadedBy: blockchainDoc.uploader || localDoc?.uploadedBy,
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

      // Debug: Check for documents without uploadedBy
      const documentsWithoutUploader = documents.filter(
        (doc) => !doc.uploadedBy
      );
      if (documentsWithoutUploader.length > 0) {
        console.warn(
          `⚠️ Found ${documentsWithoutUploader.length} documents without uploadedBy field:`,
          documentsWithoutUploader.map((doc) => ({
            id: doc.id,
            cid: doc.cid,
            source: doc.source,
          }))
        );
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
   * Fix documents that are missing uploadedBy field
   * This is a utility method to repair documents from older versions
   */
  fixDocumentsMissingUploader() {
    let fixedCount = 0;
    const currentUser = authService.getCurrentUser();

    if (!currentUser) {
      console.warn("Cannot fix documents: no current user");
      return fixedCount;
    }

    for (const [docId, document] of this.documents.entries()) {
      if (
        !document.uploadedBy &&
        document.uploaderEmail === currentUser.email
      ) {
        // This document belongs to the current user but is missing uploadedBy
        document.uploadedBy = currentUser.walletAddress || currentUser.email;
        document.updatedAt = new Date().toISOString();
        this.documents.set(docId, document);
        fixedCount++;
        console.log(
          `🔧 Fixed document ${docId}: added uploadedBy = ${document.uploadedBy}`
        );
      }
    }

    if (fixedCount > 0) {
      this.saveToStorage();
      console.log(`✅ Fixed ${fixedCount} documents missing uploadedBy field`);
    }

    return fixedCount;
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
              status:
                localDoc?.status &&
                (localDoc.status === DOCUMENT_STATUS.MINTED ||
                  localDoc.status === DOCUMENT_STATUS.REJECTED)
                  ? localDoc.status // Preserve minted/rejected status from local storage
                  : blockchainDoc.isAttested
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

      // Try to find document by ID first, then by CID, then by string conversion
      let document = this.documents.get(documentId);
      let actualKey = documentId;

      if (!document) {
        // Try converting to string if it's a number
        const stringId = documentId.toString();
        document = this.documents.get(stringId);
        if (document) {
          actualKey = stringId;
        }
      }

      if (!document) {
        // Try to find by CID if the documentId might be a CID
        for (const [key, doc] of this.documents.entries()) {
          if (doc.cid === documentId || doc.id === documentId) {
            document = doc;
            actualKey = key;
            break;
          }
        }
      }

      if (!document) {
        console.warn(`⚠️ Document not found in local storage: ${documentId}`);
        console.log(
          `📋 Available documents:`,
          Array.from(this.documents.keys())
        );

        // Create a minimal document record if it doesn't exist
        // This can happen when documents are registered on blockchain but not locally
        document = {
          id: documentId,
          cid: documentId, // Assume documentId might be a CID
          status: DOCUMENT_STATUS.PENDING,
          createdAt: new Date().toISOString(),
          uploadedBy: "unknown",
          filename: "Unknown Document",
          source: "blockchain",
        };
        actualKey = documentId;
        console.log(`📝 Created minimal document record for: ${documentId}`);
      }

      // Update document
      const updatedDocument = {
        ...document,
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData,
      };

      this.documents.set(actualKey, updatedDocument);
      this.saveToStorage();

      console.log(`✅ Document status updated successfully`);

      // Trigger refresh event for listening components
      this.triggerRefresh();

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
        nonce: attestationData.nonce, // ✅ Add nonce for minting
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

      // Trigger refresh event for listening components
      this.triggerRefresh();

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

      // Use the same lookup logic as updateDocumentStatus to find the document
      let document = this.documents.get(documentId);
      let actualKey = documentId;

      if (!document) {
        // Try converting to string if it's a number
        const stringId = documentId.toString();
        document = this.documents.get(stringId);
        if (document) {
          actualKey = stringId;
        }
      }

      if (!document) {
        // Try to find by CID if the documentId might be a CID
        for (const [key, doc] of this.documents.entries()) {
          if (doc.cid === documentId || doc.id === documentId) {
            document = doc;
            actualKey = key;
            break;
          }
        }
      }

      if (!document) {
        console.warn(`⚠️ Document not found for minting update: ${documentId}`);
        console.log(
          `📋 Available documents:`,
          Array.from(this.documents.keys())
        );
        throw new Error("Document not found");
      }

      // Check if document is already minted
      if (document.status === DOCUMENT_STATUS.MINTED) {
        console.log(
          `⚠️ Document ${documentId} is already minted, skipping update`
        );
        return document;
      }

      // Check if document is attested (allow minting from attested status)
      if (document.status !== DOCUMENT_STATUS.ATTESTED) {
        console.warn(
          `⚠️ Document ${documentId} status is ${document.status}, expected ATTESTED. Proceeding with minting update anyway.`
        );
      }

      // Update document with minting information
      const updatedDocument = await this.updateDocumentStatus(
        actualKey, // Use the actual key we found
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

      console.log(
        `✅ Document minting information updated successfully - Status: ${updatedDocument.status}`
      );

      // Trigger refresh event for listening components
      this.triggerRefresh();

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

  /**
   * Trigger a refresh event for components listening to document updates
   */
  triggerRefresh() {
    // Dispatch a custom event that components can listen to
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("documentsUpdated", {
          detail: {
            timestamp: new Date().toISOString(),
            totalDocuments: this.documents.size,
          },
        })
      );
    }
  }

  /**
   * Reset all document data to zero/empty state
   */
  resetAllData() {
    try {
      console.log("🔄 Resetting all document data...");

      // Clear all documents
      this.documents.clear();

      // Remove from localStorage
      localStorage.removeItem("cblock_documents");

      console.log("✅ All document data has been reset");
      return true;
    } catch (error) {
      console.error("❌ Failed to reset document data:", error);
      return false;
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export default documentService;
