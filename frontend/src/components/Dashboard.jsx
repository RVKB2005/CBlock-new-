import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  WalletIcon, 
  ShoppingBagIcon, 
  ArrowTrendingUpIcon,
  FireIcon,
  PlusCircleIcon,
  EyeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import blockchainService from '../services/blockchain.js';
import authService from '../services/auth.js';

const mockMarketData = [
  { month: 'Jan', price: 25, volume: 1200 },
  { month: 'Feb', price: 28, volume: 1400 },
  { month: 'Mar', price: 32, volume: 1600 },
  { month: 'Apr', price: 30, volume: 1300 },
  { month: 'May', price: 35, volume: 1800 },
  { month: 'Jun', price: 38, volume: 2000 },
];

export default function Dashboard({ walletAddress, onPageChange }) {
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalValue: 0,
    retiredTokens: 0,
    marketListings: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (walletAddress) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [walletAddress]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!walletAddress) {
        setLoading(false);
        return;
      }

      // Check if blockchain service is configured
      if (!blockchainService.isConfigured()) {
        console.warn('Smart contracts not configured');
        setStats({
          totalTokens: 0,
          totalValue: 0,
          retiredTokens: 0,
          marketListings: 0
        });
        setRecentActivity([]);
        setLoading(false);
        return;
      }

      // Initialize blockchain service if not already initialized
      if (!blockchainService.isInitialized) {
        await blockchainService.initialize();
      }
      
      // Get user's tokens from blockchain
      const tokens = await blockchainService.getUserTokens(walletAddress);
      const certificates = await blockchainService.getRetirementCertificates(walletAddress);
      const marketListings = await blockchainService.getMarketplaceListings();
      
      // Calculate stats from real data
      const totalTokens = tokens.reduce((sum, token) => sum + token.balance, 0);
      const totalValue = totalTokens * 35; // Price per token in USD
      const userListings = marketListings.filter(listing => 
        listing.seller.toLowerCase() === walletAddress.toLowerCase()
      );
      
      setStats({
        totalTokens,
        totalValue,
        retiredTokens: certificates.length,
        marketListings: userListings.length
      });

      // Generate recent activity from available data
      const activity = [];
      if (tokens.length > 0) {
        activity.push({
          type: 'mint',
          amount: tokens[tokens.length - 1]?.balance || 0,
          time: 'Recently',
          txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        });
      }
      if (userListings.length > 0) {
        activity.push({
          type: 'list',
          amount: userListings[userListings.length - 1]?.amount || 0,
          time: 'Recently',
          txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        });
      }
      if (certificates.length > 0) {
        activity.push({
          type: 'retire',
          amount: 10, // Default amount
          time: 'Recently',
          txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        });
      }
      
      setRecentActivity(activity);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Fallback to empty stats on error
      setStats({
        totalTokens: 0,
        totalValue: 0,
        retiredTokens: 0,
        marketListings: 0
      });
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color, onClick }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`card cursor-pointer bg-gradient-to-br ${color} text-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className="text-white/90 text-xs">
              <span className="text-green-300">↗ {change}%</span> from last month
            </p>
          )}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  if (!walletAddress) {
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
            Connect your MetaMask wallet to view your dashboard, manage carbon credits, and track your environmental impact.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <div className="btn-primary">
              <WalletIcon className="w-5 h-5 mr-2" />
              Connect Wallet in Sidebar
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-carbon-200 rounded w-64 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card">
                <div className="h-24 bg-carbon-100 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Smart Contract Configuration Warning */}
      {!blockchainService.isConfigured() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg"
        >
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                Smart contracts not configured
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Deploy contracts and update the .env file to enable blockchain features.
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-carbon-900">Dashboard</h1>
          <p className="text-carbon-600 mt-1">Welcome back to your carbon credit portfolio</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPageChange('mint')}
            className="btn-primary"
          >
            <PlusCircleIcon className="w-5 h-5 mr-2" />
            Mint Credits
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPageChange('market')}
            className="btn-secondary"
          >
            <EyeIcon className="w-5 h-5 mr-2" />
            View Market
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Credits"
          value={stats.totalTokens.toLocaleString()}
          change="12"
          icon={WalletIcon}
          color="from-blue-500 to-blue-600"
          onClick={() => onPageChange('tokens')}
        />
        <StatCard
          title="Portfolio Value"
          value={`$${stats.totalValue.toLocaleString()}`}
          change="8"
          icon={ChartBarIcon}
          color="from-primary-500 to-primary-600"
          onClick={() => onPageChange('tokens')}
        />
        <StatCard
          title="Active Listings"
          value={stats.marketListings.toLocaleString()}
          change="15"
          icon={ShoppingBagIcon}
          color="from-purple-500 to-purple-600"
          onClick={() => onPageChange('market')}
        />
        <StatCard
          title="Retired Credits"
          value={stats.retiredTokens.toLocaleString()}
          change="25"
          icon={FireIcon}
          color="from-red-500 to-red-600"
          onClick={() => onPageChange('retire')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Price Trend */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-carbon-900">Price Trend</h3>
            <div className="flex items-center space-x-2 text-green-600">
              <ArrowTrendingUpIcon className="w-4 h-4" />
              <span className="text-sm font-medium">+12.5%</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockMarketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#22c55e" 
                strokeWidth={3}
                dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Trading Volume */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="card"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-carbon-900">Trading Volume</h3>
            <span className="text-sm text-carbon-600">Credits/Month</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mockMarketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e2e8f0', 
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="volume" 
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <h3 className="text-lg font-semibold text-carbon-900 mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-carbon-600 text-center py-8">No recent activity</p>
          ) : (
            recentActivity.map((activity, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center space-x-4 p-4 rounded-lg bg-carbon-50 hover:bg-carbon-100 transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  activity.type === 'mint' ? 'bg-green-100 text-green-600' :
                  activity.type === 'sell' ? 'bg-blue-100 text-blue-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {activity.type === 'mint' && <PlusCircleIcon className="w-5 h-5" />}
                  {activity.type === 'sell' && <ShoppingBagIcon className="w-5 h-5" />}
                  {activity.type === 'retire' && <FireIcon className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-carbon-900">
                    {activity.type === 'mint' && 'Minted carbon credits'}
                    {activity.type === 'sell' && 'Listed credits for sale'}
                    {activity.type === 'retire' && 'Retired carbon credits'}
                  </p>
                  <p className="text-sm text-carbon-600">
                    {activity.amount} credits • {activity.time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-carbon-500 font-mono">{activity.txHash}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}
