import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { WalletIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ethers } from 'ethers';

export default function WalletConnection({ address, onConnect }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState(null);
  const [network, setNetwork] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (address && window.ethereum) {
      fetchWalletInfo();
    }
  }, [address]);

  const fetchWalletInfo = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();
      
      setBalance(ethers.formatEther(balance));
      setNetwork(network.name);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install MetaMask.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      onConnect(address);
    } catch (error) {
      console.error('Connection error:', error);
      setError(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (address) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-50 rounded-xl p-4 border border-primary-200"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
            <CheckCircleIcon className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-semibold text-primary-900">Connected</p>
              {network && (
                <span className="px-2 py-1 text-xs font-medium bg-primary-200 text-primary-800 rounded-full">
                  {network}
                </span>
              )}
            </div>
            <p className="text-xs text-primary-700 font-mono">{formatAddress(address)}</p>
            {balance && (
              <p className="text-xs text-primary-600">
                {parseFloat(balance).toFixed(4)} ETH
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2 text-red-600 text-sm bg-red-50 rounded-lg p-3"
        >
          <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
      
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={connectWallet}
        disabled={isConnecting}
        className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white rounded-xl py-3 px-4 font-semibold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
      >
        <WalletIcon className="w-5 h-5" />
        <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
      </motion.button>
      
      <p className="text-xs text-carbon-500 text-center">
        Connect your MetaMask wallet to get started
      </p>
    </div>
  );
}
