import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  WalletIcon, 
  CheckCircleIcon, 
  ShoppingBagIcon,
  PlusCircleIcon,
  LinkIcon,
  ShieldCheckIcon,
  CubeTransparentIcon
} from '@heroicons/react/24/outline';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import CarbonABI from './abis/Carbon.json';

export default function MyTokens({ onShow }) {
  const [address, setAddress] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [marketplaceAddr] = useState(import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => window.location.reload());
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          await loadTokens(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  async function connect() {
    if (!window.ethereum) {
      toast.error('MetaMask not found. Please install MetaMask.');
      return;
    }

    setLoading(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      toast.success('Wallet connected successfully!');
      await loadTokens(addr);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }

  async function loadTokens(addr) {
    const carbonAddr = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;
    if (!carbonAddr) {
      toast.error('Contract address not configured');
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const carbon = new ethers.Contract(carbonAddr, CarbonABI, signer);

      const nextId = Number(await carbon.nextTokenId());
      const found = [];
      
      for (let i = 1; i < nextId; i++) {
        try {
          const bal = await carbon.balanceOf(addr, i);
          if (bal && bal.toString() !== '0') {
            try {
              const attestation = await carbon.attestations(i);
              const uri = await carbon.uri(i);
              found.push({
                tokenId: i,
                balance: bal.toString(),
                gsProjectId: attestation.gsProjectId,
                gsSerial: attestation.gsSerial,
                ipfsCid: attestation.ipfsCid,
                verifier: attestation.verifier,
                uri: uri
              });
            } catch (metaError) {
              found.push({ tokenId: i, balance: bal.toString() });
            }
          }
        } catch (e) {
          console.error(`Error fetching token ${i}:`, e);
        }
      }
      
      setTokens(found);
      
      if (marketplaceAddr) {
        const isApproved = await carbon.isApprovedForAll(addr, marketplaceAddr);
        setApproved(isApproved);
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }

  async function approveMarketplace() {
    if (!window.ethereum) return;
    
    setApproving(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const carbonAddr = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;
      const carbon = new ethers.Contract(carbonAddr, CarbonABI, signer);
      
      toast.loading('Approving marketplace...', { id: 'approve' });
      const tx = await carbon.setApprovalForAll(marketplaceAddr, true);
      await tx.wait();
      
      setApproved(true);
      toast.success('Marketplace approved successfully!', { id: 'approve' });
    } catch (error) {
      console.error('Approval error:', error);
      toast.error('Failed to approve marketplace', { id: 'approve' });
    } finally {
      setApproving(false);
    }
  }

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!address) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <WalletIcon className="w-10 h-10 text-primary-600" />
          </motion.div>
          <h2 className="text-2xl font-bold text-carbon-900 mb-4">Connect Your Wallet</h2>
          <p className="text-carbon-600 mb-8 max-w-md mx-auto">
            Connect your MetaMask wallet to view and manage your carbon credit tokens.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connect}
            disabled={loading}
            className="btn-primary"
          >
            <WalletIcon className="w-5 h-5 mr-2" />
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-carbon-900">My Carbon Credits</h1>
          <p className="text-carbon-600 mt-1">Manage your carbon credit portfolio</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onShow('mint')}
            className="btn-primary"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Mint Credits
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onShow('market')}
            className="btn-secondary"
          >
            <ShoppingBagIcon className="w-5 h-5 mr-2" />
            Marketplace
          </motion.button>
        </div>
      </motion.div>

      {/* Wallet Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-50 rounded-xl p-4 border border-primary-200"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-primary-900">Wallet Connected</p>
              <p className="text-sm text-primary-700 font-mono">{formatAddress(address)}</p>
            </div>
          </div>
          {!approved && marketplaceAddr && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={approveMarketplace}
              disabled={approving}
              className="btn-primary"
            >
              <ShieldCheckIcon className="w-4 h-4 mr-2" />
              {approving ? 'Approving...' : 'Approve Marketplace'}
            </motion.button>
          )}
          {approved && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircleIcon className="w-5 h-5" />
              <span className="text-sm font-semibold">Marketplace Approved</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-carbon-100 rounded-lg"></div>
            </div>
          ))}
        </div>
      )}

      {/* Tokens Grid */}
      {!loading && (
        <AnimatePresence>
          {tokens.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <CubeTransparentIcon className="w-16 h-16 text-carbon-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-carbon-900 mb-2">No tokens found</h3>
              <p className="text-carbon-600 mb-6">You haven't minted any carbon credits yet.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShow('mint')}
                className="btn-primary"
              >
                <PlusCircleIcon className="w-5 h-5 mr-2" />
                Mint Your First Credits
              </motion.button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map((token, index) => (
                <motion.div
                  key={token.tokenId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-lg">🌱</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-carbon-900">Token #{token.tokenId}</h3>
                        <p className="text-sm text-carbon-600">Carbon Credit NFT</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary-50 rounded-lg p-4 mb-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary-600">{token.balance}</p>
                      <p className="text-sm text-primary-700">Credits Available</p>
                    </div>
                  </div>

                  {token.gsProjectId && (
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">Project ID:</span>
                        <span className="font-semibold text-carbon-900">{token.gsProjectId}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">Serial:</span>
                        <span className="font-semibold text-carbon-900">{token.gsSerial}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">IPFS CID:</span>
                        <span className="font-mono text-xs text-carbon-900 truncate max-w-24">{token.ipfsCid}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-carbon-600">Verifier:</span>
                        <span className="font-mono text-xs text-carbon-900">{formatAddress(token.verifier)}</span>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-carbon-200 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => onShow('market')}
                      className="w-full btn-secondary"
                    >
                      <ShoppingBagIcon className="w-4 h-4 mr-2" />
                      List for Sale
                    </motion.button>
                  </div>

                  {token.uri && (
                    <div className="mt-3">
                      <a
                        href={token.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center text-xs text-carbon-600 hover:text-primary-600 transition-colors"
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        View Metadata
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}