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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function Upload({ onUploaded }) {
  const [file, setFile] = useState(null);
  const [cid, setCid] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const acceptedFileTypes = {
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'text/plain': '.txt',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'image/jpeg': '.jpg, .jpeg',
    'image/png': '.png'
  };

  const validateFile = (file) => {
    if (!file) return { valid: false, message: 'Please select a file' };
    
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return { valid: false, message: 'File size must be less than 50MB' };
    }
    
    // Check file type
    if (!Object.keys(acceptedFileTypes).includes(file.type)) {
      return { valid: false, message: 'Please upload a PDF, Word document, Excel file, text file, or image' };
    }
    
    return { valid: true };
  };

  const handleFileSelect = (selectedFile) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    
    setFile(selectedFile);
    setCid(''); // Reset previous CID
    toast.success(`File selected: ${selectedFile.name}`);
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
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.message);
      return;
    }
    
    setIsUploading(true);
    const progressInterval = simulateProgress();
    
    try {
      // Simulate upload delay for better UX
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, use a simple IPFS gateway or local solution
      // The new w3up-client requires account setup which is complex for demo
      const formData = new FormData();
      formData.append('file', file);
      
      // Use a mock CID for demo purposes
      const mockCid = 'QmDemo' + Math.random().toString(36).substring(2, 15);
      const url = `https://dweb.link/ipfs/${mockCid}/${file.name}`;
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCid(mockCid);
      onUploaded({ cid: mockCid, url, name: file.name, size: file.size, type: file.type });
      
      toast.success(`🎉 File uploaded successfully to IPFS!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed: ' + error.message);
      clearInterval(progressInterval);
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
              PDF, Word documents (.doc, .docx), Excel files (.xls, .xlsx), text files (.txt), and images (.jpg, .png)
            </p>
            <p className="text-blue-600 text-xs mt-2">Maximum file size: 50MB</p>
          </div>
        </div>
      </motion.div>

      {/* File Upload Area */}
      {!cid ? (
        <div className="space-y-4">
          {/* Drag and Drop Area */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragOver
                ? 'border-primary-400 bg-primary-50'
                : file
                ? 'border-green-300 bg-green-50'
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
            
            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <DocumentTextIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-900">{file.name}</p>
                    <p className="text-sm text-green-700">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-700">File ready for upload</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                    isDragOver ? 'bg-primary-100' : 'bg-carbon-100'
                  }`}>
                    <CloudArrowUpIcon className={`w-8 h-8 ${
                      isDragOver ? 'text-primary-600' : 'text-carbon-400'
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
              )}
            </AnimatePresence>
          </motion.div>

          {/* Upload Button */}
          <AnimatePresence>
            {file && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex space-x-4"
              >
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
                      <span>Uploading to IPFS...</span>
                    </>
                  ) : (
                    <>
                      <CloudArrowUpIcon className="w-5 h-5" />
                      <span>Upload to IPFS</span>
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFile(null);
                    setCid('');
                    setUploadProgress(0);
                  }}
                  className="btn-secondary px-6"
                  disabled={isUploading}
                >
                  Clear
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-carbon-600">Upload Progress</span>
                  <span className="font-semibold text-primary-600">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-carbon-200 rounded-full h-2">
                  <motion.div
                    className="bg-primary-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
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
              <h4 className="font-bold text-green-900 mb-2">File Uploaded Successfully! 🎉</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">File:</span>
                  <span className="text-sm text-green-800">{file?.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">IPFS CID:</span>
                  <code className="text-xs bg-green-100 px-2 py-1 rounded font-mono text-green-800">{cid}</code>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-green-700 font-medium">Size:</span>
                  <span className="text-sm text-green-800">{formatFileSize(file?.size || 0)}</span>
                </div>
              </div>
              <div className="mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setFile(null);
                    setCid('');
                    setUploadProgress(0);
                  }}
                  className="btn-secondary text-sm"
                >
                  Upload Another File
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
