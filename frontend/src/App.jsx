import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import authService from './services/auth.js';
import blockchainService from './services/blockchain.js';

// Layout Components
import Layout from './components/Layout';

// Auth Components
import Welcome from './components/Welcome';
import Login from './components/Login';
import Signup from './components/Signup';

// Page Components
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import Upload from './Upload';
import SignAttestation from './SignAttestation';
import Mint from './Mint';
import MyTokens from './MyTokens';
import MarketplacePage from './MarketplacePage';
import Retire from './Retire';
import MintCreditsPage, { DemoCreditsProvider } from './MintCreditsPage';
import PortfolioPage from './PortfolioPage';
import MintWorkflow from './MintWorkflow';
import CarbonPortfolio from './CarbonPortfolio';

export default function App() {
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'login', 'signup', 'app'
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [uploaded, setUploaded] = useState(null);
  const [signed, setSigned] = useState(null);
  const [mintStep, setMintStep] = useState(1);

  // Check for existing wallet connection and user session on load
  useEffect(() => {
    checkUserSession();
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        } else {
          setWalletAddress(null);
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const checkUserSession = async () => {
    // Initialize authentication service and check for existing session
    try {
      const sessionUser = authService.initializeSession();
      if (sessionUser) {
        setUser(sessionUser);
        setCurrentView('app');
        
        // If user has wallet address, try to reconnect
        if (sessionUser.walletAddress) {
          try {
            await blockchainService.initialize();
          } catch (error) {
            console.warn('Failed to initialize blockchain service:', error.message);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check user session:', error);
    }
  };

  const checkWalletConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    }
  };

  const connectWallet = async () => {
    try {
      if (authService.isUserAuthenticated()) {
        const walletInfo = await authService.connectWallet();
        setWalletAddress(walletInfo.address);
        return walletInfo.address;
      } else {
        // User not logged in, just connect wallet without saving to profile
        const walletInfo = await blockchainService.connectWallet();
        setWalletAddress(walletInfo.address);
        return walletInfo.address;
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('app');
    
    // Initialize blockchain service if user has wallet
    if (userData.walletAddress) {
      blockchainService.initialize().catch(error => {
        console.warn('Failed to initialize blockchain service:', error.message);
      });
    }
  };

  const handleLogout = () => {
    // Use auth service to logout
    authService.logout();
    setUser(null);
    setWalletAddress(null);
    setCurrentView('welcome');
    setCurrentPage('dashboard');
  };

  const resetMintFlow = () => {
    setUploaded(null);
    setSigned(null);
    setMintStep(1);
  };

  const handleSigned = (data) => {
    setSigned(data);
    setMintStep(3);
  };

  const handleUploaded = (data) => {
    setUploaded(data);
    setMintStep(2);
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard walletAddress={walletAddress} onPageChange={setCurrentPage} />;
      
      case 'tokens':
        return <MyTokens onShow={setCurrentPage} />;
      
      case 'mint':
        return (
          <MintPage
            mintStep={mintStep}
            uploaded={uploaded}
            signed={signed}
            onReset={resetMintFlow}
            onUploaded={handleUploaded}
            onSigned={handleSigned}
          />
        );
      
      case 'mintCredits':
        return (
          <DemoCreditsProvider>
            <MintCreditsPage onNavigate={setCurrentPage} />
          </DemoCreditsProvider>
        );
      
      case 'portfolio':
        return (
          <DemoCreditsProvider>
            <PortfolioPage onNavigate={setCurrentPage} />
          </DemoCreditsProvider>
        );
      
      case 'market':
        return <MarketplacePage onShow={setCurrentPage} />;
      
      case 'retire':
        return <Retire />;
      
      case 'analytics':
        return <div className="p-8"><h1 className="text-2xl font-bold">Analytics - Coming Soon</h1></div>;

      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;
      
      case 'mintWorkflow':
        return <MintWorkflow />;
      
      case 'carbonPortfolio':
        return <CarbonPortfolio walletAddress={walletAddress} />;
      
      default:
        return <Dashboard walletAddress={walletAddress} onPageChange={setCurrentPage} />;
    }
  };

  // If user is not authenticated, show auth flow
  if (!user || currentView !== 'app') {
    return (
      <>
        <AnimatePresence mode="wait">
          {currentView === 'welcome' && (
            <Welcome onShowAuth={setCurrentView} />
          )}
          {currentView === 'login' && (
            <Login onShowAuth={setCurrentView} onLogin={handleLogin} />
          )}
          {currentView === 'signup' && (
            <Signup onShowAuth={setCurrentView} onLogin={handleLogin} />
          )}
        </AnimatePresence>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#334155',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
            },
          }}
        />
      </>
    );
  }

  // Main app for authenticated users
  return (
    <>
      <DemoCreditsProvider>
        <Layout
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          walletAddress={walletAddress}
          onConnectWallet={connectWallet}
          user={user}
          onLogout={handleLogout}
        >
          <AnimatePresence mode="wait">
            {renderCurrentPage()}
          </AnimatePresence>
        </Layout>
      </DemoCreditsProvider>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#334155',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
          },
        }}
      />
    </>
  );
}

// Enhanced Mint Page Component
function MintPage({ mintStep, uploaded, signed, onReset, onUploaded, onSigned }) {
  const steps = [
    {
      id: 1,
      title: 'Upload Document',
      description: 'Upload project documentation to IPFS',
      icon: '📄',
      completed: !!uploaded
    },
    {
      id: 2,
      title: 'Sign Attestation',
      description: 'Verifier signs the EIP-712 attestation',
      icon: '✍️',
      completed: !!signed
    },
    {
      id: 3,
      title: 'Mint Tokens',
      description: 'Create carbon credit tokens on blockchain',
      icon: '🪙',
      completed: false
    }
  ];

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
            <span className="text-2xl">🌱</span>
          </div>
          <h1 className="text-4xl font-bold text-carbon-900">Mint Carbon Credits</h1>
        </div>
        <p className="text-lg text-carbon-600 max-w-2xl mx-auto">
          Transform your environmental impact projects into verified carbon credits through our secure, 
          blockchain-based minting process.
        </p>
      </motion.div>

      {/* Enhanced Progress Steps */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-12"
      >
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-carbon-200">
            <motion.div
              className="h-full bg-primary-500"
              initial={{ width: '0%' }}
              animate={{ width: `${((mintStep - 1) / 2) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isActive = mintStep >= step.id;
              const isCompleted = step.completed;
              
              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + index * 0.1 }}
                  className="flex flex-col items-center max-w-xs"
                >
                  {/* Step Circle */}
                  <div className={`relative w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-300 ${
                    isCompleted
                      ? 'bg-green-100 border-green-500 text-green-600'
                      : isActive
                      ? 'bg-primary-100 border-primary-500 text-primary-600'
                      : 'bg-white border-carbon-300 text-carbon-400'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    ) : (
                      <span>{step.icon}</span>
                    )}
                    
                    {/* Step Number Badge */}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      isActive ? 'bg-primary-500 text-white' : 'bg-carbon-300 text-white'
                    }`}>
                      {step.id}
                    </div>
                  </div>
                  
                  {/* Step Info */}
                  <div className="mt-4 text-center">
                    <h3 className={`text-sm font-semibold ${
                      isActive ? 'text-primary-700' : 'text-carbon-600'
                    }`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs mt-1 max-w-32 ${
                      isActive ? 'text-primary-600' : 'text-carbon-500'
                    }`}>
                      {step.description}
                    </p>
                    {isCompleted && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-2"
                      >
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                          ✓ Completed
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
        
        {/* Reset Button */}
        <div className="flex justify-center mt-8">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="btn-secondary inline-flex items-center space-x-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            <span>Reset Process</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Step Content */}
      <div className="space-y-8">
        <AnimatePresence mode="wait">
          {mintStep >= 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="card relative overflow-hidden"
            >
              {/* Step Header */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
              <Upload onUploaded={onUploaded} />
            </motion.div>
          )}
          
          {mintStep >= 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.1 }}
              className="card relative overflow-hidden"
            >
              {/* Step Header */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600" />
              <SignAttestation uploadedData={uploaded} onSigned={onSigned} />
            </motion.div>
          )}
          
          {mintStep >= 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.2 }}
              className="card relative overflow-hidden"
            >
              {/* Step Header */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600" />
              <Mint signedData={signed} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
