# Requirements Document

## Introduction

This feature implements a role-based document verification system that separates document upload capabilities from verification and minting functions. The system supports three distinct user roles: Individual users, Business users, and Verifiers. Individual and Business users can upload documents that are stored on IPFS, while Verifiers have exclusive access to perform attestations and mint credits that are automatically allocated to the document uploaders.

## Requirements

### Requirement 1

**User Story:** As an Individual user, I want to upload documents to the Mint Credits page so that I can submit my documents for verification and potential credit minting.

#### Acceptance Criteria

1. WHEN an Individual user accesses the Mint Credits page THEN the system SHALL display only document upload functionality
2. WHEN an Individual user uploads a document THEN the system SHALL store the document on IPFS and generate a corresponding CID
3. WHEN an Individual user is on the Mint Credits page THEN the system SHALL NOT display any minting or attestation controls
4. WHEN a document upload is successful THEN the system SHALL associate the document with the Individual user's account
5. IF a document upload fails THEN the system SHALL display an appropriate error message to the Individual user

### Requirement 2

**User Story:** As a Business user, I want to upload documents to the Mint Credits page so that I can submit my business documents for verification and potential credit minting.

#### Acceptance Criteria

1. WHEN a Business user accesses the Mint Credits page THEN the system SHALL display only document upload functionality
2. WHEN a Business user uploads a document THEN the system SHALL store the document on IPFS and generate a corresponding CID
3. WHEN a Business user is on the Mint Credits page THEN the system SHALL NOT display any minting or attestation controls
4. WHEN a document upload is successful THEN the system SHALL associate the document with the Business user's account
5. IF a document upload fails THEN the system SHALL display an appropriate error message to the Business user

### Requirement 3

**User Story:** As a Verifier, I want to view all uploaded documents from Individual and Business users so that I can review and process them for attestation.

#### Acceptance Criteria

1. WHEN a Verifier accesses the Verifier Dashboard THEN the system SHALL display all documents uploaded by Individual and Business users
2. WHEN displaying documents THEN the system SHALL show the document source (Individual or Business account)
3. WHEN displaying documents THEN the system SHALL show the document CID and relevant metadata
4. WHEN a new document is uploaded by any user THEN the system SHALL make it immediately available in the Verifier Dashboard
5. IF no documents are available THEN the system SHALL display an appropriate message indicating no documents to review

### Requirement 4

**User Story:** As a Verifier, I want to perform attestation on uploaded documents so that I can verify their authenticity and approve them for credit minting.

#### Acceptance Criteria

1. WHEN a Verifier selects a document THEN the system SHALL provide attestation functionality
2. WHEN a Verifier performs attestation THEN the system SHALL record the attestation status and timestamp
3. WHEN attestation is successful THEN the system SHALL enable minting functionality for that document
4. WHEN attestation fails THEN the system SHALL record the failure reason and prevent minting
5. IF a document has already been attested THEN the system SHALL display the current attestation status

### Requirement 5

**User Story:** As a Verifier, I want to mint tokens for successfully attested documents so that verified users can receive their credits.

#### Acceptance Criteria

1. WHEN a Verifier attempts to mint tokens THEN the system SHALL verify that attestation was successful
2. WHEN minting is initiated THEN the system SHALL create the appropriate number of tokens
3. WHEN minting is successful THEN the system SHALL automatically allocate credits to the document uploader's account
4. WHEN minting is complete THEN the system SHALL update the document status to prevent duplicate minting
5. IF minting fails THEN the system SHALL display an error message and maintain the document's attestation status

### Requirement 6

**User Story:** As an Individual or Business user, I want to automatically receive credits when my documents are successfully verified and minted so that I can access my earned credits without manual intervention.

#### Acceptance Criteria

1. WHEN a Verifier successfully mints tokens for a document THEN the system SHALL automatically credit the associated user account
2. WHEN credits are allocated THEN the system SHALL update the user's credit balance immediately
3. WHEN credits are allocated THEN the system SHALL create a transaction record linking the document to the credit allocation
4. WHEN a user checks their account THEN the system SHALL display their current credit balance including newly allocated credits
5. IF credit allocation fails THEN the system SHALL log the error and allow for manual retry by the Verifier

### Requirement 7

**User Story:** As a system administrator, I want role-based access controls to ensure that users can only access functionality appropriate to their role so that system security and workflow integrity are maintained.

#### Acceptance Criteria

1. WHEN any user logs in THEN the system SHALL identify their role (Individual, Business, or Verifier)
2. WHEN a user accesses a page THEN the system SHALL display only functionality appropriate to their role
3. WHEN an Individual or Business user attempts to access Verifier functions THEN the system SHALL deny access
4. WHEN a Verifier attempts to upload documents THEN the system SHALL redirect them to the Verifier Dashboard
5. IF a user's role cannot be determined THEN the system SHALL require re-authentication
