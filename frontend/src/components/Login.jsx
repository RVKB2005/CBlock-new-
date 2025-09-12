import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon, 
  EyeSlashIcon,
  ArrowLeftIcon,
  UserIcon,
  LockClosedIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import authService from '../services/auth.js';

export default function Login({ onShowAuth, onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use real authentication service
      const user = await authService.login(formData.email, formData.password);
      
      // Save session
      authService.saveSession();
      
      toast.success(`Welcome back, ${user.firstName}! Redirecting to dashboard...`);
      
      setTimeout(() => {
        onLogin({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          firstName: user.firstName,
          lastName: user.lastName,
          organization: user.organization,
          accountType: user.accountType,
          walletAddress: user.walletAddress,
          avatar: user.profile?.avatar || null,
          id: user.id
        });
      }, 1000);

    } catch (error) {
      toast.error(error.message || 'Login failed. Please try again.');
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
              Welcome back to the future of 
              <span className="gradient-text block">carbon trading</span>
            </h1>
            
            <p className="text-lg text-carbon-600 mb-8">
              Continue your journey in sustainable investing and make a real impact on climate change.
            </p>

            {/* Features List */}
            <div className="space-y-4">
              {[
                'Access your carbon credit portfolio',
                'Monitor real-time market data',
                'Trade with verified environmental projects',
                'Track your climate impact'
              ].map((feature, index) => (
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
                  <span className="text-carbon-700">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-carbon-100">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-carbon-900">Sign In</h2>
                <button
                  onClick={() => onShowAuth('welcome')}
                  className="p-2 hover:bg-carbon-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-carbon-600" />
                </button>
              </div>
              <p className="text-carbon-600">
                New to CBlock?{' '}
                <button
                  onClick={() => onShowAuth('signup')}
                  className="text-primary-600 hover:text-primary-700 font-semibold"
                >
                  Create an account
                </button>
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-carbon-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
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

              {/* Password Field */}
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
                    placeholder="Enter your password"
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

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-primary-600 border-carbon-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-carbon-700">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Forgot password?
                </button>
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
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </motion.button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-carbon-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-carbon-500">Or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-4">
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
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="flex items-center justify-center px-4 py-3 border border-carbon-300 rounded-lg hover:bg-carbon-50 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.175 1.219-5.175s-.31-.653-.31-1.58c0-1.481.86-2.587 1.929-2.587.91 0 1.35.681 1.35 1.498 0 .913-.582 2.277-.882 3.54-.251 1.063.533 1.929 1.581 1.929 1.898 0 3.197-2.448 3.197-5.313 0-2.208-1.519-3.842-4.273-3.842-3.129 0-5.136 2.284-5.136 4.834 0 .878.26 1.488.677 1.975.196.233.224.437.167.675-.06.24-.196.756-.251.966-.079.301-.323.365-.743.223-1.351-.551-2.024-2.03-2.024-3.674 0-2.706 2.24-5.989 6.681-5.989 3.563 0 5.966 2.476 5.966 5.764 0 3.956-2.133 6.919-5.288 6.919-1.039 0-2.016-.558-2.351-1.205l-.631 2.426c-.23.906-.835 1.918-1.301 2.633C9.67 23.812 10.8 24.029 12.017 24.029c6.624 0 11.99-5.367 11.99-11.986C24.007 5.367 18.641.001.017 0z"/>
                  </svg>
                  GitHub
                </motion.button>
              </div>
            </form>

            {/* Demo Login Info */}
            <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
              <p className="text-sm text-primary-700">
                <strong>Demo Mode:</strong> Use any email and password to sign in.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
