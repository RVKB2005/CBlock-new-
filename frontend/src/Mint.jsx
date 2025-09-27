import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
  SparklesIcon,
  InformationCircleIcon,
  ShieldCheckIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import blockchainService from './services/blockchain.js';
import CarbonABI from './abis/Carbon.json';

export default function Mint({ signedData }) {
  const [formData, setFormData] = useState({
    gsProjectId: '',
    gsSerial: '',
    vintage: new Date().getFullYear(),
    quantity: 1,
    ipfsHash: '',
    recipient: ''
  });
  const [signature, setSignature] = useState('');
  const [nonce, setNonce] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null); // 'pending', 'confirmed', 'error'
  const [transactionHash, setTransactionHash] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Auto-populate fields when attestation is signed
  useEffect(() => {
    if (signedData && signedData.payload) {
      const { gsProjectId, gsSerial, ipfsCid, quantity, vintage, recipient } = signedData.payload;
      setFormData({
        gsProjectId: gsProjectId || '',
        gsSerial: gsSerial || '',
        vintage: vintage || new Date().getFullYear(),
        quantity: quantity || 1,
        ipfsHash: ipfsCid || '',
        recipient: recipient || ''
      });
      setSignature(signedData.signature || '');
      setNonce(signedData.nonce !== undefined ? signedData.nonce : '');
    }
  }, [signedData]);

  // Auto-populate recipient with current wallet address
  useEffect(() => {
    const getCurrentAddress = async () => {
      if (window.ethereum && !formData.recipient) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setFormData(prev => ({ ...prev, recipient: accounts[0] }));
          }
        } catch (error) {
          console.error('Error getting current address:', error);
        }
      }
    };
    getCurrentAddress();
  }, [formData.recipient]);

  const validateForm = () => {
    const errors = {};

    if (!formData.gsProjectId.trim()) errors.gsProjectId = 'Project ID is required';
    if (!formData.gsSerial.trim()) errors.gsSerial = 'Serial number is required';
    if (!formData.vintage || formData.vintage < 2000) errors.vintage = 'Valid vintage year is required';
    if (!formData.quantity || formData.quantity <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (!formData.ipfsHash.trim()) errors.ipfsHash = 'IPFS hash is required';
    if (!formData.recipient.trim()) errors.recipient = 'Recipient address is required';
    if (!signature.trim()) errors.signature = 'Verifier signature is required';

    // Validate Ethereum address format
    if (formData.recipient && !ethers.isAddress(formData.recipient)) {
      errors.recipient = 'Invalid Ethereum address format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateDemoSignature = () => {
    // Generate a realistic-looking demo signature
    const demoSig = '0x' + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setSignature(demoSig);
    toast.success('🎭 Demo signature generated! Ready for demo minting.');
    setValidationErrors(prev => ({ ...prev, signature: '' }));
  };

  const demoMint = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before proceeding');
      return;
    }

    setIsLoading(true);
    setTransactionStatus('pending');

    try {
      toast.loading('🎭 Demo Mode: Simulating carbon credit minting...', { id: 'demo-mint' });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Generate fake transaction hash
      const fakeHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

      setTransactionHash(fakeHash);
      setTransactionStatus('confirmed');

      toast.dismiss('demo-mint');
      toast.success(`🎉 Demo Mode: Carbon credits minted successfully!\n${formData.quantity} CO2e tons minted to ${formData.recipient}`);

      // Reset form after successful demo mint
      setTimeout(() => {
        if (window.confirm('Demo carbon credits minted successfully! Would you like to mint more credits?')) {
          resetForm();
        }
      }, 3000);

    } catch (error) {
      console.error('Demo mint error:', error);
      setTransactionStatus('error');
      toast.dismiss('demo-mint');
      toast.error('Demo mint failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const mint = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors before proceeding');
      return;
    }

    if (!window.ethereum) {
      toast.error('Please install MetaMask to mint carbon credits');
      return;
    }

    setIsLoading(true);
    setTransactionStatus(null);

    try {
      // Initialize blockchain service if needed
      if (!blockchainService.isInitialized) {
        await blockchainService.initialize();
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const carbonAddress = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;

      if (!carbonAddress || carbonAddress === '0x0000000000000000000000000000000000000000') {
        toast.error('Smart contract not deployed. Please check your configuration.');
        return;
      }

      const carbon = new ethers.Contract(carbonAddress, CarbonABI, signer);

      // Prepare the data according to the ABI signature
      console.log('🔍 Debug Info:');
      console.log('- Signature:', signature);
      console.log('- Form data:', formData);
      console.log('- Signer address:', await signer.getAddress());

      // Check if the signer is a registered verifier
      const verifierRegistryAddress = import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;
      if (verifierRegistryAddress) {
        const verifierABI = ["function isVerifier(address account) external view returns (bool)"];
        const verifierRegistry = new ethers.Contract(verifierRegistryAddress, verifierABI, provider);
        const signerAddress = await signer.getAddress();
        const isVerifier = await verifierRegistry.isVerifier(signerAddress);
        console.log('- Is signer a verifier?', isVerifier);

        if (!isVerifier) {
          toast.error('Current wallet is not registered as a verifier. Please switch to the verifier wallet or register this wallet as a verifier.');
          return;
        }
      }

      // Check current nonce for recipient
      const currentNonce = await carbon.nonces(formData.recipient);
      console.log('- Current nonce for recipient:', currentNonce.toString());
      console.log('- Expected nonce:', nonce);

      if (Number(currentNonce) !== nonce) {
        toast.error(`Nonce mismatch! Expected ${nonce}, but contract has ${currentNonce}. Please sign the attestation again.`);
        return;
      }

      const tx = await carbon.mintWithAttestation(
        formData.gsProjectId,
        formData.gsSerial,
        formData.ipfsHash,
        BigInt(formData.quantity), // Convert quantity to BigInt for precise handling
        formData.recipient,
        signature, // This should be the bytes signature from EIP-712
        { gasLimit: 500000 } // Fixed: Add gas limit to prevent estimation issues
      );

      setTransactionHash(tx.hash);
      setTransactionStatus('pending');
      toast.success(`Transaction submitted! Hash: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      setTransactionStatus('confirmed');
      toast.success(`✅ Carbon credits minted successfully!\nBlock: ${receipt.blockNumber}`);

      // Reset form after successful mint with delay
      setTimeout(() => {
        if (window.confirm('Carbon credits minted successfully! Would you like to mint more credits?')) {
          resetForm();
        }
      }, 3000);

    } catch (error) {
      console.error('Minting error:', error);
      setTransactionStatus('error');

      let errorMessage = 'Error minting carbon credits: ';
      if (error.message.includes('attestation not signed by registered verifier')) {
        errorMessage = 'The signature is not from a registered verifier. Please ensure the attestation is signed by an authorized verifier.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees. Please ensure you have enough ETH in your wallet.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user.';
      } else if (error.message.includes('no matching fragment')) {
        errorMessage = 'Contract function signature mismatch. Please check the smart contract deployment.';
      } else {
        errorMessage += error.reason || error.message || 'Unknown error occurred';
      }

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      gsProjectId: '',
      gsSerial: '',
      vintage: new Date().getFullYear(),
      quantity: 1,
      ipfsHash: '',
      recipient: ''
    });
    setSignature('');
    setNonce('');
    setTransactionStatus(null);
    setTransactionHash('');
    setValidationErrors({});
  };

  const InputField = ({ label, field, type = 'text', placeholder, icon: Icon, ...props }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2"
    >
      <label className="block text-sm font-medium text-carbon-700">
        {Icon && <Icon className="w-4 h-4 inline mr-2" />}
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className={`input-field ${validationErrors[field] ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
          {...props}
        />
        {validationErrors[field] && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            {validationErrors[field]}
          </motion.p>
        )}
      </div>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
          <SparklesIcon className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-carbon-900">Mint Carbon Credits</h3>
          <p className="text-sm text-carbon-600">Create new carbon credits with verifier attestation</p>
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
            <p className="font-medium text-blue-900">Attestation Required</p>
            <p className="text-blue-700 mt-1">
              All carbon credits must be verified by a registered verifier before minting.
              {!signature && ' Please complete the attestation process first.'}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <InputField
          label="Project ID"
          field="gsProjectId"
          placeholder="GS-1234"
          icon={DocumentCheckIcon}
        />

        <InputField
          label="Serial Number"
          field="gsSerial"
          placeholder="ABC-123-456"
        />

        <InputField
          label="Vintage Year"
          field="vintage"
          type="number"
          placeholder="2023"
          min="2000"
          max={new Date().getFullYear() + 1}
        />

        <InputField
          label="Quantity (CO2e tons)"
          field="quantity"
          type="number"
          placeholder="100"
          min="1"
          step="0.01"
        />
      </div>

      <InputField
        label="IPFS Document Hash"
        field="ipfsHash"
        placeholder="QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX"
      />

      <InputField
        label="Recipient Address"
        field="recipient"
        placeholder="0x742d35Cc6634C0532925a3b8D8095d8e9f3c1234"
      />

      {/* Signature Field */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <label className="block text-sm font-medium text-carbon-700">
          <DocumentCheckIcon className="w-4 h-4 inline mr-2" />
          Verifier Signature
        </label>
        <textarea
          placeholder="0x1234567890abcdef... (Generated from attestation process)"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          rows={4}
          className={`input-field resize-none ${validationErrors.signature ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`}
          style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}
        />
        {validationErrors.signature && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-1 text-sm text-red-600 flex items-center"
          >
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            {validationErrors.signature}
          </motion.p>
        )}

        {/* Demo Helper */}
        {!signature && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-2">
                <SparklesIcon className="w-4 h-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">Need a Signature for Testing?</p>
                  <p>Generate a demo signature to test the complete minting flow without verifier registration.</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateDemoSignature}
                className="btn-secondary text-xs px-3 py-1.5 flex items-center space-x-1.5"
              >
                <SparklesIcon className="w-3 h-3" />
                <span>Generate Demo Signature</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Transaction Status */}
      <AnimatePresence>
        {transactionStatus && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border ${transactionStatus === 'pending' ? 'bg-yellow-50 border-yellow-200' :
              transactionStatus === 'confirmed' ? 'bg-green-50 border-green-200' :
                'bg-red-50 border-red-200'
              }`}
          >
            <div className="flex items-center space-x-3">
              {transactionStatus === 'pending' && <ArrowPathIcon className="w-5 h-5 text-yellow-600 animate-spin" />}
              {transactionStatus === 'confirmed' && <CheckCircleIcon className="w-5 h-5 text-green-600" />}
              {transactionStatus === 'error' && <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />}
              <div>
                <p className={`font-medium ${transactionStatus === 'pending' ? 'text-yellow-900' :
                  transactionStatus === 'confirmed' ? 'text-green-900' :
                    'text-red-900'
                  }`}>
                  {transactionStatus === 'pending' && 'Transaction Pending...'}
                  {transactionStatus === 'confirmed' && 'Carbon Credits Minted Successfully!'}
                  {transactionStatus === 'error' && 'Transaction Failed'}
                </p>
                {transactionHash && (
                  <p className={`text-sm mt-1 ${transactionStatus === 'pending' ? 'text-yellow-700' :
                    transactionStatus === 'confirmed' ? 'text-green-700' :
                      'text-red-700'
                    }`}>
                    Transaction Hash: <code className="font-mono text-xs">{transactionHash}</code>
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="space-y-4 pt-4">
        <div className="flex space-x-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={mint}
            disabled={isLoading}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Minting...</span>
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                <span>Mint Carbon Credits</span>
              </>
            )}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={demoMint}
            disabled={isLoading}
            className="btn-secondary px-6 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Demo Mint</span>
          </motion.button>
        </div>

        {/* Demo Info */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="flex items-start space-x-2">
            <SparklesIcon className="w-4 h-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p><strong>Two Minting Options:</strong></p>
              <p>• <strong>Mint Carbon Credits:</strong> Real blockchain transaction (requires registered verifier signature)</p>
              <p>• <strong>Demo Mint:</strong> Simulated transaction for testing the complete flow without blockchain costs</p>
            </div>
          </div>
        </motion.div>

        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetForm}
            className="btn-secondary px-8"
          >
            Reset Form
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
