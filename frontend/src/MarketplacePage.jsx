import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  ShoppingBagIcon,
  PlusCircleIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  UserIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import blockchainService from './services/blockchain.js';
import MarketplaceABI from './abis/Marketplace.json';
import CarbonABI from './abis/Carbon.json';

export default function MarketplacePage({ onShow }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [listings, setListings] = useState([]);
  const [userTokens, setUserTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('browse'); // 'browse', 'create'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Create listing form
  const [listingForm, setListingForm] = useState({
    tokenId: '',
    amount: 1,
    pricePerToken: 0.01 // in ETH
  });
  const [listingErrors, setListingErrors] = useState({});
  const [isCreatingListing, setIsCreatingListing] = useState(false);
  
  // Buy form states
  const [buyingStates, setBuyingStates] = useState({}); // { listingId: { amount: number, loading: boolean } }
  const [takingDownStates, setTakingDownStates] = useState({}); // { listingId: boolean }

  useEffect(() => {
    initializePage();
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      return () => window.ethereum.removeAllListeners('accountsChanged');
    }
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setWalletAddress(accounts[0]);
      initializePage();
    } else {
      setWalletAddress(null);
      setListings([]);
      setUserTokens([]);
    }
  };

  const initializePage = async () => {
    try {
      setLoading(true);
      await connectWallet();
      await Promise.all([
        fetchListings(),
        fetchUserTokens()
      ]);
    } catch (error) {
      console.error('Error initializing marketplace:', error);
      toast.error('Failed to initialize marketplace');
    } finally {
      setLoading(false);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to use the marketplace');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        // Request connection
        const requestedAccounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (requestedAccounts.length > 0) {
          setWalletAddress(requestedAccounts[0]);
        }
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const fetchListings = async () => {
    if (!window.ethereum) return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplaceAddr = import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS;
      
      if (!marketplaceAddr || marketplaceAddr === '0x0000000000000000000000000000000000000000') {
        console.warn('Marketplace contract not configured');
        return;
      }
      
      const market = new ethers.Contract(marketplaceAddr, MarketplaceABI, provider);
      const nextId = await market.nextListingId();
      const activeListings = [];
      
      console.log('📋 Fetching listings, nextListingId:', nextId.toString());
      
      // Start from 1 because listings are 1-indexed in the contract
      // Be more conservative: check from 1 to nextId (inclusive) but handle errors gracefully
      const maxId = Number(nextId);
      for (let i = 1; i <= maxId; i++) {
        try {
          const listing = await market.listings(i);
          console.log(`Listing ${i}:`, {
            seller: listing.seller,
            tokenId: Number(listing.tokenId),
            amount: Number(listing.amount),
            pricePerUnit: listing.pricePerUnit.toString()
          });
          
          // Check if listing has amount > 0 (active listing)
          if (Number(listing.amount) > 0) {
            const pricePerToken = Number(ethers.formatEther(listing.pricePerUnit));
            activeListings.push({
              id: i,
              seller: listing.seller,
              tokenId: Number(listing.tokenId),
              amount: Number(listing.amount),
              pricePerToken: pricePerToken,
              totalValue: pricePerToken * Number(listing.amount),
              active: true // Set as active if amount > 0
            });
          }
        } catch (error) {
          console.warn(`Error fetching listing ${i}:`, error);
        }
      }
      
      setListings(activeListings);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const fetchUserTokens = async () => {
    if (!walletAddress || !blockchainService.isConfigured()) {
      console.log('Cannot fetch tokens - wallet not connected or service not configured');
      console.log('Wallet:', walletAddress);
      console.log('Service configured:', blockchainService.isConfigured());
      return;
    }
    
    try {
      console.log('🔍 Fetching tokens for wallet:', walletAddress);
      
      if (!blockchainService.isInitialized) {
        console.log('Initializing blockchain service...');
        await blockchainService.initialize();
      }
      
      const tokens = await blockchainService.getUserTokens(walletAddress);
      console.log('📋 Found tokens:', tokens);
      setUserTokens(tokens);
      
      if (tokens.length === 0) {
        toast.info(`No tokens found for address ${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`);
      }
    } catch (error) {
      console.error('❌ Error fetching user tokens:', error);
      toast.error('Failed to fetch your tokens: ' + error.message);
    }
  };

  const validateListingForm = () => {
    const errors = {};
    
    if (!listingForm.tokenId) errors.tokenId = 'Token ID is required';
    if (!listingForm.amount || listingForm.amount <= 0) errors.amount = 'Amount must be greater than 0';
    if (!listingForm.pricePerToken || listingForm.pricePerToken <= 0) errors.pricePerToken = 'Price must be greater than 0';
    
    // Check if user owns the token
    const userToken = userTokens.find(token => token.tokenId === parseInt(listingForm.tokenId));
    if (!userToken) {
      errors.tokenId = 'You do not own this token';
    } else if (userToken.balance < listingForm.amount) {
      errors.amount = `You only have ${userToken.balance} tokens available`;
    }
    
    setListingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const createListing = async () => {
    if (!validateListingForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    setIsCreatingListing(true);
    
    try {
      const result = await blockchainService.listCarbonCredits(
        parseInt(listingForm.tokenId),
        listingForm.amount,
        listingForm.pricePerToken
      );
      
      toast.success('Listing created successfully!');
      
      // Reset form
      setListingForm({ tokenId: '', amount: 1, pricePerToken: 0.01 });
      setListingErrors({});
      
      // Refresh data
      await Promise.all([
        fetchListings(),
        fetchUserTokens()
      ]);
      
      // Switch to browse tab to see the new listing
      setActiveTab('browse');
      
    } catch (error) {
      console.error('Error creating listing:', error);
      let errorMessage = 'Failed to create listing: ';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient funds for gas fees';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else {
        errorMessage += error.reason || error.message || 'Unknown error';
      }
      
      toast.error(errorMessage);
    } finally {
      setIsCreatingListing(false);
    }
  };

  const buyTokens = async (listingId, amount) => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setBuyingStates(prev => ({
      ...prev,
      [listingId]: { ...prev[listingId], loading: true }
    }));

    try {
      await blockchainService.buyCarbonCredits(listingId, amount);
      toast.success(`Successfully purchased ${amount} carbon credits!`);
      
      // Reset buy amount
      setBuyingStates(prev => ({
        ...prev,
        [listingId]: { amount: 1, loading: false }
      }));
      
      // Refresh listings
      await fetchListings();
      
    } catch (error) {
      console.error('Error buying tokens:', error);
      let errorMessage = 'Failed to purchase tokens: ';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient ETH balance';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else {
        errorMessage += error.reason || error.message || 'Unknown error';
      }
      
      toast.error(errorMessage);
    } finally {
      setBuyingStates(prev => ({
        ...prev,
        [listingId]: { ...prev[listingId], loading: false }
      }));
    }
  };

  const takeDownListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to take down this listing? You will pay the full listing price to remove it from the marketplace.')) {
      return;
    }

    setTakingDownStates(prev => ({ ...prev, [listingId]: true }));

    try {
      await blockchainService.takeDownListing(listingId);
      toast.success('Listing taken down successfully!');
      
      // Refresh listings
      await fetchListings();
      await fetchUserTokens();
      
    } catch (error) {
      console.error('Error taking down listing:', error);
      let errorMessage = 'Failed to take down listing: ';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage += 'Insufficient ETH balance to buy back your listing';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction was cancelled by user';
      } else {
        errorMessage += error.reason || error.message || 'Unknown error';
      }
      
      toast.error(errorMessage);
    } finally {
      setTakingDownStates(prev => ({ ...prev, [listingId]: false }));
    }
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const filteredListings = listings.filter(listing =>
    searchTerm === '' || 
    listing.id.toString().includes(searchTerm) ||
    listing.tokenId.toString().includes(searchTerm) ||
    listing.seller.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-carbon-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card h-64 bg-carbon-100"></div>
            ))}
          </div>
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
          <h1 className="text-3xl font-bold text-carbon-900 flex items-center">
            <ShoppingBagIcon className="w-8 h-8 mr-3 text-primary-600" />
            Carbon Credit Marketplace
          </h1>
          <p className="text-carbon-600 mt-1">Buy and sell verified carbon credits</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          {/* Wallet Address Display */}
          {walletAddress && (
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-mono text-carbon-700">
                  {formatAddress(walletAddress)}
                </span>
              </div>
            </div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onShow('tokens')}
            className="btn-secondary"
          >
            My Tokens
          </motion.button>
          
          {/* Manual Refresh Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              fetchListings();
              fetchUserTokens();
              toast.info('Refreshing marketplace data...');
            }}
            className="btn-secondary px-3 py-2 text-sm"
          >
            <ArrowPathIcon className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {!blockchainService.isConfigured() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Smart contracts not configured</p>
              <p className="text-sm text-yellow-700 mt-1">Deploy contracts and update .env to enable marketplace features.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 bg-carbon-100 p-1 rounded-lg">
        {[
          { key: 'browse', label: 'Browse Listings', icon: MagnifyingGlassIcon },
          { key: 'create', label: 'Create Listing', icon: PlusCircleIcon }
        ].map(tab => (
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-carbon-600 hover:text-carbon-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'browse' && (
          <motion.div
            key="browse"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-carbon-400" />
                <input
                  type="text"
                  placeholder="Search by ID, token, or seller..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-primary"
                />
              </div>
              
              <div className="text-sm text-carbon-600">
                {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} available
              </div>
            </div>

            {/* Listings Grid */}
            {filteredListings.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <ShoppingBagIcon className="w-16 h-16 text-carbon-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-carbon-900 mb-2">No Listings Found</h3>
                <p className="text-carbon-600 mb-6">
                  {searchTerm ? 'No listings match your search criteria.' : 'There are currently no active listings in the marketplace.'}
                </p>
                {!searchTerm && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab('create')}
                    className="btn-primary"
                  >
                    <PlusCircleIcon className="w-5 h-5 mr-2" />
                    Create First Listing
                  </motion.button>
                )}
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredListings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="card hover:shadow-lg transition-shadow"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                            <TagIcon className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-carbon-900">Listing #{listing.id}</p>
                            <p className="text-xs text-carbon-500">Token ID: {listing.tokenId}</p>
                          </div>
                        </div>
                        {listing.seller.toLowerCase() === walletAddress?.toLowerCase() && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Your Listing</span>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-carbon-600">
                          <UserIcon className="w-4 h-4 mr-2" />
                          <span>Seller: {formatAddress(listing.seller)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-carbon-500">Available</p>
                            <p className="font-semibold text-carbon-900">{listing.amount} credits</p>
                          </div>
                          <div>
                            <p className="text-carbon-500">Price</p>
                            <p className="font-semibold text-primary-600">{listing.pricePerToken.toFixed(4)} ETH/credit</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="border-t pt-4">
                        <div className="flex items-center space-x-2 mb-3">
                          <input
                            type="number"
                            min="1"
                            max={listing.amount}
                            value={buyingStates[listing.id]?.amount || 1}
                            onChange={(e) => setBuyingStates(prev => ({
                              ...prev,
                              [listing.id]: { ...prev[listing.id], amount: parseInt(e.target.value) || 1 }
                            }))}
                            className="input-primary text-sm flex-1"
                            placeholder="Amount"
                          />
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-carbon-600">Total Cost:</span>
                          <span className="font-semibold text-carbon-900">
                            {((buyingStates[listing.id]?.amount || 1) * listing.pricePerToken).toFixed(4)} ETH
                          </span>
                        </div>
                        
                        {listing.seller.toLowerCase() === walletAddress?.toLowerCase() ? (
                          // Owner buttons
                          <div className="space-y-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => takeDownListing(listing.id)}
                              disabled={takingDownStates[listing.id]}
                              className="btn-danger w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                            >
                              {takingDownStates[listing.id] ? (
                                <>
                                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                  <span>Taking Down...</span>
                                </>
                              ) : (
                                <>
                                  <TrashIcon className="w-4 h-4" />
                                  <span>Take Down Listing</span>
                                </>
                              )}
                            </motion.button>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                              <p className="text-xs text-amber-700">
                                ⚠️ You'll pay {listing.totalValue.toFixed(4)} ETH to remove this listing
                              </p>
                            </div>
                          </div>
                        ) : (
                          // Buyer button
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => buyTokens(listing.id, buyingStates[listing.id]?.amount || 1)}
                            disabled={buyingStates[listing.id]?.loading}
                            className="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                          >
                            {buyingStates[listing.id]?.loading ? (
                              <>
                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                <span>Buying...</span>
                              </>
                            ) : (
                              <>
                                <CurrencyDollarIcon className="w-4 h-4" />
                                <span>Buy Credits</span>
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-2xl mx-auto"
          >
            <div className="card space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <PlusCircleIcon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-carbon-900">Create New Listing</h3>
                  <p className="text-sm text-carbon-600">List your carbon credits for sale on the marketplace</p>
                </div>
              </div>

              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Marketplace Fee</p>
                    <p className="text-blue-700 mt-1">
                      A small fee may be charged for marketplace transactions. You'll see the exact fee during transaction confirmation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-carbon-700">
                      Token ID
                    </label>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchUserTokens}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                    >
                      <ArrowPathIcon className="w-3 h-3" />
                      <span>Refresh Tokens</span>
                    </motion.button>
                  </div>
                  <select
                    value={listingForm.tokenId}
                    onChange={(e) => setListingForm(prev => ({ ...prev, tokenId: e.target.value }))}
                    className={`input-primary ${listingErrors.tokenId ? 'border-red-300' : ''}`}
                  >
                    <option value="">Select a token to list</option>
                    {userTokens.map(token => (
                      <option key={token.tokenId} value={token.tokenId}>
                        Token #{token.tokenId} (Balance: {token.balance})
                      </option>
                    ))}
                  </select>
                  {userTokens.length === 0 && walletAddress && (
                    <p className="text-sm text-amber-600 flex items-center">
                      <InformationCircleIcon className="w-4 h-4 mr-1" />
                      No tokens found for your wallet. Make sure you've minted some carbon credits first.
                    </p>
                  )}
                  {listingErrors.tokenId && (
                    <p className="text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {listingErrors.tokenId}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-carbon-700">
                    Amount to Sell
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={listingForm.amount}
                    onChange={(e) => setListingForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 1 }))}
                    className={`input-primary ${listingErrors.amount ? 'border-red-300' : ''}`}
                    placeholder="Number of credits to sell"
                  />
                  {listingErrors.amount && (
                    <p className="text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {listingErrors.amount}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-carbon-700">
                    Price per Credit (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={listingForm.pricePerToken}
                    onChange={(e) => setListingForm(prev => ({ ...prev, pricePerToken: parseFloat(e.target.value) || 0 }))}
                    className={`input-primary ${listingErrors.pricePerToken ? 'border-red-300' : ''}`}
                    placeholder="0.01"
                  />
                  {listingErrors.pricePerToken && (
                    <p className="text-sm text-red-600 flex items-center">
                      <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                      {listingErrors.pricePerToken}
                    </p>
                  )}
                </div>
                
                {listingForm.amount && listingForm.pricePerToken && (
                  <div className="bg-carbon-50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-carbon-700">Total Value:</span>
                      <span className="text-lg font-bold text-primary-600">
                        {(listingForm.amount * listingForm.pricePerToken).toFixed(4)} ETH
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createListing}
                  disabled={isCreatingListing || !walletAddress || !blockchainService.isConfigured()}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isCreatingListing ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      <span>Creating Listing...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircleIcon className="w-5 h-5" />
                      <span>Create Listing</span>
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setListingForm({ tokenId: '', amount: 1, pricePerToken: 0.01 });
                    setListingErrors({});
                  }}
                  className="btn-secondary px-6"
                >
                  Reset
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
