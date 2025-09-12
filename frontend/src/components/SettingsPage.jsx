import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserIcon,
  LockClosedIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import authService from '../services/auth.js';

export default function SettingsPage({ user, onLogout }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Please enter your password to confirm');
      return;
    }

    setLoading(true);
    try {
      await authService.deleteAccount(deletePassword);
      toast.success('Account deleted successfully');
      setShowDeleteModal(false);
      // The auth service already logs out, so onLogout will be called
      setTimeout(() => {
        onLogout();
      }, 1000);
    } catch (error) {
      toast.error(error.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center space-x-4"
      >
        <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
          <UserIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-carbon-900">Account Settings</h1>
          <p className="text-carbon-600 mt-1">Manage your account preferences and security</p>
        </div>
      </motion.div>

      {/* Profile Information */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-carbon-900 mb-6">Profile Information</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-carbon-700 mb-2">Full Name</label>
            <div className="flex items-center p-3 bg-carbon-50 rounded-lg">
              <UserIcon className="w-5 h-5 text-carbon-400 mr-3" />
              <span className="text-carbon-900">{user?.name || 'Not set'}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-carbon-700 mb-2">Email Address</label>
            <div className="flex items-center p-3 bg-carbon-50 rounded-lg">
              <span className="text-carbon-900">{user?.email}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-carbon-700 mb-2">Account Type</label>
            <div className="flex items-center p-3 bg-carbon-50 rounded-lg">
              <span className="text-carbon-900 capitalize">{user?.accountType || 'Individual'}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-carbon-700 mb-2">Organization</label>
            <div className="flex items-center p-3 bg-carbon-50 rounded-lg">
              <span className="text-carbon-900">{user?.organization || 'Not set'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Settings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <h2 className="text-xl font-semibold text-carbon-900 mb-6">Security Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-carbon-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <LockClosedIcon className="w-5 h-5 text-carbon-400" />
              <div>
                <p className="font-medium text-carbon-900">Password</p>
                <p className="text-sm text-carbon-600">Last updated recently</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-secondary text-sm"
            >
              Change Password
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Danger Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card border-red-200 bg-red-50/50"
      >
        <h2 className="text-xl font-semibold text-red-900 mb-6">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">Delete Account</p>
                <p className="text-sm text-red-700">Permanently delete your account and all associated data</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Delete Account
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowDeleteModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-carbon-900">Delete Account</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-2 hover:bg-carbon-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-carbon-600" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-carbon-700 mb-4">
                This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">
                  <strong>What will be deleted:</strong>
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Your account and profile information</li>
                  <li>• All carbon credit transactions and history</li>
                  <li>• Retirement certificates and attestations</li>
                  <li>• Marketplace listings and offers</li>
                </ul>
              </div>
            </div>

            <div className="mb-6">
              <label htmlFor="deletePassword" className="block text-sm font-semibold text-carbon-700 mb-2">
                Enter your password to confirm
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-carbon-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="deletePassword"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
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

            <div className="flex space-x-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 btn-secondary"
                disabled={loading}
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDeleteAccount}
                disabled={loading || !deletePassword.trim()}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  'Delete Account'
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}