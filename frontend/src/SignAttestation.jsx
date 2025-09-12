import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  DocumentCheckIcon,
  IdentificationIcon,
  HashtagIcon,
  CubeIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  WalletIcon,
  ShieldCheckIcon,
  ClipboardDocumentCheckIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import CarbonABI from './abis/Carbon.json';

export default function SignAttestation({ onSigned, uploadedData }) {
  const [formData, setFormData] = useState({
    gsProjectId: '',
    gsSerial: '',
    ipfsCid: '',
    amount: 1,
    vintage: new Date().getFullYear()
  });
  const [isLoading, setIsLoading] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [checkingVerifier, setCheckingVerifier] = useState(false);
  
  // Auto-populate IPFS CID and file info when file is uploaded
  useEffect(() => {
    if (uploadedData && uploadedData.cid) {
      setFormData(prev => ({ ...prev, ipfsCid: uploadedData.cid }));
    }
  }, [uploadedData]);

  // Check wallet connection on component mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setIsWalletConnected(true);
          await checkVerifierStatus(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const checkVerifierStatus = async (address) => {
    if (!address) return;
    
    setCheckingVerifier(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const verifierRegistryAddress = import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;
      
      if (!verifierRegistryAddress) {
        console.warn('Verifier registry address not found');
        return;
      }

      // Simple ABI for checking verifier status
      const verifierABI = [
        "function isVerifier(address account) external view returns (bool)",
        "function addVerifier(address verifier) external"
      ];
      
      const verifierRegistry = new ethers.Contract(verifierRegistryAddress, verifierABI, provider);
      const isRegisteredVerifier = await verifierRegistry.isVerifier(address);
      
      setIsVerifier(isRegisteredVerifier);
      
      if (isRegisteredVerifier) {
        toast.success('✅ You are registered as a verifier!');
      } else {
        toast.warning('⚠️ You are not registered as a verifier. You can register yourself for testing.');
      }
    } catch (error) {
      console.error('Error checking verifier status:', error);
      toast.error('Could not check verifier status');
    } finally {
      setCheckingVerifier(false);
    }
  };

  const registerAsVerifier = async () => {
    if (!isWalletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    setCheckingVerifier(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const verifierRegistryAddress = import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;
      
      const verifierABI = [
        "function isVerifier(address account) external view returns (bool)",
        "function addVerifier(address verifier) external"
      ];
      
      const verifierRegistry = new ethers.Contract(verifierRegistryAddress, verifierABI, signer);
      
      toast.loading('Registering as verifier...', { id: 'registering' });
      
      const tx = await verifierRegistry.addVerifier(walletAddress);
      await tx.wait();
      
      toast.dismiss('registering');
      toast.success('🎉 Successfully registered as a verifier!');
      
      setIsVerifier(true);
    } catch (error) {
      console.error('Error registering as verifier:', error);
      toast.dismiss('registering');
      
      let errorMessage = 'Failed to register as verifier: ';
      if (error.message.includes('user rejected')) {
        errorMessage = 'Registration was cancelled by user.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for registration transaction.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    } finally {
      setCheckingVerifier(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to continue');
      return;
    }

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);
        toast.success('Wallet connected successfully!');
        // Check verifier status after connecting
        await checkVerifierStatus(accounts[0]);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.gsProjectId.trim()) {
      errors.gsProjectId = 'Project ID is required';
    } else if (!/^[A-Z]{2,3}-\d{3,6}$/i.test(formData.gsProjectId.trim())) {
      errors.gsProjectId = 'Project ID format should be like "GS-1234" or "VCS-12345"';
    }
    
    if (!formData.gsSerial.trim()) {
      errors.gsSerial = 'Serial number is required';
    } else if (formData.gsSerial.trim().length < 5) {
      errors.gsSerial = 'Serial number should be at least 5 characters';
    }
    
    if (!formData.ipfsCid.trim()) {
      errors.ipfsCid = 'IPFS CID is required (upload a file first)';
    }
    
    if (!formData.amount || formData.amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    } else if (formData.amount > 1000000) {
      errors.amount = 'Amount seems too large (max: 1,000,000)';
    }
    
    if (!formData.vintage || formData.vintage < 2000 || formData.vintage > new Date().getFullYear() + 1) {
      errors.vintage = 'Please enter a valid vintage year';
    }
    
    if (!isWalletConnected) {
      errors.wallet = 'Please connect your wallet first';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = React.useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    setValidationErrors(prev => {
      if (prev[field]) {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      }
      return prev;
    });
  }, []);

  async function sign() {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before proceeding');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const carbonAddress = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;
      if (!carbonAddress) {
        toast.error('Smart contract not deployed. Please check your configuration.');
        return;
      }
      
      // Create carbon contract instance
      const carbon = new ethers.Contract(carbonAddress, CarbonABI, signer);

      const network = await provider.getNetwork();
      const chainId = network.chainId;
      
      const domain = {
        name: 'CarbonCredit',
        version: '1',
        chainId: chainId,
        verifyingContract: carbonAddress
      };

      const types = {
        Attestation: [
          { name: 'gsProjectId', type: 'string' },
          { name: 'gsSerial', type: 'string' },
          { name: 'ipfsCid', type: 'string' },
          { name: 'amount', type: 'uint256' },
          { name: 'recipient', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ]
      };

      // Get the actual recipient (minter) address and their nonce
      const recipient = address; // The person signing will be the recipient
      let nonce;
      try {
        nonce = Number(await carbon.nonces(recipient));
      } catch (nonceError) {
        console.error('Error fetching nonce:', nonceError);
        toast.error('Cannot connect to carbon contract. Make sure you are on the correct network.');
        return;
      }

      const attestationValue = {
        gsProjectId: formData.gsProjectId.trim(),
        gsSerial: formData.gsSerial.trim(),
        ipfsCid: formData.ipfsCid.trim(),
        amount: Number(formData.amount),
        recipient,
        nonce
      };

      // Use the modern signTypedData method
      toast.loading('Please sign the attestation in your wallet...', { id: 'signing' });
      
      const signature = await signer.signTypedData(domain, types, attestationValue);
      
      toast.dismiss('signing');
      toast.success('🎉 Attestation signed successfully!');
      
      // Include additional data for the mint step
      onSigned({ 
        signature, 
        payload: { 
          ...attestationValue, 
          vintage: formData.vintage 
        }, 
        signer: address,
        nonce 
      });
      
    } catch (error) {
      console.error('Signing error:', error);
      toast.dismiss('signing');
      
      let errorMessage = 'Error signing attestation: ';
      if (error.message.includes('user rejected')) {
        errorMessage = 'Attestation signing was cancelled by user.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for transaction fees.';
      } else {
        errorMessage += error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  // Simple input field component without complex memoization to fix focus issues
  const InputField = ({ label, field, type = 'text', placeholder, icon: Icon, suffix, ...props }) => {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-carbon-700">
          {Icon && <Icon className="w-4 h-4 inline mr-2" />}
          {label}
        </label>
        <div className="relative">
          <input
            type={type}
            placeholder={placeholder}
            value={formData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`input-field ${suffix ? 'pr-16' : ''} ${
              validationErrors[field] ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''
            }`}
            autoComplete="off"
            spellCheck="false"
            {...props}
          />
          {suffix && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-carbon-500 text-sm">{suffix}</span>
            </div>
          )}
        </div>
        {validationErrors[field] && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            {validationErrors[field]}
          </p>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-carbon-900">Verifier Attestation</h3>
          <p className="text-sm text-carbon-600">Sign the carbon credit attestation using EIP-712</p>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-purple-50 border border-purple-200 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="w-5 h-5 text-purple-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-purple-900">About Verifier Attestation</p>
            <p className="text-purple-700 mt-1">
              As a registered verifier, you're attesting to the validity of this carbon credit project.
              Your digital signature creates an immutable record on the blockchain using EIP-712 standard.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Uploaded File Info */}
      {uploadedData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DocumentCheckIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-900">Document Uploaded</p>
              <p className="text-sm text-green-700">{uploadedData.name}</p>
              <p className="text-xs text-green-600 font-mono mt-1">IPFS: {uploadedData.cid}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Wallet Connection */}
      {!isWalletConnected ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center"
        >
          <WalletIcon className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <h4 className="font-semibold text-yellow-900 mb-2">Connect Your Wallet</h4>
          <p className="text-sm text-yellow-700 mb-4">
            Connect your wallet to sign the attestation as a registered verifier
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectWallet}
            className="btn-primary inline-flex items-center space-x-2"
          >
            <WalletIcon className="w-5 h-5" />
            <span>Connect Wallet</span>
          </motion.button>
          {validationErrors.wallet && (
            <p className="mt-2 text-sm text-red-600">{validationErrors.wallet}</p>
          )}
        </motion.div>
      ) : (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Wallet Connected</p>
                  <p className="text-sm text-green-700 font-mono">{walletAddress}</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => checkVerifierStatus(walletAddress)}
                disabled={checkingVerifier}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center space-x-1"
              >
                {checkingVerifier ? (
                  <ArrowPathIcon className="w-3 h-3 animate-spin" />
                ) : (
                  <ArrowPathIcon className="w-3 h-3" />
                )}
                <span>Refresh Status</span>
              </motion.button>
            </div>
          </div>

          {/* Verifier Status */}
          <div className={`border rounded-lg p-4 ${
            isVerifier 
              ? 'bg-green-50 border-green-200'
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isVerifier
                    ? 'bg-green-100'
                    : 'bg-orange-100'
                }`}>
                  <ShieldCheckIcon className={`w-5 h-5 ${
                    isVerifier ? 'text-green-600' : 'text-orange-600'
                  }`} />
                </div>
                <div>
                  <p className={`font-medium ${
                    isVerifier ? 'text-green-900' : 'text-orange-900'
                  }`}>
                    {isVerifier ? 'Registered Verifier' : 'Not Registered'}
                  </p>
                  <p className={`text-sm ${
                    isVerifier ? 'text-green-700' : 'text-orange-700'
                  }`}>
                    {isVerifier 
                      ? 'You can sign attestations for carbon credits'
                      : 'Register your wallet to become a verifier for testing'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                {!isVerifier && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={registerAsVerifier}
                      disabled={checkingVerifier}
                      className="btn-primary text-sm px-4 py-2 flex items-center space-x-2"
                    >
                      {checkingVerifier ? (
                        <>
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                          <span>Registering...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheckIcon className="w-4 h-4" />
                          <span>Register as Verifier</span>
                        </>
                      )}
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        // Demo mode - simulate verifier registration without blockchain call
                        toast.loading('Activating demo verifier mode...', { id: 'demo' });
                        setTimeout(() => {
                          toast.dismiss('demo');
                          toast.success('🎭 Demo Verifier Mode Activated!');
                          setIsVerifier(true);
                        }, 1500);
                      }}
                      disabled={checkingVerifier}
                      className="btn-secondary text-sm px-3 py-2 flex items-center space-x-1.5"
                    >
                      <SparklesIcon className="w-4 h-4" />
                      <span>Demo Mode</span>
                    </motion.button>
                  </>
                )}
              </div>
            </div>
            
            {!isVerifier && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <SparklesIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Quick Demo Option:</p>
                    <p>Use "Demo Mode" to simulate verifier registration without blockchain transactions. Perfect for testing the complete flow!</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Attestation Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Project ID"
          field="gsProjectId"
          placeholder="GS-1234 or VCS-12345"
          icon={IdentificationIcon}
        />
        
        <InputField
          label="Serial Number"
          field="gsSerial"
          placeholder="ABC-123-456-789"
          icon={HashtagIcon}
        />
        
        <InputField
          label="Vintage Year"
          field="vintage"
          type="number"
          placeholder="2023"
          min="2000"
          max={new Date().getFullYear() + 1}
          icon={DocumentCheckIcon}
        />
        
        <InputField
          label="Credit Amount"
          field="amount"
          type="number"
          placeholder="100"
          min="1"
          step="0.01"
          suffix="CO2e tons"
          icon={CubeIcon}
        />
      </div>
      
      <InputField
        label="IPFS Document CID"
        field="ipfsCid"
        placeholder="QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX"
        icon={ClipboardDocumentCheckIcon}
        readOnly={!!uploadedData?.cid}
      />

      {/* Action Buttons */}
      <div className="flex space-x-4 pt-4">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={sign}
          disabled={isLoading || !isWalletConnected}
          className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
              <span>Signing Attestation...</span>
            </>
          ) : (
            <>
              <ShieldCheckIcon className="w-5 h-5" />
              <span>Sign Attestation</span>
            </>
          )}
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setFormData({
              gsProjectId: '',
              gsSerial: '',
              ipfsCid: uploadedData?.cid || '',
              amount: 1,
              vintage: new Date().getFullYear()
            });
            setValidationErrors({});
          }}
          className="btn-secondary px-6"
          disabled={isLoading}
        >
          Reset Form
        </motion.button>
      </div>
      
      {/* EIP-712 Info */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-carbon-50 border border-carbon-200 rounded-lg p-4"
      >
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-carbon-100 rounded-full flex items-center justify-center">
            <span className="text-carbon-600 font-bold text-xs">ℹ</span>
          </div>
          <div className="text-sm">
            <p className="font-medium text-carbon-900">EIP-712 Structured Data Signing</p>
            <p className="text-carbon-700 mt-1">
              This attestation uses the EIP-712 standard for secure, readable transaction signing.
              Your signature will be cryptographically linked to the project data above.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
