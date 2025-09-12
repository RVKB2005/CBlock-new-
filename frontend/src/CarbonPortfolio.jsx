import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import {
  WalletIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  ShoppingBagIcon,
  FireIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  TagIcon,
  ClockIcon,
  SparklesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import CarbonABI from './abis/Carbon.json';
import MarketplaceABI from './abis/Marketplace.json';
import RetirementCertificateABI from './abis/RetirementCertificate.json';

export default function CarbonPortfolio({ walletAddress }) {
  const [portfolio, setPortfolio] = useState({
    credits: [],
    totalCredits: 0,
    totalValue: 0,
    avgPricePerCredit: 0,
    totalCO2Offset: 0
  });
  const [marketListings, setMarketListings] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [retiredCredits, setRetiredCredits] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('portfolio'); // portfolio, marketplace, retired
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Contract addresses
  const carbonAddress = import.meta.env.VITE_CONTRACT_CARBON_ADDRESS;
  const marketplaceAddress = import.meta.env.VITE_CONTRACT_MARKETPLACE_ADDRESS;
  const retirementAddress = import.meta.env.VITE_CONTRACT_RETIREMENT_CERTIFICATE_ADDRESS;

  useEffect(() => {
    if (walletAddress && carbonAddress) {
      loadPortfolioData();
    }
  }, [walletAddress, carbonAddress]);

  const loadPortfolioData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadOwnedCredits(),
        loadMarketListings(),
        loadRetiredCredits()
      ]);
    } catch (error) {
      console.error('Error loading portfolio:', error);
      toast.error('Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadOwnedCredits = async () => {
    try {
      if (!window.ethereum) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const carbon = new ethers.Contract(carbonAddress, CarbonABI, provider);
      
      // Get transfer events to find owned tokens
      const transferFilter = carbon.filters.TransferSingle(null, null, walletAddress);
      const events = await carbon.queryFilter(transferFilter);
      
      const ownedCredits = [];
      const tokenBalances = new Map();
      
      // Process transfer events to calculate balances
      for (const event of events) {
        const { id, value } = event.args;
        const tokenId = id.toString();
        const amount = Number(value);
        
        const currentBalance = await carbon.balanceOf(walletAddress, tokenId);
        if (Number(currentBalance) > 0) {
          tokenBalances.set(tokenId, Number(currentBalance));
        }
      }
      
      // Get attestation details for each owned token
      for (const [tokenId, balance] of tokenBalances) {
        try {
          const attestation = await carbon.attestations(tokenId);
          const tokenURI = await carbon.uri(tokenId);
          
          ownedCredits.push({
            tokenId,
            balance,
            gsProjectId: attestation.gsProjectId,
            gsSerial: attestation.gsSerial,
            ipfsCid: attestation.ipfsCid,
            originalAmount: Number(attestation.amount),
            verifier: attestation.verifier,
            tokenURI,
            createdAt: new Date().toISOString(), // Would be better to get from blockchain
            pricePerCredit: 25 // Mock price - would come from market data
          });
        } catch (error) {
          console.error(`Error loading attestation for token ${tokenId}:`, error);
        }
      }
      
      const totalCredits = ownedCredits.reduce((sum, credit) => sum + credit.balance, 0);
      const totalValue = ownedCredits.reduce((sum, credit) => sum + (credit.balance * credit.pricePerCredit), 0);
      const avgPricePerCredit = totalCredits > 0 ? totalValue / totalCredits : 0;
      const totalCO2Offset = totalCredits * 2.3; // Assuming 2.3 tons CO2 per credit
      
      setPortfolio({
        credits: ownedCredits,
        totalCredits,
        totalValue,
        avgPricePerCredit,
        totalCO2Offset
      });
      
    } catch (error) {
      console.error('Error loading owned credits:', error);
    }
  };

  const loadMarketListings = async () => {
    try {
      if (!window.ethereum || !marketplaceAddress) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, provider);
      
      // Get listing events
      const listingFilter = marketplace.filters.TokenListed();
      const events = await marketplace.queryFilter(listingFilter);
      
      const listings = [];
      const myOwnListings = [];
      
      for (const event of events) {
        const { seller, tokenId, amount, pricePerToken } = event.args;
        
        try {
          // Check if listing is still active
          const listing = await marketplace.listings(tokenId);
          if (Number(listing.amount) > 0) {
            const carbon = new ethers.Contract(carbonAddress, CarbonABI, provider);
            const attestation = await carbon.attestations(tokenId);
            
            const listingData = {
              tokenId: tokenId.toString(),
              seller,
              amount: Number(listing.amount),
              pricePerToken: Number(ethers.formatEther(listing.pricePerToken)),
              totalPrice: Number(ethers.formatEther(listing.pricePerToken)) * Number(listing.amount),
              gsProjectId: attestation.gsProjectId,
              gsSerial: attestation.gsSerial,
              ipfsCid: attestation.ipfsCid,
              verifier: attestation.verifier,
              isActive: true
            };
            
            if (seller.toLowerCase() === walletAddress.toLowerCase()) {
              myOwnListings.push(listingData);
            } else {
              listings.push(listingData);
            }
          }
        } catch (error) {
          console.error(`Error loading listing for token ${tokenId}:`, error);
        }
      }
      
      setMarketListings(listings);
      setMyListings(myOwnListings);
      
    } catch (error) {
      console.error('Error loading market listings:', error);
    }
  };

  const loadRetiredCredits = async () => {
    try {
      if (!window.ethereum || !retirementAddress) return;
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const retirement = new ethers.Contract(retirementAddress, RetirementCertificateABI, provider);
      
      // Get retirement certificates owned by user
      const transferFilter = retirement.filters.Transfer(null, walletAddress);
      const events = await retirement.queryFilter(transferFilter);
      
      const certificates = [];
      
      for (const event of events) {
        const { tokenId } = event.args;
        
        try {
          const owner = await retirement.ownerOf(tokenId);
          if (owner.toLowerCase() === walletAddress.toLowerCase()) {
            const tokenURI = await retirement.tokenURI(tokenId);
            
            certificates.push({
              certificateId: tokenId.toString(),
              tokenURI,
              retiredAt: new Date().toISOString(), // Would get from blockchain
              amount: 100, // Mock data - would come from token metadata
              reason: 'Voluntary retirement for carbon neutrality'
            });
          }
        } catch (error) {
          console.error(`Error loading certificate ${tokenId}:`, error);
        }
      }
      
      setRetiredCredits(certificates);
      
    } catch (error) {
      console.error('Error loading retired credits:', error);
    }
  };

  const listTokenForSale = async (tokenId, amount, pricePerToken) => {
    try {
      if (!window.ethereum) {
        toast.error('Please connect your wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, signer);
      const carbon = new ethers.Contract(carbonAddress, CarbonABI, signer);

      toast.loading('Listing token for sale...', { id: 'listing' });

      // First approve marketplace to spend tokens
      const isApproved = await carbon.isApprovedForAll(walletAddress, marketplaceAddress);
      if (!isApproved) {
        const approveTx = await carbon.setApprovalForAll(marketplaceAddress, true);
        await approveTx.wait();
      }

      // List the token
      const listTx = await marketplace.listToken(
        tokenId,
        amount,
        ethers.parseEther(pricePerToken.toString())
      );
      await listTx.wait();

      toast.dismiss('listing');
      toast.success('Token listed successfully!');
      
      // Reload data
      await loadPortfolioData();

    } catch (error) {
      console.error('Error listing token:', error);
      toast.dismiss('listing');
      
      let errorMessage = 'Failed to list token';
      if (error.message.includes('insufficient balance')) {
        errorMessage = 'Insufficient token balance';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      }
      
      toast.error(errorMessage);
    }
  };

  const buyToken = async (tokenId, amount, pricePerToken) => {
    try {
      if (!window.ethereum) {
        toast.error('Please connect your wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, signer);

      const totalPrice = ethers.parseEther((pricePerToken * amount).toString());

      toast.loading('Purchasing tokens...', { id: 'buying' });

      const buyTx = await marketplace.buyToken(tokenId, amount, { value: totalPrice });
      await buyTx.wait();

      toast.dismiss('buying');
      toast.success('Tokens purchased successfully!');
      
      // Reload data
      await loadPortfolioData();

    } catch (error) {
      console.error('Error buying token:', error);
      toast.dismiss('buying');
      
      let errorMessage = 'Failed to purchase token';
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      }
      
      toast.error(errorMessage);
    }
  };

  const retireCredits = async (tokenId, amount, retirementReason) => {
    try {
      if (!window.ethereum) {
        toast.error('Please connect your wallet');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const marketplace = new ethers.Contract(marketplaceAddress, MarketplaceABI, signer);

      toast.loading('Retiring carbon credits...', { id: 'retiring' });

      const retireTx = await marketplace.retireToken(
        tokenId,
        amount,
        retirementReason || 'Voluntary retirement'
      );
      await retireTx.wait();

      toast.dismiss('retiring');
      toast.success('Credits retired successfully! Certificate minted.');
      
      // Reload data
      await loadPortfolioData();

    } catch (error) {
      console.error('Error retiring credits:', error);
      toast.dismiss('retiring');
      
      let errorMessage = 'Failed to retire credits';
      if (error.message.includes('insufficient balance')) {
        errorMessage = 'Insufficient token balance';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      }
      
      toast.error(errorMessage);
    }
  };

  const filteredCredits = portfolio.credits.filter(credit =>
    credit.gsProjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    credit.gsSerial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredListings = marketListings.filter(listing =>
    listing.gsProjectId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    listing.gsSerial.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const CreditCard = ({ credit, showActions = true, isMarketListing = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden"
    >
      <div className="h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-gray-900">{credit.gsProjectId}</h3>
            <p className="text-sm text-gray-600">{credit.gsSerial}</p>
            <p className="text-xs text-gray-500 font-mono mt-1">Token #{credit.tokenId}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-600">
              {isMarketListing ? credit.amount : credit.balance}
            </div>
            <div className="text-sm text-gray-500">credits</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-xs text-gray-500">Price per Credit</span>
            <div className="font-semibold">
              ${isMarketListing ? credit.pricePerToken.toFixed(2) : credit.pricePerCredit.toFixed(2)}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Total Value</span>
            <div className="font-semibold">
              ${isMarketListing ? 
                credit.totalPrice.toLocaleString() : 
                (credit.balance * credit.pricePerCredit).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500">CO₂ Offset</span>
            <div className="font-semibold text-green-600">
              {((isMarketListing ? credit.amount : credit.balance) * 2.3).toFixed(1)} tons
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Verifier</span>
            <div className="font-mono text-xs">
              {credit.verifier.slice(0, 6)}...{credit.verifier.slice(-4)}
            </div>
          </div>
        </div>

        {showActions && (
          <div className="flex space-x-2">
            {isMarketListing ? (
              <button
                onClick={() => {
                  const amount = prompt('How many credits to buy?', credit.amount.toString());
                  if (amount && Number(amount) > 0 && Number(amount) <= credit.amount) {
                    buyToken(credit.tokenId, Number(amount), credit.pricePerToken);
                  }
                }}
                className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buy Credits
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    const amount = prompt('How many credits to list?', credit.balance.toString());
                    const price = prompt('Price per credit (ETH)?', '0.025');
                    if (amount && price && Number(amount) > 0 && Number(amount) <= credit.balance) {
                      listTokenForSale(credit.tokenId, Number(amount), Number(price));
                    }
                  }}
                  className="flex-1 bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  List for Sale
                </button>
                <button
                  onClick={() => {
                    const amount = prompt('How many credits to retire?', credit.balance.toString());
                    const reason = prompt('Retirement reason (optional)?', 'Voluntary retirement');
                    if (amount && Number(amount) > 0 && Number(amount) <= credit.balance) {
                      retireCredits(credit.tokenId, Number(amount), reason);
                    }
                  }}
                  className="flex-1 bg-red-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retire
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );

  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === id
          ? 'bg-green-100 text-green-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          activeTab === id ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-600'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  if (!walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view your carbon credits portfolio</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <ChartBarIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Carbon Portfolio
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            Track, trade, and retire your carbon credits
          </p>
        </motion.div>

        {/* Portfolio Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{portfolio.totalCredits.toLocaleString()}</p>
                <p className="text-gray-600">Total Credits</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <WalletIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${portfolio.totalValue.toLocaleString()}</p>
                <p className="text-gray-600">Portfolio Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <GlobeAltIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{portfolio.totalCO2Offset.toFixed(1)}</p>
                <p className="text-gray-600">CO₂ Tons Offset</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${portfolio.avgPricePerCredit.toFixed(2)}</p>
                <p className="text-gray-600">Avg Price/Credit</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          <TabButton 
            id="portfolio" 
            label="My Credits" 
            icon={WalletIcon} 
            count={portfolio.credits.length}
          />
          <TabButton 
            id="marketplace" 
            label="Marketplace" 
            icon={ShoppingBagIcon} 
            count={marketListings.length}
          />
          <TabButton 
            id="retired" 
            label="Retired" 
            icon={FireIcon} 
            count={retiredCredits.length}
          />
        </div>

        {/* Search and Controls */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search credits..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={loadPortfolioData}
            disabled={isLoading}
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'portfolio' && (
            <motion.div
              key="portfolio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredCredits.length > 0 ? (
                filteredCredits.map((credit) => (
                  <CreditCard key={credit.tokenId} credit={credit} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <WalletIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Credits Found</h3>
                  <p className="text-gray-600">You don't own any carbon credits yet.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'marketplace' && (
            <motion.div
              key="marketplace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredListings.length > 0 ? (
                filteredListings.map((listing) => (
                  <CreditCard key={listing.tokenId} credit={listing} isMarketListing={true} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <ShoppingBagIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Listings Found</h3>
                  <p className="text-gray-600">No carbon credits are currently listed for sale.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'retired' && (
            <motion.div
              key="retired"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {retiredCredits.length > 0 ? (
                retiredCredits.map((cert) => (
                  <motion.div
                    key={cert.certificateId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
                  >
                    <div className="h-2 bg-gradient-to-r from-red-400 to-orange-500"></div>
                    <div className="p-6">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                          <FireIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">Retirement Certificate</h3>
                          <p className="text-sm text-gray-600">#{cert.certificateId}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Amount Retired:</span>
                          <span className="font-semibold">{cert.amount} credits</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Retired At:</span>
                          <span className="text-sm">{new Date(cert.retiredAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Reason:</span> {cert.reason}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <FireIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Retired Credits</h3>
                  <p className="text-gray-600">You haven't retired any carbon credits yet.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
