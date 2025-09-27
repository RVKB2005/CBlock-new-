import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CloudArrowUpIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  FolderOpenIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { useNotifications } from './contexts/NotificationsContext';
import documentService from './services/document.js';
import authService from './services/auth.js';
import errorHandler from './services/errorHandler.js';
import toastNotifications from './components/ToastNotifications.jsx';
import retryService from './services/retryService.js';
import { DocumentUploadLoading } from './components/LoadingStates.jsx';

export default function Upload({ onUploaded, user }) {
  const [file, setFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [metadata, setMetadata] = useState({
    projectName: '',
    projectType: '',
    description: '',
    location: '',
    estimatedCredits: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [uploadStage, setUploadStage] = useState('preparing'); // preparing, uploading, registering, completing
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef(null);
  const { addNotification } = useNotifications();

  // Get allowed file types from DocumentService
  const allowedFileTypes = documentService.getAllowedFileTypes();
  const maxFileSize = documentService.getMaxFileSize();

  const acceptedFileTypes = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'image/jpeg': '.jpg, .jpeg',
    'image/png': '.png'
  };

  const validateFile = (file) => {
    if (!file) return { valid: false, message: 'Please select a file' };

    try {
      // Use DocumentService validation
      documentService.validateFile(file);
      return { valid: true };
    } catch (error) {
      return { valid: false, message: error.message };
    }
  };

  const validateMetadata = () => {
    const errors = {};

    if (!metadata.projectName.trim()) {
      errors.projectName = 'Project name is required';
    } else if (metadata.projectName.length > 100) {
      errors.projectName = 'Project name must be 100 characters or less';
    }

    if (metadata.projectType && metadata.projectType.length > 50) {
      errors.projectType = 'Project type must be 50 characters or less';
    }

    if (metadata.description && metadata.description.length > 500) {
      errors.description = 'Description must be 500 characters or less';
    }

    if (metadata.location && metadata.location.length > 100) {
      errors.location = 'Location must be 100 characters or less';
    }

    if (metadata.estimatedCredits) {
      const credits = Number(metadata.estimatedCredits);
      if (isNaN(credits) || credits < 0 || credits > 1000000) {
        errors.estimatedCredits = 'Estimated credits must be a number between 0 and 1,000,000';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileSelect = (selectedFile) => {
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.accountType || 'guest';

    try {
      const validation = validateFile(selectedFile);
      if (!validation.valid) {
        errorHandler.handleError(
          new Error(validation.message),
          {
            operation: 'file_validation',
            component: 'Upload',
            userRole,
            fileName: selectedFile?.name
          },
          { showToast: true }
        );
        return;
      }

      setFile(selectedFile);
      setUploadResult(null); // Reset previous upload result
      setShowMetadataForm(true); // Show metadata form after file selection
      setRetryCount(0); // Reset retry count

      toastNotifications.success(
        `File selected: ${selectedFile.name}`,
        {
          roleSpecific: true,
          operation: 'file_selection',
          duration: 3000
        }
      );
    } catch (error) {
      errorHandler.handleError(
        error,
        {
          operation: 'file_selection',
          component: 'Upload',
          userRole,
          fileName: selectedFile?.name
        },
        { showToast: true }
      );
    }
  };

  const handleMetadataChange = (field, value) => {
    setMetadata(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const resetForm = () => {
    setFile(null);
    setUploadResult(null);
    setShowMetadataForm(false);
    setMetadata({
      projectName: '',
      projectType: '',
      description: '',
      location: '',
      estimatedCredits: ''
    });
    setValidationErrors({});
    setUploadProgress(0);
  };

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
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return interval;
  };

  async function upload() {
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.accountType || 'guest';

    try {
      // Validate file
      const fileValidation = validateFile(file);
      if (!fileValidation.valid) {
        errorHandler.handleError(
          new Error(fileValidation.message),
          {
            operation: 'file_validation',
            component: 'Upload',
            userRole,
            fileName: file?.name
          },
          { showToast: true }
        );
        return;
      }

      // Validate metadata
      if (!validateMetadata()) {
        errorHandler.handleError(
          new Error('Please fix the validation errors before uploading'),
          {
            operation: 'metadata_validation',
            component: 'Upload',
            userRole,
            validationErrors
          },
          { showToast: true }
        );
        return;
      }

      setIsUploading(true);
      setUploadStage('preparing');
      setUploadProgress(0);

      console.log('📤 Starting document upload with DocumentService...');

      // Enhanced upload with retry logic and progress tracking
      const uploadWithRetry = async () => {
        setUploadStage('uploading');
        setUploadProgress(20);

        const result = await documentService.uploadDocument(file, metadata);

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
            setRetryCount(attempt);
            setUploadProgress(0);
            toastNotifications.warning(
              `Upload attempt ${attempt + 1} failed, retrying...`,
              {
                roleSpecific: true,
                operation: 'upload_retry',
                duration: 3000
              }
            );
          }
        }
      );

      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));

      // Set upload result
      setUploadResult(result);

      // Call onUploaded callback if provided
      if (onUploaded) {
        onUploaded({
          documentId: result.documentId,
          cid: result.document.cid,
          url: result.document.ipfsUrl,
          name: result.document.filename,
          size: result.document.fileSize,
          type: result.document.mimeType,
          projectName: result.document.projectName,
          status: result.document.status
        });
      }

      // Notify verifiers if uploader is not a verifier
      if (currentUser && currentUser.accountType !== 'verifier') {
        addNotification({
          message: `New document uploaded by ${currentUser.name}: ${result.document.projectName}`,
          link: 'verifier-dashboard'
        });
      }

      // Show success notification
      toastNotifications.documentUploadSuccess(
        result.document.filename,
        userRole
      );

      setShowMetadataForm(false); // Hide metadata form after successful upload
      setRetryCount(0); // Reset retry count

    } catch (error) {
      console.error('Upload error:', error);

      // Enhanced error handling for document uploads
      errorHandler.handleDocumentUploadError(
        error,
        userRole,
        {
          fileName: file?.name,
          fileSize: file?.size,
          projectName: metadata.projectName,
          retryAction: upload,
          retryCount
        }
      );

      setUploadProgress(0);
      setUploadStage('preparing');
    } finally {
      setIsUploading(false);
    }
  }

  const formatFileSize = (bytes) => {
    return documentService.formatFileSize(bytes);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <CloudArrowUpIcon className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-carbon-900">Upload Project Document</h3>
          <p className="text-sm text-carbon-600">Upload your carbon credit project documentation to IPFS</p>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Supported File Types</p>
            <p className="text-blue-700 mt-1">
              PDF, Word documents (.doc, .docx), text files (.txt), and images (.jpg, .png)
            </p>
            <p className="text-blue-600 text-xs mt-2">Maximum file size: {formatFileSize(maxFileSize)}</p>
          </div>
        </div>
      </motion.div>

      {/* File Upload Area */}
      {!uploadResult ? (
        <div className="space-y-6">
          {/* Step 1: File Selection */}
          {!file && (
            <motion.div
              whileHover={{ scale: 1.01 }}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragOver
                ? 'border-primary-400 bg-primary-50'
                : 'border-carbon-300 bg-carbon-50 hover:border-primary-300 hover:bg-primary-50'
                }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept={Object.values(acceptedFileTypes).join(',')}
                onChange={(e) => handleFileSelect(e.target.files[0])}
              />

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isDragOver ? 'bg-primary-100' : 'bg-carbon-100'
                  }`}>
                  <CloudArrowUpIcon className={`w-8 h-8 ${isDragOver ? 'text-primary-600' : 'text-carbon-400'
                    }`} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-carbon-900">
                    {isDragOver ? 'Drop your file here' : 'Drag and drop your file here'}
                  </p>
                  <p className="text-carbon-600 mt-1">or</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary inline-flex items-center space-x-2"
                >
                  <FolderOpenIcon className="w-5 h-5" />
                  <span>Choose File</span>
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 2: File Selected - Show File Info */}
          {file && !showMetadataForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-xl p-6"
            >
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <DocumentTextIcon className="w-7 h-7 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-green-900 mb-2">File Selected</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-700 font-medium">File:</span>
                      <span className="text-sm text-green-800">{file.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-700 font-medium">Size:</span>
                      <span className="text-sm text-green-800">{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-green-700 font-medium">Type:</span>
                      <span className="text-sm text-green-800">{file.type}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowMetadataForm(true)}
                      className="btn-primary text-sm"
                    >
                      Continue
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={resetForm}
                      className="btn-secondary text-sm"
                    >
                      Choose Different File
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Metadata Form */}
          <AnimatePresence>
            {showMetadataForm && file && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white border border-carbon-200 rounded-xl p-6"
              >
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <TagIcon className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-carbon-900">Project Details</h4>
                    <p className="text-sm text-carbon-600">Provide information about your carbon credit project</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Project Name */}
                  <div>
                    <label className="block text-sm font-medium text-carbon-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={metadata.projectName}
                      onChange={(e) => handleMetadataChange('projectName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${validationErrors.projectName ? 'border-red-300' : 'border-carbon-300'
                        }`}
                      placeholder="Enter your project name"
                      maxLength={100}
                    />
                    {validationErrors.projectName && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.projectName}</p>
                    )}
                  </div>

                  {/* Project Type */}
                  <div>
                    <label className="block text-sm font-medium text-carbon-700 mb-2">
                      Project Type
                    </label>
                    <select
                      value={metadata.projectType}
                      onChange={(e) => handleMetadataChange('projectType', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${validationErrors.projectType ? 'border-red-300' : 'border-carbon-300'
                        }`}
                    >
                      <option value="">Select project type</option>
                      <option value="Renewable Energy">Renewable Energy</option>
                      <option value="Reforestation">Reforestation</option>
                      <option value="Energy Efficiency">Energy Efficiency</option>
                      <option value="Waste Management">Waste Management</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Transportation">Transportation</option>
                      <option value="Other">Other</option>
                    </select>
                    {validationErrors.projectType && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.projectType}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-carbon-700 mb-2">
                      <MapPinIcon className="w-4 h-4 inline mr-1" />
                      Location
                    </label>
                    <input
                      type="text"
                      value={metadata.location}
                      onChange={(e) => handleMetadataChange('location', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${validationErrors.location ? 'border-red-300' : 'border-carbon-300'
                        }`}
                      placeholder="Project location (city, country)"
                      maxLength={100}
                    />
                    {validationErrors.location && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.location}</p>
                    )}
                  </div>

                  {/* Estimated Credits */}
                  <div>
                    <label className="block text-sm font-medium text-carbon-700 mb-2">
                      <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                      Estimated Credits
                    </label>
                    <input
                      type="number"
                      value={metadata.estimatedCredits}
                      onChange={(e) => handleMetadataChange('estimatedCredits', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${validationErrors.estimatedCredits ? 'border-red-300' : 'border-carbon-300'
                        }`}
                      placeholder="Expected carbon credits"
                      min="0"
                      max="1000000"
                    />
                    {validationErrors.estimatedCredits && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.estimatedCredits}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-carbon-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={metadata.description}
                      onChange={(e) => handleMetadataChange('description', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${validationErrors.description ? 'border-red-300' : 'border-carbon-300'
                        }`}
                      placeholder="Brief description of your project"
                      rows={3}
                      maxLength={500}
                    />
                    <div className="flex justify-between items-center mt-1">
                      {validationErrors.description ? (
                        <p className="text-sm text-red-600">{validationErrors.description}</p>
                      ) : (
                        <span className="text-xs text-carbon-500">
                          {metadata.description.length}/500 characters
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex space-x-4 mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={upload}
                    disabled={isUploading}
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {isUploading ? (
                      <>
                        <ArrowPathIcon className="w-5 h-5 animate-spin" />
                        <span>Uploading Document...</span>
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="w-5 h-5" />
                        <span>Upload Document</span>
                      </>
                    )}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowMetadataForm(false)}
                    className="btn-secondary px-6"
                    disabled={isUploading}
                  >
                    Back
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Enhanced Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <DocumentUploadLoading
                stage={uploadStage}
                progress={uploadProgress}
                fileName={file?.name || ''}
                userRole={authService.getCurrentUser()?.accountType || 'individual'}
              />
            )}
          </AnimatePresence>

          {/* Retry Information */}
          <AnimatePresence>
            {retryCount > 0 && !isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
              >
                <div className="flex items-center space-x-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900">
                      Upload failed after {retryCount} attempts
                    </p>
                    <p className="text-yellow-700 mt-1">
                      Please check your connection and try again. If the problem persists, try a smaller file or contact support.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* Success State */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-xl p-6"
        >
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="w-7 h-7 text-green-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-green-900 mb-2">Document Uploaded Successfully! 🎉</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">Project:</span>
                  <span className="text-sm text-green-800">{uploadResult.document.projectName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">File:</span>
                  <span className="text-sm text-green-800">{uploadResult.document.filename}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">Document ID:</span>
                  <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono text-green-800">
                    {uploadResult.documentId}
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">IPFS CID:</span>
                  <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono text-green-800">
                    {uploadResult.document.cid}
                  </code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">Status:</span>
                  <span className="text-sm text-green-800 capitalize">{uploadResult.document.status}</span>
                </div>
              </div>
              <div className="mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetForm}
                  className="btn-secondary text-sm"
                >
                  Upload Another Document
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
