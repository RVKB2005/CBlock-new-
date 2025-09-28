import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon,
  ArrowLeftIcon,
  UserIcon,
  LockClosedIcon,
  EnvelopeIcon,
  CheckIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import authService from '../services/auth.js';
import blockchainService from '../services/blockchain.js';

export default function Signup({ onShowAuth, onLogin }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    accountType: 'business', // business, verifier
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    newsletter: true,
    walletAddress: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  const connectWallet = async () => {
    try {
      // Use the blockchain service to connect wallet
      const walletInfo = await blockchainService.connectWallet();
      
      setFormData(prev => ({ ...prev, walletAddress: walletInfo.address }));
      setWalletConnected(true);
      toast.success('🦊 Wallet connected successfully!');
    } catch (error) {
      toast.error(error.message || 'Failed to connect wallet. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Basic validation is handled by the auth service
      if (!formData.acceptTerms) {
        toast.error('Please accept the terms and conditions');
        setLoading(false);
        return;
      }

      // Register user with real authentication service
      const user = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        organization: formData.organization,
        accountType: formData.accountType,
        walletAddress: formData.walletAddress
      });
      
      // Auto-login after successful registration
      const loggedInUser = await authService.login(formData.email, formData.password);
      authService.saveSession();
      
      toast.success(`🎉 Account created successfully! Welcome to CBlock, ${user.firstName}!`);
      
      setTimeout(() => {
        onLogin({
          email: loggedInUser.email,
          name: `${loggedInUser.firstName} ${loggedInUser.lastName}`,
          firstName: loggedInUser.firstName,
          lastName: loggedInUser.lastName,
          organization: loggedInUser.organization,
          accountType: loggedInUser.accountType,
          walletAddress: loggedInUser.walletAddress,
          avatar: loggedInUser.profile?.avatar || null,
          id: loggedInUser.id
        });
      }, 1000);

    } catch (error) {
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Info */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden lg:block"
        >
          <div className="max-w-lg">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">🌱</span>
              </div>
              <span className="text-3xl font-bold gradient-text">CBlock</span>
            </div>

            <h1 className="text-4xl font-bold text-carbon-900 mb-6">
              Join the 
              <span className="gradient-text block">carbon revolution</span>
            </h1>
            
            <p className="text-lg text-carbon-600 mb-8">
              Create your account and start making a positive impact on climate change through verified carbon credit trading.
            </p>

            {/* Benefits List */}
            <div className="space-y-4">
              {[
                'Trade verified carbon credits globally',
                'Access real-time market analytics',
                'Connect with environmental projects',
                'Track your climate impact dashboard',
                'Join a community of climate action leaders'
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center space-x-3"
                >
                  <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <CheckIcon className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-carbon-700">{benefit}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Signup Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-carbon-100">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-carbon-900">Create Account</h2>
                <button
                  onClick={() => onShowAuth('welcome')}
                  className="p-2 hover:bg-carbon-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-carbon-600" />
                </button>
              </div>
              <p className="text-carbon-600">
                Already have an account?{' '}
                <button
                  onClick={() => onShowAuth('login')}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Sign in
                </button>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Account Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-carbon-700 mb-4">
                  Account Type
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    {
                      type: 'business',
                      title: 'Business',
                      description: 'Corporate sustainability',
                      icon: '🏢'
                    },
                    {
                      type: 'verifier',
                      title: 'Verifier',
                      description: 'Gold Standard certified',
                      icon: '✅'
                    }
                  ].map((accountType) => (
                    <button
                      key={accountType.type}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, accountType: accountType.type }))}
                      className={`p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                        formData.accountType === accountType.type
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-carbon-200 hover:border-primary-300 hover:bg-primary-50/50'
                      }`}
                    >
                      <div className="text-xl mb-1">{accountType.icon}</div>
                      <div className="text-sm font-semibold text-carbon-900">{accountType.title}</div>
                      <div className="text-xs text-carbon-600">{accountType.description}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Name Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-carbon-700 mb-2">
                    First Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="John"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-carbon-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-carbon-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-field pl-10"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Organization Field */}
              {(formData.accountType === 'business' || formData.accountType === 'verifier') && (
                <div>
                  <label htmlFor="organization" className="block text-sm font-semibold text-carbon-700 mb-2">
                    Organization Name {formData.accountType === 'verifier' ? '(Required)' : '(Optional)'}
                  </label>
                  <div className="relative">
                    <BuildingOfficeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                    <input
                      type="text"
                      id="organization"
                      name="organization"
                      value={formData.organization}
                      onChange={handleInputChange}
                      className="input-field pl-10"
                      placeholder="Your company or organization"
                      required={formData.accountType === 'verifier'}
                    />
                  </div>
                </div>
              )}

              {/* Password Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-carbon-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Create password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-carbon-400 hover:text-carbon-600"
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-carbon-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Confirm password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-carbon-400 hover:text-carbon-600"
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="w-5 h-5" />
                      ) : (
                        <EyeIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Blockchain Wallet Connection */}
              <div className="border-t border-carbon-200 pt-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-carbon-900 mb-2">🦊 Connect Wallet</h3>
                  <p className="text-sm text-carbon-600">
                    Connect your Ethereum wallet to trade carbon credits on the blockchain.
                  </p>
                </div>
                
                {!walletConnected ? (
                  <motion.button
                    type="button"
                    onClick={connectWallet}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full btn-secondary flex items-center justify-center py-3 mb-4"
                  >
                    <div className="w-6 h-6 mr-3">
                      <svg viewBox="0 0 40 40" className="w-full h-full">
                        <path fill="#E17726" d="M37.3 6.4L22.8 1.7c-.9-.3-1.8-.3-2.6 0L5.7 6.4c-1.4.5-2.3 1.8-2.3 3.3v20.6c0 1.5.9 2.8 2.3 3.3l14.5 4.7c.4.1.9.2 1.3.2s.9-.1 1.3-.2l14.5-4.7c1.4-.5 2.3-1.8 2.3-3.3V9.7c0-1.5-.9-2.8-2.3-3.3z" />
                        <path fill="#E27625" d="M22.8 1.7L37.3 6.4c1.4.5 2.3 1.8 2.3 3.3v20.6c0 1.5-.9 2.8-2.3 3.3L22.8 38.3c-.4.1-.9.2-1.3.2V1.5c.5 0 .9.1 1.3.2z" />
                      </svg>
                    </div>
                    Connect MetaMask Wallet
                  </motion.button>
                ) : (
                  <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                    <CheckIcon className="w-6 h-6 text-green-600 mr-3" />
                    <div className="flex-1">
                      <div className="font-semibold text-green-900">Wallet Connected ✅</div>
                      <div className="text-sm text-green-700 font-mono">
                        {formData.walletAddress?.slice(0, 6)}...{formData.walletAddress?.slice(-4)}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center mr-2">
                      <span className="text-white text-xs">ℹ</span>
                    </div>
                    <span className="text-sm font-medium text-primary-700">Blockchain Features</span>
                  </div>
                  <ul className="text-sm text-primary-600 space-y-1">
                    <li>• Trade verified carbon credits on Ethereum Sepolia testnet</li>
                    <li>• Generate immutable retirement certificates</li>
                    <li>• Access to exclusive marketplace features</li>
                  </ul>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-4">
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    checked={formData.acceptTerms}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600 border-carbon-300 rounded focus:ring-primary-500 mt-1"
                    required
                  />
                  <span className="text-sm text-carbon-700">
                    I agree to the{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Terms of Service</a>{' '}
                    and{' '}
                    <a href="#" className="text-primary-600 hover:text-primary-700 font-medium">Privacy Policy</a>
                  </span>
                </label>
                <label className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    name="newsletter"
                    checked={formData.newsletter}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600 border-carbon-300 rounded focus:ring-primary-500 mt-1"
                  />
                  <span className="text-sm text-carbon-700">
                    Send me updates about new features and market insights
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-lg relative"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-carbon-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-carbon-500">Or sign up with</span>
                </div>
              </div>

              {/* Social Signup */}
              <div className="flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex items-center justify-center px-4 py-3 border border-carbon-300 rounded-lg hover:bg-carbon-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </motion.button>
              </div>
            </form>

            {/* Demo Signup Info */}
            <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm text-primary-700">
                <strong>Demo Mode:</strong> Fill in the form with any information to create a demo account.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
