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
import { NotificationsProvider } from './contexts/NotificationsContext.jsx';
import RoleGuard from './components/RoleGuard.jsx';
import RoleBasedRouter from './components/RoleBasedRouter.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { LoadingOverlay } from './components/LoadingStates.jsx';
import errorHandler from './services/errorHandler.js';
import toastNotifications from './components/ToastNotifications.jsx';
import { ROLES, PERMISSIONS } from './utils/permissions.js';

// Layout Components
import Layout from './components/Layout';

// Auth Components
import Welcome from './components/Welcome';
import Login from './components/Login';
import Signup from './components/Signup';

// Page Components
import Dashboard from './components/Dashboard';
import AnalyticsPage from './components/AnalyticsPage';
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
import VerifierDashboard from './components/VerifierDashboard';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  console.log('App component rendering');
  const [user, setUser] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [currentView, setCurrentView] = useState('welcome'); // 'welcome', 'login', 'signup', 'app'
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [uploaded, setUploaded] = useState(null);
  const [signed, setSigned] = useState(null);
  const [mintStep, setMintStep] = useState(1);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);

  // Check for existing wallet connection and user session on load
  useEffect(() => {
    console.log('useEffect triggered');
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
    console.log('checkUserSession called');
    setIsInitializing(true);

    try {
      const sessionUser = authService.initializeSession();
      console.log('sessionUser:', sessionUser);

      if (sessionUser) {
        setUser(sessionUser);
        setCurrentView('app');

        // Show welcome message for returning users
        toastNotifications.welcomeMessage(
          sessionUser.accountType || 'individual',
          sessionUser.firstName || 'User'
        );

        // If user has wallet address, try to reconnect
        if (sessionUser.walletAddress) {
          try {
            await blockchainService.initialize();
            console.log('blockchainService initialized');
          } catch (error) {
            console.warn('Failed to initialize blockchain service:', error.message);
            errorHandler.handleBlockchainError(
              error,
              'blockchain_initialization',
              {
                userRole: sessionUser.accountType,
                component: 'App',
                retryAction: () => blockchainService.initialize()
              }
            );
          }
        }
      }

      setInitializationError(null);
    } catch (error) {
      console.error('Failed to check user session:', error);
      const processedError = errorHandler.handleError(
        error,
        {
          operation: 'session_initialization',
          component: 'App',
          userRole: 'guest'
        },
        {
          showToast: true,
          showRetry: true,
          retryAction: checkUserSession
        }
      );
      setInitializationError(processedError);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkWalletConnection = async () => {
    console.log('checkWalletConnection called');
    console.log('window.ethereum:', window.ethereum);
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts'
        });
        console.log('accounts:', accounts);
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    } else {
      console.log('window.ethereum not available');
    }
  };

  const connectWallet = async () => {
    const currentUser = authService.getCurrentUser();
    const userRole = currentUser?.accountType || 'guest';

    try {
      toastNotifications.loading('Connecting wallet...', {
        id: 'wallet-connection',
        roleSpecific: true,
        operation: 'wallet_connection'
      });

      let walletInfo;
      if (authService.isUserAuthenticated()) {
        walletInfo = await authService.connectWallet();
        setWalletAddress(walletInfo.address);

        toastNotifications.success(
          `Wallet connected successfully! Address: ${walletInfo.address.slice(0, 6)}...${walletInfo.address.slice(-4)}`,
          {
            id: 'wallet-connection',
            roleSpecific: true,
            operation: 'wallet_connection',
            duration: 5000
          }
        );
      } else {
        // User not logged in, just connect wallet without saving to profile
        walletInfo = await blockchainService.connectWallet();
        setWalletAddress(walletInfo.address);

        toastNotifications.info(
          'Wallet connected. Please log in to save wallet to your profile.',
          {
            id: 'wallet-connection',
            roleSpecific: true,
            operation: 'wallet_connection'
          }
        );
      }

      return walletInfo.address;
    } catch (error) {
      console.error('Failed to connect wallet:', error);

      errorHandler.handleBlockchainError(
        error,
        'wallet_connection',
        {
          userRole,
          component: 'App',
          retryAction: connectWallet
        }
      );

      throw error;
    }
  };

  const handleLogin = async (userData) => {
    try {
      setUser(userData);
      setCurrentView('app');

      // Show welcome message
      toastNotifications.welcomeMessage(
        userData.accountType || 'individual',
        userData.firstName || 'User'
      );

      // Initialize blockchain service if user has wallet
      if (userData.walletAddress) {
        try {
          await blockchainService.initialize();
        } catch (error) {
          console.warn('Failed to initialize blockchain service:', error.message);
          errorHandler.handleBlockchainError(
            error,
            'blockchain_initialization',
            {
              userRole: userData.accountType,
              component: 'App',
              retryAction: () => blockchainService.initialize()
            }
          );
        }
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        {
          operation: 'user_login',
          component: 'App',
          userRole: userData?.accountType || 'guest'
        },
        {
          showToast: true,
          showRetry: false
        }
      );
    }
  };

  const handleLogout = () => {
    try {
      // Use auth service to logout
      authService.logout();
      setUser(null);
      setWalletAddress(null);
      setCurrentView('welcome');
      setCurrentPage('dashboard');

      toastNotifications.info('You have been logged out successfully', {
        duration: 3000
      });
    } catch (error) {
      errorHandler.handleError(
        error,
        {
          operation: 'user_logout',
          component: 'App'
        },
        {
          showToast: true,
          showRetry: false
        }
      );
    }
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
    console.log('renderCurrentPage called, currentPage:', currentPage);
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard walletAddress={walletAddress} onPageChange={setCurrentPage} />;

      case 'tokens':
        return (
          <RoleGuard
            allowedRoles={[ROLES.INDIVIDUAL, ROLES.BUSINESS, ROLES.VERIFIER]}
            requiredPermissions={[PERMISSIONS.VIEW_CREDITS]}
            user={user}
          >
            <MyTokens onShow={setCurrentPage} />
          </RoleGuard>
        );

      case 'verifierDashboard':
        return (
          <RoleGuard
            allowedRoles={[ROLES.VERIFIER]}
            requiredPermissions={[PERMISSIONS.VIEW_VERIFIER_DASHBOARD, PERMISSIONS.VIEW_ALL_DOCUMENTS]}
            user={user}
          >
            <VerifierDashboard />
          </RoleGuard>
        );

      case 'mint':
        return (
          <RoleGuard
            allowedRoles={[ROLES.INDIVIDUAL, ROLES.BUSINESS]}
            requiredPermissions={[PERMISSIONS.UPLOAD_DOCUMENT]}
            user={user}
          >
            <MintPage
              mintStep={mintStep}
              uploaded={uploaded}
              signed={signed}
              onReset={resetMintFlow}
              onUploaded={handleUploaded}
              onSigned={handleSigned}
              user={user}
            />
          </RoleGuard>
        );

      case 'mintCredits':
        return (
          <RoleGuard
            allowedRoles={[ROLES.INDIVIDUAL, ROLES.BUSINESS]}
            requiredPermissions={[PERMISSIONS.UPLOAD_DOCUMENT]}
            user={user}
          >
            <DemoCreditsProvider>
              <MintCreditsPage onNavigate={setCurrentPage} />
            </DemoCreditsProvider>
          </RoleGuard>
        );

      case 'portfolio':
        return (
          <RoleGuard
            allowedRoles={[ROLES.INDIVIDUAL, ROLES.BUSINESS, ROLES.VERIFIER]}
            requiredPermissions={[PERMISSIONS.VIEW_CREDITS]}
            user={user}
          >
            <DemoCreditsProvider>
              <PortfolioPage onNavigate={setCurrentPage} />
            </DemoCreditsProvider>
          </RoleGuard>
        );

      case 'market':
        return <MarketplacePage onShow={setCurrentPage} />;

      case 'retire':
        return (
          <RoleGuard
            allowedRoles={[ROLES.INDIVIDUAL, ROLES.BUSINESS, ROLES.VERIFIER]}
            requiredPermissions={[PERMISSIONS.VIEW_CREDITS]}
            user={user}
          >
            <Retire />
          </RoleGuard>
        );

      case 'analytics':
        return <AnalyticsPage walletAddress={walletAddress} />;

      case 'settings':
        return <SettingsPage user={user} onLogout={handleLogout} />;

      case 'admin':
        return (
          <RoleGuard
            allowedRoles={['admin']}
            requiredPermissions={['view_admin_dashboard']}
            user={user}
          >
            <AdminDashboard />
          </RoleGuard>
        );

      case 'mintWorkflow':
        return <MintWorkflow />;

      case 'carbonPortfolio':
        return <CarbonPortfolio walletAddress={walletAddress} />;

      default:
        return <Dashboard walletAddress={walletAddress} onPageChange={setCurrentPage} />;
    }
  };

  // Show loading overlay during initialization
  if (isInitializing) {
    return (
      <>
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
        <LoadingOverlay
          show={true}
          message="Initializing application..."
          userRole={user?.accountType || 'guest'}
          operation="app_initialization"
        />
      </>
    );
  }

  // If user is not authenticated, show auth flow
  console.log('Rendering auth flow, user:', user, 'currentView:', currentView);
  if (!user || currentView !== 'app') {
    return (
      <ErrorBoundary componentName="AuthFlow" context={{ currentView }}>
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
        <AnimatePresence mode="wait">
          {currentView === 'welcome' && (
            <ErrorBoundary componentName="Welcome">
              <Welcome onShowAuth={setCurrentView} />
            </ErrorBoundary>
          )}
          {currentView === 'login' && (
            <ErrorBoundary componentName="Login">
              <Login onShowAuth={setCurrentView} onLogin={handleLogin} />
            </ErrorBoundary>
          )}
          {currentView === 'signup' && (
            <ErrorBoundary componentName="Signup">
              <Signup onShowAuth={setCurrentView} onLogin={handleLogin} />
            </ErrorBoundary>
          )}
        </AnimatePresence>
      </ErrorBoundary>
    );
  }

  // Main app for authenticated users
  console.log('Rendering main app, user:', user, 'currentView:', currentView);
  return (
    <ErrorBoundary componentName="MainApp" context={{ user, currentPage }}>
      <NotificationsProvider>
        <DemoCreditsProvider>
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
          <ErrorBoundary componentName="Layout" context={{ currentPage, user }}>
            <Layout
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              walletAddress={walletAddress}
              onConnectWallet={connectWallet}
              user={user}
              onLogout={handleLogout}
            >
              <ErrorBoundary componentName="RoleBasedRouter" context={{ user, currentPage }}>
                <RoleBasedRouter
                  user={user}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                >
                  <ErrorBoundary componentName={`Page-${currentPage}`} context={{ currentPage, user }}>
                    {renderCurrentPage()}
                  </ErrorBoundary>
                </RoleBasedRouter>
              </ErrorBoundary>
            </Layout>
          </ErrorBoundary>
        </DemoCreditsProvider>
      </NotificationsProvider>
    </ErrorBoundary>
  );
}

// Enhanced Mint Page Component
function MintPage({ mintStep, uploaded, signed, onReset, onUploaded, onSigned, user }) {
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
                  <div className={`relative w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-300 ${isCompleted
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
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${isActive ? 'bg-primary-500 text-white' : 'bg-carbon-300 text-white'
                      }`}>
                      {step.id}
                    </div>
                  </div>

                  {/* Step Info */}
                  <div className="mt-4 text-center">
                    <h3 className={`text-sm font-semibold ${isActive ? 'text-primary-700' : 'text-carbon-600'
                      }`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs mt-1 max-w-32 ${isActive ? 'text-primary-600' : 'text-carbon-500'
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
              <Upload onUploaded={onUploaded} user={user} />
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
