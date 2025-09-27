# Implementation Plan

- [x] 1. Enhance authentication service with role management

  - Extend AuthService class to include role-based permission checking methods
  - Add getUserRole(), hasPermission(), and isVerifier() methods to existing auth service
  - Update user registration to support accountType field with validation
  - Create role permission constants and validation logic
  - _Requirements: 7.1, 7.2_

- [x] 2. Create role-based route guards and access controls

  - Implement RoleGuard component that checks user permissions before rendering content
  - Create AccessDenied component for unauthorized access attempts
  - Add role-based navigation logic to prevent unauthorized page access
  - Implement permission checking utilities for frontend components
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Implement DocumentRegistry smart contract

  - Create DocumentRegistry.sol contract with document registration and attestation functions
  - Add registerDocument function to store document metadata on-chain
  - Implement attestDocument function with verifier-only access control
  - Add getAllDocuments and getUserDocuments view functions for querying
  - Write comprehensive unit tests for all contract functions
  - _Requirements: 1.2, 2.2, 3.1, 3.2_

- [x] 4. Enhance blockchain service for document management

  - Extend BlockchainService class with document registry interaction methods
  - Add registerDocument method to interact with DocumentRegistry contract
  - Implement getAllDocuments method to fetch documents for verifier dashboard
  - Add document status tracking and metadata management functions
  - Create error handling for blockchain document operations
  - _Requirements: 1.2, 2.2, 3.1, 3.2_

- [x] 5. Create document management service

  - Implement DocumentService class for IPFS upload and metadata management
  - Add uploadDocument method that handles IPFS storage and blockchain registration
  - Create getDocumentsForVerifier method to fetch all pending documents
  - Implement document status tracking and user association logic
  - Add file validation and error handling for document operations
  - _Requirements: 1.2, 1.4, 2.2, 2.4, 3.1, 3.3_

- [x] 6. Modify Mint Credits page for role-based functionality

  - Update MintCreditsPage component to check user role and render appropriate interface
  - Hide minting and attestation controls for Individual and Business users
  - Show only document upload functionality for non-verifier users
  - Add role-based redirects to send verifiers to their dashboard
  - Implement user-friendly messaging explaining role-specific limitations
  - _Requirements: 1.1, 1.3, 2.1, 2.3, 7.2_

- [x] 7. Create Verifier Dashboard component

  - Build VerifierDashboard component to display all uploaded documents
  - Implement document list with filtering, search, and pagination capabilities
  - Add document details view showing uploader information and metadata
  - Create attestation workflow interface with form validation
  - Display document source (Individual or Business account) clearly
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 8. Implement attestation functionality in Verifier Dashboard

  - Add attestation form with EIP-712 signature generation
  - Implement attestDocument method that creates and submits attestations
  - Add attestation status tracking and timestamp recording
  - Create validation for attestation data and verifier permissions
  - Implement error handling for failed attestations with user feedback
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 9. Implement minting functionality for verified documents

  - Add minting controls to Verifier Dashboard for attested documents
  - Extend existing mintWithAttestation to include document tracking
  - Implement automatic credit allocation to original document uploader
  - Add minting status tracking and transaction hash recording
  - Create validation to prevent duplicate minting of same document
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Implement automatic credit allocation system

  - Modify minting process to automatically send credits to document uploader
  - Add credit allocation tracking and transaction record creation
  - Implement user balance updates when credits are allocated
  - Create notification system to inform users when credits are received
  - Add error handling and retry mechanism for failed credit allocations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Enhance document upload component for all user types

  - Update Upload component to work with new DocumentService
  - Add IPFS upload progress tracking and user feedback
  - Implement file validation for supported document types and sizes
  - Add metadata collection form for project details
  - Create user association logic to link documents with uploaders
  - _Requirements: 1.2, 1.4, 1.5, 2.2, 2.4, 2.5_

- [x] 12. Add navigation and routing for role-based access

  - Update main navigation to show role-appropriate menu items
  - Add routing logic to redirect users based on their role
  - Implement breadcrumb navigation for verifier workflow
  - Create role-based landing pages after login
  - Add visual indicators showing current user role and permissions
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 13. Implement comprehensive error handling and user feedback

  - Add role-specific error messages and user guidance
  - Implement toast notifications for document upload status
  - Create error boundaries for role-based component failures
  - Add loading states for document operations and blockchain transactions
  - Implement retry mechanisms for failed IPFS uploads and blockchain calls
  - _Requirements: 1.5, 2.5, 4.4, 5.5, 6.5_

- [x] 14. Create user dashboard enhancements for credit tracking

  - Add credit balance display showing allocated credits from verified documents
  - Implement transaction history showing credit allocations and sources
  - Create document status tracking for uploaded documents
  - Add portfolio view showing user's document verification progress
  - Implement real-time updates when credits are allocated
  - _Requirements: 6.3, 6.4_

- [x] 15. Deploy and configure smart contracts

  - Deploy DocumentRegistry contract to blockchain network
  - Update contract addresses in frontend configuration
  - Configure verifier permissions in VerifierRegistry contract
  - Test contract interactions with frontend integration
  - Update ABI files and blockchain service configurations
  - _Requirements: 3.1, 4.1, 5.1_

- [x] 16. Write comprehensive tests for role-based functionality

  - Create unit tests for RoleGuard component and permission checking
  - Write integration tests for document upload and verification workflow
  - Add end-to-end tests covering complete user journeys for each role
  - Implement smart contract tests for DocumentRegistry functionality
  - Create performance tests for document list loading and IPFS operations
  - _Requirements: All requirements - testing coverage_

- [x] 17. Add user role management and admin functionality

  - Create admin interface for managing user roles and verifier assignments
  - Implement role change functionality with proper validation
  - Add verifier credential management and verification
  - Create audit logging for role changes and administrative actions
  - Implement backup and recovery procedures for user role data
  - _Requirements: 7.5_
