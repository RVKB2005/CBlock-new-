import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  FireIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  WalletIcon,
  ArrowRightIcon,
  SparklesIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import CarbonABI from './abis/Carbon.json';
import MarketplaceABI from './abis/Marketplace.json';

export default function Retire() {
  const [address, setAddress] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [retirementNotes, setRetirementNotes] = useState({});
  const [retiringTokens, setRetiringTokens] = useState({});
  const [retirementAmounts, setRetirementAmounts] = useState({});
  const [tokenMetadata, setTokenMetadata] = useState({});
  const [marketplaceAddr] = useState(import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS);
  const [carbonAddr] = useState(import.meta.env.VITE_CONTRACT_CARBON_ADDRESS);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', () => window.location.reload());
      // Auto-connect if already connected
      checkConnection();
    }
  }, []);

  const checkConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connect(false);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  async function connect(requestAccounts = true) {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to continue');
      return;
    }

    setIsConnecting(true);
    try {
      if (requestAccounts) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      
      await loadTokens(signer, addr);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }

  async function loadTokens(signer, addr) {
    setIsLoading(true);
    try {
      const carbon = new ethers.Contract(carbonAddr, CarbonABI, signer);
      const nextId = await carbon.nextTokenId();
      const found = [];
      const metadata = {};
      
      console.log(`Loading tokens for address: ${addr}`);
      console.log(`Next token ID: ${nextId}, checking tokens 1 to ${Number(nextId) - 1}`);
      
      for (let i = 1; i < Number(nextId); i++) {
        try {
          const bal = await carbon.balanceOf(addr, i);
          console.log(`Token ${i}: balance = ${bal?.toString() || '0'}`);
          if (bal && bal.toString() !== '0') {
            console.log(`Found token ${i} with balance ${bal.toString()}`);
            // Get token metadata
            try {
              const uri = await carbon.uri(i);
              const attestation = await carbon.attestations(i);
              metadata[i] = {
                uri,
                gsProjectId: attestation.gsProjectId,
                gsSerial: attestation.gsSerial,
                amount: attestation.amount.toString(),
                ipfsCid: attestation.ipfsCid
              };
            } catch (e) {
              console.warn(`Could not load metadata for token ${i}:`, e);
            }
            
            found.push({ 
              tokenId: i, 
              balance: bal.toString()
            });
            setRetirementAmounts(prev => ({ ...prev, [i]: '1' }));
          }
        } catch (e) {
          console.warn(`Error checking token ${i}:`, e);
        }
      }
      
      console.log(`Found ${found.length} tokens total:`, found);
      setTokens(found);
      setTokenMetadata(metadata);
    } catch (error) {
      console.error('Error loading tokens:', error);
      toast.error('Failed to load your tokens');
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadRetirementMetadata(tokenId, amount) {
    const note = retirementNotes[tokenId] || '';
    
    // Create mock metadata URI for demo
    const mockCid = 'QmRetire' + Math.random().toString(36).substring(2, 15);
    const metadataObj = {
      tokenId: tokenId,
      amount: amount,
      note: note,
      timestamp: new Date().toISOString(),
      retiredBy: address
    };
    
    console.log('Mock retirement metadata:', metadataObj);
    return `https://dweb.link/ipfs/${mockCid}/retire-${tokenId}.json`;
  }

  async function retire(tokenId, amount) {
    if (!window.ethereum) {
      toast.error('Please connect your wallet first');
      return;
    }

    setRetiringTokens(prev => ({ ...prev, [tokenId]: true }));
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const market = new ethers.Contract(marketplaceAddr, MarketplaceABI, signer);
      
      // Upload metadata
      const metadataURI = await uploadRetirementMetadata(tokenId, amount);
      
      // Use amount as integer (carbon credits are not denominated in wei)
      const amountBigInt = BigInt(Math.floor(parseFloat(amount)));
      
      const tx = await market.retire(tokenId, amountBigInt, metadataURI);
      toast.success(`Retirement transaction submitted! Hash: ${tx.hash}`);
      
      await tx.wait();
      toast.success('🎉 Carbon credits retired successfully! Certificate minted.');
      
      // Reload tokens to reflect the change
      await loadTokens(signer, address);
      
      // Clear the retirement note
      setRetirementNotes(prev => ({ ...prev, [tokenId]: '' }));
      
    } catch (error) {
      console.error('Retirement error:', error);
      let errorMessage = 'Error retiring carbon credits: ';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas fees. Please ensure you have enough ETH.';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user.';
      } else if (error.message.includes('insufficient balance')) {
        errorMessage = 'Insufficient token balance for retirement.';
      } else {
        errorMessage += error.reason || error.message || 'Unknown error occurred';
      }
      
      toast.error(errorMessage);
    } finally {
      setRetiringTokens(prev => ({ ...prev, [tokenId]: false }));
    }
  }

  const handleNoteChange = (tokenId, value) => {
    setRetirementNotes(prev => ({ ...prev, [tokenId]: value }));
  };

  const handleAmountChange = (tokenId, value) => {
    const numValue = parseInt(value);
    const maxBalance = parseInt(tokens.find(t => t.tokenId === tokenId)?.balance || '0');
    
    // Only allow positive integers
    if (isNaN(numValue) || numValue <= 0) {
      return;
    }
    
    if (numValue > maxBalance) {
      toast.error(`Amount cannot exceed your balance of ${maxBalance} tokens`);
      return;
    }
    
    setRetirementAmounts(prev => ({ ...prev, [tokenId]: value }));
  };

  const TokenCard = ({ token }) => {
    const metadata = tokenMetadata[token.tokenId];
    const isRetiring = retiringTokens[token.tokenId];
    const retirementAmount = retirementAmounts[token.tokenId] || '1';
    const maxAmount = parseFloat(token.balance);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card hover:shadow-lg transition-all duration-200"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-carbon-900">Carbon Credit #{token.tokenId}</h3>
              <p className="text-sm text-carbon-600">
                {metadata ? `${metadata.gsProjectId} • ${metadata.gsSerial}` : 'Loading metadata...'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary-600">{token.balance}</p>
            <p className="text-xs text-carbon-500">CO2e tons</p>
          </div>
        </div>

        {metadata && (
          <div className="mb-4 p-3 bg-carbon-50 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-carbon-600">Project:</span>
                <span className="ml-2 font-medium">{metadata.gsProjectId}</span>
              </div>
              <div>
                <span className="text-carbon-600">Serial:</span>
                <span className="ml-2 font-medium">{metadata.gsSerial}</span>
              </div>
              <div className="col-span-2">
                <span className="text-carbon-600">Amount:</span>
                <span className="ml-2 font-medium">{metadata.amount} CO2e tons</span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-carbon-700 mb-2">
              <FireIcon className="w-4 h-4 inline mr-1" />
              Amount to Retire (CO2e tons)
            </label>
            <input
              type="number"
              min="1"
              max={maxAmount}
              step="1"
              value={retirementAmount}
              onChange={(e) => handleAmountChange(token.tokenId, e.target.value)}
              className="input-field"
              placeholder="Enter whole number of tokens"
            />
            <p className="text-xs text-carbon-500 mt-1">
              Maximum: {token.balance} tokens
            </p>
          </div>

          {/* Retirement Note */}
          <div>
            <label className="block text-sm font-medium text-carbon-700 mb-2">
              <DocumentTextIcon className="w-4 h-4 inline mr-1" />
              Retirement Note (Optional)
            </label>
            <textarea
              rows={3}
              value={retirementNotes[token.tokenId] || ''}
              onChange={(e) => handleNoteChange(token.tokenId, e.target.value)}
              placeholder="Add a note about this retirement (e.g., offsetting company emissions for Q4 2024)"
              className="input-field resize-none"
            />
          </div>

          {/* Retire Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => retire(token.tokenId, retirementAmount)}
            disabled={isRetiring || !retirementAmount || parseFloat(retirementAmount) <= 0}
            className="btn-danger w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isRetiring ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Retiring...</span>
              </>
            ) : (
              <>
                <FireIcon className="w-5 h-5" />
                <span>Retire {retirementAmount} CO2e tons</span>
                <AcademicCapIcon className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <FireIcon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-carbon-900">Retire Carbon Credits</h3>
            <p className="text-sm text-carbon-600">Permanently retire your carbon credits and receive certificates</p>
          </div>
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
            <p className="font-medium text-blue-900">What happens when you retire carbon credits?</p>
            <p className="text-blue-700 mt-1">
              Retirement permanently removes carbon credits from circulation and generates a certificate of retirement. 
              This is how you claim the environmental benefit and prevent double-counting.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Wallet Connection */}
      {!address ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12"
        >
          <WalletIcon className="w-16 h-16 text-carbon-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-carbon-900 mb-2">Connect Your Wallet</h3>
          <p className="text-carbon-600 mb-6 max-w-md mx-auto">
            Connect your wallet to view and retire your carbon credits
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => connect(true)}
            disabled={isConnecting}
            className="btn-primary inline-flex items-center space-x-2"
          >
            {isConnecting ? (
              <>
                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <WalletIcon className="w-5 h-5" />
                <span>Connect Wallet</span>
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </motion.button>
        </motion.div>
      ) : (
        <div>
          {/* Connected Wallet Info */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircleIcon className="w-5 h-5 text-primary-600" />
              <div>
                <p className="font-medium text-primary-900">Wallet Connected</p>
                <p className="text-sm text-primary-700">{address}</p>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="text-center py-12">
              <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
              <p className="text-carbon-600">Loading your carbon credits...</p>
            </div>
          ) : (
            /* Tokens Grid */
            <AnimatePresence>
              {tokens.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <SparklesIcon className="w-16 h-16 text-carbon-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-carbon-900 mb-2">No Carbon Credits Found</h3>
                  <p className="text-carbon-600 max-w-md mx-auto">
                    You don't have any carbon credits to retire yet. Visit the Mint page to create new credits or the Marketplace to purchase existing ones.
                  </p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tokens.map((token) => (
                    <TokenCard key={token.tokenId} token={token} />
                  ))}
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      )}
    </motion.div>
  );
}
