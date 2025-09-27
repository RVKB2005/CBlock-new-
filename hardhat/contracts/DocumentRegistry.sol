// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "./VerifierRegistry.sol";

/**
 * @title DocumentRegistry
 * @dev Contract for registering and attesting documents in the carbon credit verification system
 */
contract DocumentRegistry {
    struct Document {
        string cid;                 // IPFS Content Identifier
        address uploader;           // Address of the user who uploaded the document
        string projectName;         // Name of the carbon credit project
        string projectType;         // Type of project (e.g., "reforestation", "renewable-energy")
        string description;         // Project description
        string location;            // Project location
        uint256 estimatedCredits;   // Estimated number of credits
        uint256 timestamp;          // When the document was registered
        bool isAttested;            // Whether the document has been attested by a verifier
        address verifier;           // Address of the verifier who attested (if any)
        uint256 attestedAt;         // Timestamp when attested
    }

    // State variables
    VerifierRegistry public immutable verifierRegistry;
    mapping(uint256 => Document) public documents;
    mapping(address => uint256[]) public userDocuments;
    uint256 public nextDocumentId;

    // Events
    event DocumentRegistered(
        uint256 indexed documentId,
        address indexed uploader,
        string cid,
        string projectName
    );
    
    event DocumentAttested(
        uint256 indexed documentId,
        address indexed verifier,
        uint256 attestedAt
    );

    // Custom errors for gas efficiency
    error NotVerifier();
    error DocumentNotFound();
    error DocumentAlreadyAttested();
    error EmptyCID();
    error EmptyProjectName();

    /**
     * @dev Constructor sets the verifier registry address
     * @param _verifierRegistry Address of the VerifierRegistry contract
     */
    constructor(address _verifierRegistry) {
        verifierRegistry = VerifierRegistry(_verifierRegistry);
        nextDocumentId = 1; // Start document IDs from 1
    }

    /**
     * @dev Modifier to check if caller is a registered verifier
     */
    modifier onlyVerifier() {
        if (!verifierRegistry.isVerifier(msg.sender)) {
            revert NotVerifier();
        }
        _;
    }

    /**
     * @dev Register a new document
     * @param cid IPFS Content Identifier of the document
     * @param projectName Name of the carbon credit project
     * @param projectType Type of the project
     * @param description Project description
     * @param location Project location
     * @param estimatedCredits Estimated number of credits for this project
     * @return documentId The ID of the newly registered document
     */
    function registerDocument(
        string calldata cid,
        string calldata projectName,
        string calldata projectType,
        string calldata description,
        string calldata location,
        uint256 estimatedCredits
    ) external returns (uint256 documentId) {
        if (bytes(cid).length == 0) {
            revert EmptyCID();
        }
        if (bytes(projectName).length == 0) {
            revert EmptyProjectName();
        }

        documentId = nextDocumentId++;

        documents[documentId] = Document({
            cid: cid,
            uploader: msg.sender,
            projectName: projectName,
            projectType: projectType,
            description: description,
            location: location,
            estimatedCredits: estimatedCredits,
            timestamp: block.timestamp,
            isAttested: false,
            verifier: address(0),
            attestedAt: 0
        });

        userDocuments[msg.sender].push(documentId);

        emit DocumentRegistered(documentId, msg.sender, cid, projectName);
    }

    /**
     * @dev Attest a document (verifier only)
     * @param documentId ID of the document to attest
     */
    function attestDocument(uint256 documentId) external onlyVerifier {
        Document storage doc = documents[documentId];
        
        if (doc.uploader == address(0)) {
            revert DocumentNotFound();
        }
        if (doc.isAttested) {
            revert DocumentAlreadyAttested();
        }

        doc.isAttested = true;
        doc.verifier = msg.sender;
        doc.attestedAt = block.timestamp;

        emit DocumentAttested(documentId, msg.sender, block.timestamp);
    }

    /**
     * @dev Get all documents (for verifier dashboard)
     * @return allDocs Array of all registered documents
     */
    function getAllDocuments() external view returns (Document[] memory allDocs) {
        uint256 totalDocs = nextDocumentId - 1;
        allDocs = new Document[](totalDocs);
        
        for (uint256 i = 1; i <= totalDocs; i++) {
            allDocs[i - 1] = documents[i];
        }
    }

    /**
     * @dev Get documents uploaded by a specific user
     * @param user Address of the user
     * @return userDocs Array of document IDs uploaded by the user
     */
    function getUserDocuments(address user) external view returns (uint256[] memory userDocs) {
        return userDocuments[user];
    }

    /**
     * @dev Get documents uploaded by a specific user with full details
     * @param user Address of the user
     * @return userDocs Array of documents uploaded by the user
     */
    function getUserDocumentsWithDetails(address user) external view returns (Document[] memory userDocs) {
        uint256[] memory docIds = userDocuments[user];
        userDocs = new Document[](docIds.length);
        
        for (uint256 i = 0; i < docIds.length; i++) {
            userDocs[i] = documents[docIds[i]];
        }
    }

    /**
     * @dev Get a specific document by ID
     * @param documentId ID of the document
     * @return doc The document details
     */
    function getDocument(uint256 documentId) external view returns (Document memory doc) {
        doc = documents[documentId];
        if (doc.uploader == address(0)) {
            revert DocumentNotFound();
        }
    }

    /**
     * @dev Get total number of registered documents
     * @return count Total number of documents
     */
    function getTotalDocuments() external view returns (uint256 count) {
        return nextDocumentId - 1;
    }

    /**
     * @dev Get documents by attestation status
     * @param attested Whether to get attested (true) or unattested (false) documents
     * @return filteredDocs Array of documents matching the attestation status
     */
    function getDocumentsByStatus(bool attested) external view returns (Document[] memory filteredDocs) {
        uint256 totalDocs = nextDocumentId - 1;
        uint256 count = 0;

        // First pass: count matching documents
        for (uint256 i = 1; i <= totalDocs; i++) {
            if (documents[i].isAttested == attested) {
                count++;
            }
        }

        // Second pass: populate array
        filteredDocs = new Document[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= totalDocs; i++) {
            if (documents[i].isAttested == attested) {
                filteredDocs[index] = documents[i];
                index++;
            }
        }
    }
}