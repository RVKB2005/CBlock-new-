// Complete Working Upload.jsx with Proper Blockchain Integration
import React, { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import documentService from '../services/document.js';
import blockchainService from '../services/blockchain.js';
import authService from '../services/auth.js';
import retryService from '../services/retryService.js';

const Upload = () => {
    const [file, setFile] = useState(null);
    const [metadata, setMetadata] = useState({
        projectName: '',
        projectType: 'renewable_energy',
        description: '',
        location: '',
        estimatedCredits: 0
    });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Enhanced upload function with proper blockchain integration
    const upload = useCallback(async () => {
        if (!file) {
            toast.error('Please select a file to upload');
            return;
        }

        if (!metadata.projectName.trim()) {
            toast.error('Project name is required');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Step 1: Check user authentication
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                throw new Error('Please log in to upload documents');
            }

            console.log('🚀 Starting upload process...', {
                fileName: file.name,
                fileSize: file.size,
                projectName: metadata.projectName,
                userRole: currentUser.accountType
            });

            // Step 2: Upload to IPFS with progress tracking
            setUploadProgress(25);
            const uploadResult = await uploadWithRetry();

            console.log('✅ Upload completed successfully:', uploadResult);

            // Show success message
            toast.success(`Document uploaded successfully! ${uploadResult.blockchainRegistered ? 'Registered on blockchain.' : 'Stored locally.'}`, {
                duration: 5000
            });

            // Reset form
            setFile(null);
            setMetadata({
                projectName: '',
                projectType: 'renewable_energy',
                description: '',
                location: '',
                estimatedCredits: 0
            });

        } catch (error) {
            console.error('❌ Upload failed:', error);

            // Enhanced error handling
            if (error.message.includes('Wallet connection required')) {
                toast.error('Please connect your wallet to register documents on blockchain. Document will be stored locally.', {
                    duration: 7000
                });
            } else if (error.message.includes('IPFS')) {
                toast.error('File upload failed. Please check your internet connection and try again.');
            } else {
                toast.error(`Upload failed: ${error.message}`);
            }
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    }, [file, metadata]);

    // Upload with retry logic and progress tracking
    const uploadWithRetry = useCallback(async () => {
        return await retryService.executeWithRetry(
            async () => {
                setUploadProgress(50);

                // This will handle IPFS upload + blockchain registration
                const result = await documentService.uploadDocument(file, metadata, {
                    onProgress: (progress) => {
                        setUploadProgress(25 + (progress * 0.5)); // 25-75% for IPFS
                    }
                });

                setUploadProgress(100);
                return result;
            },
            {
                maxRetries: 3,
                retryableErrors: ['NETWORK_ERROR', 'IPFS_TIMEOUT'],
                onRetry: (attempt, error) => {
                    console.log(`🔄 Retry attempt ${attempt}: ${error.message}`);
                    toast.loading(`Retrying upload (attempt ${attempt})...`, {
                        id: 'upload-retry'
                    });
                }
            }
        );
    }, [file, metadata]);

    // Wallet connection helper
    const connectWalletForBlockchain = useCallback(async () => {
        try {
            toast.loading('Connecting wallet for blockchain registration...', {
                id: 'wallet-connect'
            });

            await blockchainService.getSigner();

            toast.success('Wallet connected! You can now register documents on blockchain.', {
                id: 'wallet-connect'
            });

            return true;
        } catch (error) {
            console.error('Wallet connection failed:', error);

            toast.error(`Wallet connection failed: ${error.message}`, {
                id: 'wallet-connect'
            });

            return false;
        }
    }, []);

    return (
        <div className="upload-container">
            <h2>Upload Document</h2>

            {/* File Selection */}
            <div className="file-input-section">
                <input
                    type="file"
                    onChange={(e) => setFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                    disabled={isUploading}
                />
                {file && (
                    <div className="file-info">
                        <p>Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
                    </div>
                )}
            </div>

            {/* Metadata Form */}
            <div className="metadata-form">
                <input
                    type="text"
                    placeholder="Project Name *"
                    value={metadata.projectName}
                    onChange={(e) => setMetadata(prev => ({ ...prev, projectName: e.target.value }))}
                    disabled={isUploading}
                    required
                />

                <select
                    value={metadata.projectType}
                    onChange={(e) => setMetadata(prev => ({ ...prev, projectType: e.target.value }))}
                    disabled={isUploading}
                >
                    <option value="renewable_energy">Renewable Energy</option>
                    <option value="forest_conservation">Forest Conservation</option>
                    <option value="carbon_capture">Carbon Capture</option>
                    <option value="other">Other</option>
                </select>

                <textarea
                    placeholder="Project Description"
                    value={metadata.description}
                    onChange={(e) => setMetadata(prev => ({ ...prev, description: e.target.value }))}
                    disabled={isUploading}
                />

                <input
                    type="text"
                    placeholder="Location"
                    value={metadata.location}
                    onChange={(e) => setMetadata(prev => ({ ...prev, location: e.target.value }))}
                    disabled={isUploading}
                />

                <input
                    type="number"
                    placeholder="Estimated Credits"
                    value={metadata.estimatedCredits}
                    onChange={(e) => setMetadata(prev => ({ ...prev, estimatedCredits: parseInt(e.target.value) || 0 }))}
                    disabled={isUploading}
                    min="0"
                />
            </div>

            {/* Upload Progress */}
            {isUploading && (
                <div className="upload-progress">
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                    <p>Uploading... {uploadProgress}%</p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
                <button
                    onClick={upload}
                    disabled={!file || !metadata.projectName.trim() || isUploading}
                    className="upload-btn"
                >
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>

                <button
                    onClick={connectWalletForBlockchain}
                    disabled={isUploading}
                    className="wallet-btn"
                >
                    Connect Wallet for Blockchain
                </button>
            </div>

            {/* Help Text */}
            <div className="help-text">
                <p>
                    📝 Documents are uploaded to IPFS and optionally registered on blockchain.
                    <br />
                    🔗 Connect your wallet to enable blockchain registration.
                    <br />
                    💾 Documents are always stored locally as backup.
                </p>
            </div>
        </div>
    );
};

export default Upload;