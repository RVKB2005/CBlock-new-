import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  WalletIcon
} from '@heroicons/react/24/outline';
import documentService from './services/document.js';
import authService from './services/auth.js';
import blockchainService from './services/blockchain.js';
import errorHandler from './services/errorHandler.js';
import retryService from './services/retryService.js';
import { LoadingOverlay } from './components/LoadingStates.jsx';
import { ROLES, getCurrentUserRole, getRoleDisplayName } from './utils/permissions.js';

export default function Upload({ user, onNavigate }) {
  // Core upload state
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [uploadStage, setUploadStage] = useState('preparing');
  const fileInputRef = useRef(null);

  // Form state
  const [metadata, setMetadata] = useState({
    projectName: '',
    projectType: 'renewable_energy',
    description: '',
    location: '',
    estimatedCredits: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  // User and role state
  const [userRole, setUserRole] = useState('guest');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // UI state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [lastError, setLastError] = useState(null);

  // Initialize user and role information
  useEffect(() => {
    const initializeUser = () => {
      const user = authService.getCurrentUser();
      setUserRole(getCurrentUserRole(user));
      checkWalletConnection();
    };
    initializeUser();
  }, []);

  // Check wallet connection status
  const checkWalletConnection = useCallback(async () => {
    try {
      const address = await blockchainService.getCurrentAddress();
      setIsWalletConnected(!!address);
    } catch (error) {
      setIsWalletConnected(false);
    }
  }, []);

  // Connect wallet for blockchain registration
  const connectWallet = useCallback(async () => {
    try {
      toast.loading('Connecting wallet...', { id: 'wallet-connect' });
      await blockchainService.getSigner();
      setIsWalletConnected(true);
      toast.success('Wallet connected successfully!', { id: 'wallet-connect' });
    } catch (error) {
      console.error('Wallet connection failed:', error);
      toast.error(`Failed to connect wallet: ${error.message}`, { id: 'wallet-connect' });
    }
  }, []);

  // Get allowed file types from DocumentService
  const allowedFileTypes = documentService.getAllowedFileTypes();
  const maxFileSize = documentService.getMaxFileSize();

  const acceptedFileTypes = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'image/jpeg': '.jpg',
    'image/png': '.png'
  };

  // Project type options
  const projectTypes = [
    { value: 'renewable_energy', label: 'Renewable Energy', icon: '⚡' },
    { value: 'forest_conservation', label: 'Forest Conservation', icon: '🌲' },
    { value: 'carbon_capture', label: 'Carbon Capture', icon: '🏭' },
    { value: 'sustainable_agriculture', label: 'Sustainable Agriculture', icon: '🌾' },
    { value: 'waste_management', label: 'Waste Management', icon: '♻️' },
    { value: 'energy_efficiency', label: 'Energy Efficiency', icon: '💡' },
    { value: 'transportation', label: 'Clean Transportation', icon: '🚗' },
    { value: 'other', label: 'Other', icon: '📋' }
  ];

  // File validation
  const validateFile = (file) => {
    if (!file) return { valid: false, message: 'Please select a file' };
    if (file.size > maxFileSize) {
      return { valid: false, message: `File size must be less than ${formatFileSize(maxFileSize)}` };
    }
    if (!allowedFileTypes.includes(file.type)) {
      return { valid: false, message: 'File type not supported. Please upload PDF, Word, text, or image files.' };
    }
    return { valid: true };
  };

  // Metadata validation
  const validateMetadata = () => {
    const errors = {};
    if (!metadata.projectName.trim()) errors.projectName = 'Project name is required';
    if (!metadata.projectType) errors.projectType = 'Project type is required';
    if (metadata.estimatedCredits && (isNaN(metadata.estimatedCredits) || metadata.estimatedCredits < 0)) {
      errors.estimatedCredits = 'Estimated credits must be a positive number';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (selectedFile) {
      const validation = validateFile(selectedFile);
      if (validation.valid) {
        setFile(selectedFile);
        setShowMetadataForm(true);
        toast.success(`File selected: ${selectedFile.name}`);
      } else {
        toast.error(validation.message);
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  // Handle metadata changes
  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Main upload function - consolidated from MintCredits functionality
  const upload = useCallback(async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!metadata.projectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    // Validate file and metadata
    const fileValidation = validateFile(file);
    if (!fileValidation.valid) {
      toast.error(fileValidation.message);
      return;
    }

    if (!validateMetadata()) {
      toast.error('Please fix the validation errors before uploading');
      return;
    }

    setIsUploading(true);
    setUploadStage('preparing');
    setUploadProgress(0);
    setLastError(null);

    try {
      console.log('🚀 Starting document upload process...', {
        fileName: file.name,
        fileSize: file.size,
        projectName: metadata.projectName,
        userRole: userRole
      });

      // Enhanced upload with retry logic and progress tracking
      const uploadWithRetry = async () => {
        setUploadStage('uploading');
        setUploadProgress(25);

        // Upload to IPFS and register on blockchain
        const result = await documentService.uploadDocument(file, metadata, {
          onProgress: (progress) => {
            setUploadProgress(25 + (progress * 0.5)); // 25-75% for IPFS
          }
        });

        setUploadStage('completing');
        setUploadProgress(100);
        return result;
      };

      // Execute upload with retry logic
      const result = await retryService.executeWithRetry(
        uploadWithRetry,
        {
          maxRetries: 3,
          retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'IPFS_ERROR', 'BLOCKCHAIN_CONGESTION'],
          onRetry: (attempt) => {
            setUploadProgress(0);
            console.log(`🔄 Retry attempt ${attempt}: Upload failed, retrying...`);
            toast.loading(`Retrying upload (attempt ${attempt})...`, { id: 'upload-retry' });
          }
        }
      );

      // Success handling
      setUploadResult(result);
      setShowSuccessModal(true);

      const successMessage = result.blockchainRegistered
        ? 'Document uploaded and registered on blockchain successfully!'
        : 'Document uploaded successfully! Blockchain registration will be attempted later.';

      toast.success(successMessage, { duration: 5000 });
      console.log('✅ Upload completed successfully:', result);

      // Reset form after successful upload
      setTimeout(() => {
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('❌ Upload failed:', error);
      setLastError(error);
      setShowErrorDetails(true);

      // Enhanced error handling with user-friendly messages
      if (error.message.includes('Wallet connection required')) {
        toast.error('Connect your wallet to register documents on blockchain. Document stored locally.', {
          duration: 7000
        });
      } else if (error.message.includes('IPFS')) {
        toast.error('File upload failed. Please check your internet connection and try again.');
      } else if (error.message.includes('user rejected')) {
        toast.error('Transaction was rejected. Document stored locally.');
      } else {
        toast.error(`Upload failed: ${error.message}`);
      }

      // Log error for debugging
      errorHandler.handleError(error, {
        operation: 'document_upload',
        component: 'Upload',
        userRole: userRole,
        fileName: file?.name,
        projectName: metadata.projectName
      });

    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('preparing');
    }
  }, [file, metadata, userRole]);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFile(null);
    setMetadata({
      projectName: '',
      projectType: 'renewable_energy',
      description: '',
      location: '',
      estimatedCredits: ''
    });
    setValidationErrors({});
    setShowMetadataForm(false);
    setUploadResult(null);
    setShowSuccessModal(false);
    setShowErrorDetails(false);
    setLastError(null);
  }, []);

  // Render role-specific header
  const renderRoleHeader = () => (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Document Upload for {getRoleDisplayName(userRole)}s
          </h1>
          <p className="text-blue-100">
            {userRole === ROLES.BUSINESS
              ? 'Upload your business documents for verification and carbon credit minting.'
              : 'Upload your environmental impact documents for verification and carbon credit minting.'
            }
          </p>
        </div>
        <div className="text-right">
          <div className="bg-white/20 rounded-lg px-3 py-1 text-sm font-medium">
            {getRoleDisplayName(userRole)}
          </div>
        </div>
      </div>
    </div>
  );

  // Render wallet connection status
  const renderWalletStatus = () => (
    <div className={`rounded-lg p-4 mb-6 ${isWalletConnected ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <WalletIcon className={`w-5 h-5 ${isWalletConnected ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <p className={`font-medium ${isWalletConnected ? 'text-green-900' : 'text-yellow-900'}`}>
              {isWalletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
            </p>
            <p className={`text-sm ${isWalletConnected ? 'text-green-700' : 'text-yellow-700'}`}>
              {isWalletConnected
                ? 'Documents will be registered on blockchain'
                : 'Documents will be stored locally only'
              }
            </p>
          </div>
        </div>
        {!isWalletConnected && (
          <button
            onClick={connectWallet}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Role-specific header */}
      {renderRoleHeader()}

      {/* Wallet connection status */}
      {renderWalletStatus()}

      {/* Loading overlay */}
      <AnimatePresence>
        {isUploading && (
          <LoadingOverlay
            show={true}
            message={`${uploadStage === 'uploading' ? 'Uploading to IPFS' : uploadStage === 'registering' ? 'Registering on blockchain' : 'Processing'}...`}
            userRole={userRole}
            operation="document_upload"
            progress={uploadProgress}
          />
        )}
      </AnimatePresence>

      {/* Main upload interface */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        {!showMetadataForm ? (
          // File selection
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 cursor-pointer ${isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={Object.values(acceptedFileTypes).join(',')}
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />

            <CloudArrowUpIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload Your Document
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your file here, or click to browse
            </p>
            <div className="text-sm text-gray-500">
              <p>Supported formats: PDF, Word, Text, Images</p>
              <p>Maximum size: {formatFileSize(maxFileSize)}</p>
            </div>
          </div>
        ) : (
          // Metadata form
          <div className="space-y-6">
            {/* Selected file info */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">{file.name}</p>
                  <p className="text-sm text-blue-700">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setShowMetadataForm(false);
                  }}
                  className="ml-auto text-blue-600 hover:text-blue-800"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Metadata form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={metadata.projectName}
                  onChange={(e) => handleMetadataChange('projectName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.projectName ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Enter your project name"
                />
                {validationErrors.projectName && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.projectName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type *
                </label>
                <select
                  value={metadata.projectType}
                  onChange={(e) => handleMetadataChange('projectType', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.projectType ? 'border-red-300' : 'border-gray-300'
                    }`}
                >
                  {projectTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
                {validationErrors.projectType && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.projectType}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={metadata.location}
                  onChange={(e) => handleMetadataChange('location', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Project location"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => handleMetadataChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe your project and its environmental impact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Credits
                </label>
                <input
                  type="number"
                  value={metadata.estimatedCredits}
                  onChange={(e) => handleMetadataChange('estimatedCredits', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${validationErrors.estimatedCredits ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Expected carbon credits"
                  min="0"
                />
                {validationErrors.estimatedCredits && (
                  <p className="text-red-600 text-sm mt-1">{validationErrors.estimatedCredits}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-4 pt-6">
              <button
                onClick={upload}
                disabled={isUploading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Uploading...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <CloudArrowUpIcon className="w-5 h-5" />
                    <span>Upload Document</span>
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  setFile(null);
                  setShowMetadataForm(false);
                }}
                disabled={isUploading}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && uploadResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="text-center">
                <CheckCircleIcon className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Successful!
                </h3>
                <p className="text-gray-600 mb-4">
                  Your document has been uploaded successfully.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Document ID:</span>
                      <span className="font-mono text-gray-900">{uploadResult.documentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${uploadResult.blockchainRegistered ? 'text-green-600' : 'text-yellow-600'}`}>
                        {uploadResult.blockchainRegistered ? 'Blockchain Registered' : 'Locally Stored'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Details Modal */}
      <AnimatePresence>
        {showErrorDetails && lastError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <div className="text-center">
                <ExclamationTriangleIcon className="w-16 h-16 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Failed
                </h3>
                <p className="text-gray-600 mb-4">
                  {lastError.message}
                </p>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowErrorDetails(false)}
                    className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowErrorDetails(false);
                      upload();
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}