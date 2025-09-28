import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    DocumentTextIcon,
    EyeIcon,
    ArrowDownTrayIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    GlobeAltIcon
} from '@heroicons/react/24/outline';
import ipfsService from '../services/ipfs.js';

const DocumentViewer = ({ document }) => {
    const [viewerState, setViewerState] = useState('loading'); // loading, ready, error
    const [documentUrl, setDocumentUrl] = useState(null);
    const [availableGateways, setAvailableGateways] = useState([]);
    const [selectedGateway, setSelectedGateway] = useState(0);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [accessibility, setAccessibility] = useState(null);

    useEffect(() => {
        if (document?.cid) {
            checkDocumentAccessibility();
        }
    }, [document]);

    const checkDocumentAccessibility = async () => {
        setViewerState('loading');

        try {
            console.log('🔍 Checking document accessibility for CID:', document.cid);

            // Get all available gateways
            const gateways = ipfsService.getGatewayUrls(document.cid);
            setAvailableGateways(gateways);

            // Check accessibility
            const accessibilityResult = await ipfsService.verifyCIDAccessibility(document.cid);
            setAccessibility(accessibilityResult);

            if (accessibilityResult.accessible) {
                setDocumentUrl(accessibilityResult.url);
                setViewerState('ready');
                console.log('✅ Document is accessible via:', accessibilityResult.url);
            } else {
                setViewerState('error');
                console.error('❌ Document not accessible:', accessibilityResult.error);
            }
        } catch (error) {
            console.error('❌ Error checking document accessibility:', error);
            setViewerState('error');
            setAccessibility({ accessible: false, error: error.message });
        }
    };

    const handleGatewayChange = (gatewayIndex) => {
        setSelectedGateway(gatewayIndex);
        setDocumentUrl(availableGateways[gatewayIndex]);
    };

    const handleDownload = async () => {
        try {
            // Check if we're in a browser environment
            if (typeof document === 'undefined' || typeof window === 'undefined') {
                console.error('❌ Download only works in browser environment');
                alert('Download is not available in this environment');
                return;
            }

            setDownloadProgress(10);

            const result = await ipfsService.fetchFileWithFallback(document.cid);
            setDownloadProgress(50);

            // Create download link safely
            const url = URL.createObjectURL(result.blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = document.filename || `document-${document.cid.slice(0, 8)}.pdf`;
            a.style.display = 'none'; // Hide the link

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setDownloadProgress(100);
            setTimeout(() => setDownloadProgress(0), 2000);
        } catch (error) {
            console.error('❌ Download failed:', error);
            setDownloadProgress(0);

            // Better error handling
            if (error.message.includes('document.createElement')) {
                alert('Download failed: Browser environment required');
            } else {
                alert('Download failed: ' + error.message);
            }
        }
    };

    const getFileTypeIcon = (filename) => {
        const extension = filename?.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'pdf':
                return '📄';
            case 'doc':
            case 'docx':
                return '📝';
            case 'txt':
                return '📃';
            case 'jpg':
            case 'jpeg':
            case 'png':
                return '🖼️';
            default:
                return '📄';
        }
    };

    const canPreview = (filename) => {
        const extension = filename?.split('.').pop()?.toLowerCase();
        return ['pdf', 'jpg', 'jpeg', 'png', 'txt'].includes(extension);
    };

    if (viewerState === 'loading') {
        return (
            <div className="bg-carbon-50 rounded-lg p-6 text-center">
                <ArrowPathIcon className="w-8 h-8 text-carbon-400 mx-auto mb-2 animate-spin" />
                <p className="text-carbon-600">Checking document accessibility...</p>
            </div>
        );
    }

    if (viewerState === 'error') {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 mb-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    <h4 className="font-medium text-red-800">Document Not Accessible</h4>
                </div>
                <p className="text-red-700 text-sm mb-4">
                    {accessibility?.error || 'Unable to access document from IPFS'}
                </p>
                <div className="space-y-2">
                    <p className="text-xs text-red-600">
                        <strong>CID:</strong> {document.cid}
                    </p>
                    <p className="text-xs text-red-600">
                        This might be because:
                    </p>
                    <ul className="text-xs text-red-600 list-disc list-inside ml-2">
                        <li>The document was uploaded with a mock CID (development mode)</li>
                        <li>The IPFS gateways are temporarily unavailable</li>
                        <li>The document was not properly uploaded to IPFS</li>
                    </ul>
                </div>
                <button
                    onClick={checkDocumentAccessibility}
                    className="mt-4 text-red-600 hover:text-red-800 text-sm underline"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="bg-carbon-50 rounded-lg p-4 space-y-4">
            {/* Document Info Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getFileTypeIcon(document.filename)}</span>
                    <div>
                        <h4 className="font-medium text-carbon-900">{document.filename}</h4>
                        <p className="text-xs text-carbon-600">
                            {accessibility?.size ? `${Math.round(accessibility.size / 1024)} KB` : 'Size unknown'} •
                            Stored on IPFS
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-xs text-green-600">Accessible</span>
                </div>
            </div>

            {/* Gateway Selection */}
            <div className="space-y-2">
                <label className="block text-xs font-medium text-carbon-700">
                    <GlobeAltIcon className="w-4 h-4 inline mr-1" />
                    IPFS Gateway:
                </label>
                <select
                    value={selectedGateway}
                    onChange={(e) => handleGatewayChange(parseInt(e.target.value))}
                    className="w-full text-xs px-2 py-1 border border-carbon-300 rounded focus:outline-none focus:ring-1 focus:ring-carbon-500"
                >
                    {availableGateways.map((gateway, index) => (
                        <option key={index} value={index}>
                            {new URL(gateway).hostname}
                        </option>
                    ))}
                </select>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
                {canPreview(document.filename) && (
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                            if (typeof window !== 'undefined') {
                                window.open(documentUrl, '_blank');
                            } else {
                                console.warn('Window.open not available in this environment');
                            }
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>View Document</span>
                    </motion.button>
                )}

                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownload}
                    disabled={downloadProgress > 0}
                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    {downloadProgress > 0 ? (
                        <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>{downloadProgress}%</span>
                        </>
                    ) : (
                        <>
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            <span>Download</span>
                        </>
                    )}
                </motion.button>
            </div>

            {/* Document Preview (for supported formats) */}
            {canPreview(document.filename) && documentUrl && (
                <div className="border border-carbon-200 rounded-lg overflow-hidden">
                    <div className="bg-carbon-100 px-3 py-2 text-xs text-carbon-600 flex items-center justify-between">
                        <span>Document Preview</span>
                        <button
                            onClick={() => {
                                if (typeof window !== 'undefined') {
                                    window.open(documentUrl, '_blank');
                                } else {
                                    console.warn('Window.open not available in this environment');
                                }
                            }}
                            className="text-blue-600 hover:text-blue-800 underline"
                        >
                            Open in new tab
                        </button>
                    </div>
                    <div className="h-96 bg-white">
                        {document.filename?.toLowerCase().endsWith('.pdf') ? (
                            <iframe
                                src={documentUrl}
                                className="w-full h-full"
                                title="Document Preview"
                            />
                        ) : document.filename?.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? (
                            <img
                                src={documentUrl}
                                alt="Document Preview"
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-carbon-500">
                                <div className="text-center">
                                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2" />
                                    <p>Preview not available for this file type</p>
                                    <button
                                        onClick={() => {
                                            if (typeof window !== 'undefined') {
                                                window.open(documentUrl, '_blank');
                                            } else {
                                                console.warn('Window.open not available in this environment');
                                            }
                                        }}
                                        className="mt-2 text-blue-600 hover:text-blue-800 underline text-sm"
                                    >
                                        Open in new tab
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Technical Details */}
            <details className="text-xs">
                <summary className="cursor-pointer text-carbon-600 hover:text-carbon-800">
                    Technical Details
                </summary>
                <div className="mt-2 p-2 bg-carbon-100 rounded text-carbon-700 space-y-1">
                    <p><strong>IPFS CID:</strong> <code>{document.cid}</code></p>
                    <p><strong>Current Gateway:</strong> {documentUrl ? new URL(documentUrl).hostname : 'None'}</p>
                    <p><strong>File Type:</strong> {document.mimeType || 'Unknown'}</p>
                    <p><strong>Upload Source:</strong> {document.isMockIPFS ? 'Mock (Development)' : 'Real IPFS'}</p>
                </div>
            </details>
        </div>
    );
};

export default DocumentViewer;