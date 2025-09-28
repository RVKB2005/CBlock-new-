import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  DocumentArrowUpIcon,
  ShieldCheckIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  WalletIcon,
  CubeTransparentIcon,
  ChartBarIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import Upload from './Upload';
import SignAttestation from './SignAttestation';
import Mint from './Mint';
import CarbonABI from './abis/Carbon.json';
import VerifierRegistryABI from './abis/VerifierRegistry.json';

const WORKFLOW_STEPS = [
  {
    id: 'upload',
    title: 'Upload Document',
    description: 'Upload carbon project document to IPFS',
    icon: DocumentArrowUpIcon,
    color: 'blue'
  },
  {
    id: 'sign',
    title: 'Sign Attestation',
    description: 'Verifier signs the carbon credit attestation',
    icon: ShieldCheckIcon,
    color: 'purple'
  },
  {
    id: 'mint',
    title: 'Mint Credits',
    description: 'Mint carbon credits on the blockchain',
    icon: SparklesIcon,
    color: 'green'
  }
];

export default function MintWorkflow() {
  const [currentStep, setCurrentStep] = useState('upload');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [uploadedData, setUploadedData] = useState(null);
  const [signedData, setSignedData] = useState(null);
  const [uploaderInfo, setUploaderInfo] = useState(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [isVerifier, setIsVerifier] = useState(false);
  const [isCheckingVerifier, setIsCheckingVerifier] = useState(false);
  const [contractInfo, setContractInfo] = useState({
    carbonAddress: '',
    registryAddress: '',
    isDeployed: false
  });
  const [networkInfo, setNetworkInfo] = useState({
    chainId: null,
    name: ''
  });

  useEffect(() => {
    initializeContracts();
    checkWalletConnection();
  }, []);

  const initializeContracts = async () => {
    const carbonAddress = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;
    const registryAddress = import.meta.env.VITE_CONTRACT_VERIFIER_REGISTRY_ADDRESS;

    setContractInfo({
      carbonAddress: carbonAddress || '',
      registryAddress: registryAddress || '',
      isDeployed: !!(carbonAddress && registryAddress &&
        carbonAddress !== 'YOUR_CARBON_CREDIT_CONTRACT_ADDRESS' &&
        registryAddress !== 'YOUR_VERIFIER_REGISTRY_ADDRESS')
    });

    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        setNetworkInfo({
          chainId: Number(network.chainId),
          name: network.name || 'Unknown'
        });
      } catch (error) {
        console.error('Error getting network info:', error);
      }
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await checkVerifierStatus(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet:', error);
      }
    }
  };

  const checkVerifierStatus = async (address) => {
    if (!address || !contractInfo.isDeployed) return;

    setIsCheckingVerifier(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const registry = new ethers.Contract(contractInfo.registryAddress, VerifierRegistryABI, provider);
      const isRegisteredVerifier = await registry.isVerifier(address);
      setIsVerifier(isRegisteredVerifier);
    } catch (error) {
      console.error('Error checking verifier status:', error);
    } finally {
      setIsCheckingVerifier(false);
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
        toast.success('Wallet connected successfully!');
        await checkVerifierStatus(accounts[0]);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const registerAsVerifier = async () => {
    if (!walletAddress || !contractInfo.isDeployed) return;

    setIsCheckingVerifier(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const registry = new ethers.Contract(contractInfo.registryAddress, VerifierRegistryABI, signer);

      toast.loading('Registering as verifier...', { id: 'registering' });

      const tx = await registry.addVerifier(walletAddress);
      await tx.wait();

      toast.dismiss('registering');
      toast.success('🎉 Successfully registered as a verifier!');

      setIsVerifier(true);
    } catch (error) {
      console.error('Error registering as verifier:', error);
      toast.dismiss('registering');

      let errorMessage = 'Failed to register as verifier';
      if (error.message.includes('Not governor executor')) {
        errorMessage = 'Only the governance executor can add verifiers. Use the demo mode for testing.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Registration was cancelled by user.';
      }

      toast.error(errorMessage);
    } finally {
      setIsCheckingVerifier(false);
    }
  };

  const activateDemoVerifier = () => {
    toast.loading('Activating demo verifier mode...', { id: 'demo' });
    setTimeout(() => {
      toast.dismiss('demo');
      toast.success('🎭 Demo Verifier Mode Activated!');
      setIsVerifier(true);
    }, 1500);
  };

  const handleUploadComplete = (data, uploader) => {
    setUploadedData(data);
    setUploaderInfo(uploader);
    setCompletedSteps(prev => new Set([...prev, 'upload']));
    setCurrentStep('sign');
    toast.success('📄 Document uploaded! Ready for attestation.');
  };

  const handleSignComplete = (data) => {
    setSignedData(data);
    setCompletedSteps(prev => new Set([...prev, 'sign']));
    setCurrentStep('mint');
    toast.success('✅ Attestation signed! Ready to mint carbon credits.');
  };

  const handleMintComplete = () => {
    setCompletedSteps(prev => new Set([...prev, 'mint']));
    toast.success('🎉 Carbon credits minted successfully!');
  };

  const resetWorkflow = () => {
    setCurrentStep('upload');
    setCompletedSteps(new Set());
    setUploadedData(null);
    setSignedData(null);
    setUploaderInfo(null);
    toast.success('Workflow reset. Ready to start over!');
  };

  const StepIndicator = ({ step, isActive, isCompleted }) => {
    const Icon = step.icon;
    const colorClasses = {
      blue: isCompleted ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400',
      purple: isCompleted ? 'bg-purple-600 text-white' : isActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400',
      green: isCompleted ? 'bg-green-600 text-white' : isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
    };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 ${isCompleted ? 'border-green-200 bg-green-50' :
            isActive ? `border-${step.color}-200 bg-${step.color}-50` :
              'border-gray-200 bg-gray-50'
          }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[step.color]}`}>
          {isCompleted ? (
            <CheckCircleIcon className="w-6 h-6" />
          ) : (
            <Icon className="w-6 h-6" />
          )}
        </div>
        <h3 className={`mt-3 font-semibold text-sm ${isCompleted ? 'text-green-900' :
            isActive ? `text-${step.color}-900` :
              'text-gray-500'
          }`}>
          {step.title}
        </h3>
        <p className={`text-xs text-center mt-1 ${isCompleted ? 'text-green-700' :
            isActive ? `text-${step.color}-700` :
              'text-gray-500'
          }`}>
          {step.description}
        </p>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <CubeTransparentIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Carbon Credits Minting
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Complete the three-step process to mint verified carbon credits on the blockchain
          </p>
        </motion.div>

        {/* System Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Wallet Status */}
          <div className={`p-4 rounded-xl border ${walletAddress ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
            <div className="flex items-center space-x-2">
              <WalletIcon className={`w-5 h-5 ${walletAddress ? 'text-green-600' : 'text-orange-600'}`} />
              <span className={`font-medium text-sm ${walletAddress ? 'text-green-900' : 'text-orange-900'}`}>
                {walletAddress ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            {walletAddress && (
              <p className="text-xs text-green-700 font-mono mt-1">{walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}</p>
            )}
          </div>

          {/* Verifier Status */}
          <div className={`p-4 rounded-xl border ${isVerifier ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
            }`}>
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className={`w-5 h-5 ${isVerifier ? 'text-green-600' : 'text-orange-600'}`} />
              <span className={`font-medium text-sm ${isVerifier ? 'text-green-900' : 'text-orange-900'}`}>
                {isCheckingVerifier ? 'Checking...' : isVerifier ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>

          {/* Contracts Status */}
          <div className={`p-4 rounded-xl border ${contractInfo.isDeployed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
            <div className="flex items-center space-x-2">
              <CubeTransparentIcon className={`w-5 h-5 ${contractInfo.isDeployed ? 'text-green-600' : 'text-red-600'}`} />
              <span className={`font-medium text-sm ${contractInfo.isDeployed ? 'text-green-900' : 'text-red-900'}`}>
                {contractInfo.isDeployed ? 'Deployed' : 'Not Deployed'}
              </span>
            </div>
          </div>

          {/* Network Status */}
          <div className={`p-4 rounded-xl border ${networkInfo.chainId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
            }`}>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-sm text-blue-900">
                {networkInfo.chainId ? `Chain ${networkInfo.chainId}` : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        {(!walletAddress || !isVerifier || !contractInfo.isDeployed) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8"
          >
            <div className="flex items-start space-x-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-3">Setup Required</h3>
                <div className="space-y-3">
                  {!walletAddress && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">Connect your wallet to continue</span>
                      <button
                        onClick={connectWallet}
                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  )}

                  {walletAddress && !isVerifier && contractInfo.isDeployed && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">Register as a verifier to sign attestations</span>
                      <div className="space-x-2">
                        <button
                          onClick={registerAsVerifier}
                          disabled={isCheckingVerifier}
                          className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {isCheckingVerifier ? 'Registering...' : 'Register'}
                        </button>
                        <button
                          onClick={activateDemoVerifier}
                          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium transition-colors"
                        >
                          Demo Mode
                        </button>
                      </div>
                    </div>
                  )}

                  {walletAddress && !isVerifier && !contractInfo.isDeployed && (
                    <div className="flex items-center justify-between">
                      <span className="text-yellow-800">Smart contracts not deployed. Use demo mode for testing.</span>
                      <button
                        onClick={activateDemoVerifier}
                        className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium transition-colors"
                      >
                        Demo Mode
                      </button>
                    </div>
                  )}

                  {!contractInfo.isDeployed && (
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-yellow-800 block">Smart contracts not deployed</span>
                        <span className="text-yellow-700 text-sm">Deploy contracts or set environment variables</span>
                      </div>
                      <button
                        onClick={() => {
                          toast.error('Please deploy contracts first or check your environment configuration');
                        }}
                        className="px-4 py-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium transition-colors"
                      >
                        Deploy Contracts
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Workflow Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          {WORKFLOW_STEPS.map((step, index) => (
            <StepIndicator
              key={step.id}
              step={step}
              isActive={currentStep === step.id}
              isCompleted={completedSteps.has(step.id)}
            />
          ))}
        </motion.div>

        {/* Current Step Content */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-lg p-8 mb-8"
        >
          <AnimatePresence mode="wait">
            {currentStep === 'upload' && (
              <Upload
                key="upload"
                onUploaded={(data) => handleUploadComplete(data, data.uploaderAddress)}
                user={{ accountType: isVerifier ? 'verifier' : 'individual' }}
              />
            )}

            {currentStep === 'sign' && (
              <SignAttestation
                key="sign"
                uploadedData={uploadedData}
                uploaderAddress={uploaderInfo}
                onSigned={handleSignComplete}
              />
            )}

            {currentStep === 'mint' && (
              <Mint
                key="mint"
                signedData={signedData}
                onMintComplete={handleMintComplete}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => {
              const steps = WORKFLOW_STEPS.map(s => s.id);
              const currentIndex = steps.indexOf(currentStep);
              if (currentIndex > 0) {
                setCurrentStep(steps[currentIndex - 1]);
              }
            }}
            disabled={currentStep === 'upload'}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous Step
          </button>

          <div className="flex space-x-4">
            <button
              onClick={resetWorkflow}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Reset Workflow</span>
            </button>

            <button
              onClick={() => {
                const steps = WORKFLOW_STEPS.map(s => s.id);
                const currentIndex = steps.indexOf(currentStep);
                if (currentIndex < steps.length - 1) {
                  setCurrentStep(steps[currentIndex + 1]);
                }
              }}
              disabled={currentStep === 'mint' || !completedSteps.has(currentStep)}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-xl hover:from-green-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
