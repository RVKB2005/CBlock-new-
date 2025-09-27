import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  WalletIcon,
  ShoppingBagIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import blockchainService from '../services/blockchain.js';

const mockMarketData = [
  { month: 'Jan', price: 25, volume: 1200, credits: 450 },
  { month: 'Feb', price: 28, volume: 1400, credits: 520 },
  { month: 'Mar', price: 32, volume: 1600, credits: 680 },
  { month: 'Apr', price: 30, volume: 1300, credits: 590 },
  { month: 'May', price: 35, volume: 1800, credits: 750 },
  { month: 'Jun', price: 38, volume: 2000, credits: 820 },
];

const COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'];

export default function AnalyticsPage({ walletAddress }) {
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalValue: 0,
    retiredTokens: 0,
    marketListings: 0
  });
  const [globalStats, setGlobalStats] = useState({
    totalGlobalCredits: 0,
    totalGlobalValue: 0,
    totalActiveListings: 0,
    totalRetiredCredits: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, [walletAddress]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);

      // Load user's personal stats
      if (walletAddress && blockchainService.isConfigured()) {
        if (!blockchainService.isInitialized) {
          await blockchainService.initialize();
        }

        const tokens = await blockchainService.getUserTokens(walletAddress);
        const certificates = await blockchainService.getRetirementCertificates(walletAddress);
        const marketListings = await blockchainService.getMarketplaceListings();

        const totalTokens = tokens.reduce((sum, token) => sum + token.balance, 0);
        const totalValue = totalTokens * 35;
        const userListings = marketListings.filter(listing =>
          listing.seller.toLowerCase() === walletAddress.toLowerCase()
        );

        setStats({
          totalTokens,
          totalValue,
          retiredTokens: certificates.length,
          marketListings: userListings.length
        });
      }

      // Load global stats (simulated for demo)
      setGlobalStats({
        totalGlobalCredits: 125000,
        totalGlobalValue: 4375000,
        totalActiveListings: 450,
        totalRetiredCredits: 89000
      });

    } catch (error) {
      console.error('Error loading analytics data:', error);
      setStats({
        totalTokens: 0,
        totalValue: 0,
        retiredTokens: 0,
        marketListings: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, change, icon: Icon, color, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className={`card cursor-pointer bg-gradient-to-br ${color} text-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className="text-white/90 text-xs flex items-center">
              {change > 0 ? (
                <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
              )}
              <span className={change > 0 ? 'text-green-300' : 'text-red-300'}>
                {change > 0 ? '+' : ''}{change}% from last month
              </span>
            </p>
          )}
          {subtitle && (
            <p className="text-white/70 text-xs mt-1">{subtitle}</p>
          )}
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

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
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
          Carbon Market Analytics
        </h1>
        <p className="text-carbon-600 mt-2">Comprehensive insights into carbon credit markets and your portfolio</p>
      </motion.div>

      {/* Personal Stats */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-carbon-900">Your Portfolio</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Credits"
            value={stats.totalTokens.toLocaleString()}
            change={12}
            icon={WalletIcon}
            color="from-blue-500 to-blue-600"
            subtitle="Carbon credits owned"
          />
          <StatCard
            title="Portfolio Value"
            value={`$${stats.totalValue.toLocaleString()}`}
            change={8}
            icon={ChartBarIcon}
            color="from-green-500 to-green-600"
            subtitle="Estimated market value"
          />
          <StatCard
            title="Active Listings"
            value={stats.marketListings.toLocaleString()}
            change={15}
            icon={ShoppingBagIcon}
            color="from-purple-500 to-purple-600"
            subtitle="Credits listed for sale"
          />
          <StatCard
            title="Retired Credits"
            value={stats.retiredTokens.toLocaleString()}
            change={25}
            icon={FireIcon}
            color="from-red-500 to-red-600"
            subtitle="Credits permanently retired"
          />
        </div>
      </div>

      {/* Global Market Stats */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-carbon-900">Market Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Global Credits"
            value={globalStats.totalGlobalCredits.toLocaleString()}
            change={18}
            icon={ArrowTrendingUpIcon}
            color="from-indigo-500 to-indigo-600"
            subtitle="Total credits in circulation"
          />
          <StatCard
            title="Market Value"
            value={`$${(globalStats.totalGlobalValue / 1000000).toFixed(1)}M`}
            change={22}
            icon={ChartBarIcon}
            color="from-teal-500 to-teal-600"
            subtitle="Total market capitalization"
          />
          <StatCard
            title="Active Listings"
            value={globalStats.totalActiveListings.toLocaleString()}
            change={-5}
            icon={ShoppingBagIcon}
            color="from-orange-500 to-orange-600"
            subtitle="Credits available for trading"
          />
          <StatCard
            title="Retired Credits"
            value={globalStats.totalRetiredCredits.toLocaleString()}
            change={30}
            icon={FireIcon}
            color="from-pink-500 to-pink-600"
            subtitle="Credits removed from circulation"
          />
        </div>
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
            <h3 className="text-lg font-semibold text-carbon-900">Carbon Credit Price Trend</h3>
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
            <span className="text-sm text-carbon-600">Credits traded per month</span>
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

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Credit Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-carbon-900 mb-6">Credit Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Active', value: stats.totalTokens, fill: COLORS[0] },
                  { name: 'Listed', value: stats.marketListings * 10, fill: COLORS[1] },
                  { name: 'Retired', value: stats.retiredTokens * 5, fill: COLORS[2] }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'Active', value: stats.totalTokens },
                  { name: 'Listed', value: stats.marketListings * 10 },
                  { name: 'Retired', value: stats.retiredTokens * 5 }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Monthly Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-carbon-900 mb-6">Monthly Credit Growth</h3>
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
                dataKey="credits"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </div>
  );
}