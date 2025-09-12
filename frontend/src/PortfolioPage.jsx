import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  WalletIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  CalendarIcon,
  MapPinIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShareIcon,
  TrashIcon,
  PlusIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  SparklesIcon,
  TagIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { useDemoCredits } from './MintCreditsPage';

const FILTER_OPTIONS = [
  { id: 'all', label: 'All Projects', count: 0 },
  { id: 'renewable-energy', label: 'Renewable Energy', count: 0 },
  { id: 'forest-conservation', label: 'Forest Conservation', count: 0 },
  { id: 'carbon-capture', label: 'Carbon Capture', count: 0 },
  { id: 'sustainable-transport', label: 'Sustainable Transport', count: 0 },
  { id: 'waste-management', label: 'Waste Management', count: 0 },
  { id: 'agricultural', label: 'Sustainable Agriculture', count: 0 }
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest First' },
  { id: 'oldest', label: 'Oldest First' },
  { id: 'credits-high', label: 'Most Credits' },
  { id: 'credits-low', label: 'Least Credits' },
  { id: 'value-high', label: 'Highest Value' },
  { id: 'value-low', label: 'Lowest Value' }
];

export default function PortfolioPage({ onNavigate }) {
  const { demoCredits, totalCredits, mintHistory } = useDemoCredits();
  
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Filter and sort credits
  const filteredCredits = demoCredits.filter(credit => {
    const matchesFilter = selectedFilter === 'all' || credit.projectType === selectedFilter;
    const matchesSearch = credit.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         credit.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         credit.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedCredits = [...filteredCredits].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt) - new Date(a.createdAt);
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'credits-high':
        return b.credits - a.credits;
      case 'credits-low':
        return a.credits - b.credits;
      case 'value-high':
        return (b.credits * b.pricePerCredit) - (a.credits * a.pricePerCredit);
      case 'value-low':
        return (a.credits * a.pricePerCredit) - (b.credits * b.pricePerCredit);
      default:
        return 0;
    }
  });

  // Update filter counts
  const filterOptionsWithCounts = FILTER_OPTIONS.map(option => ({
    ...option,
    count: option.id === 'all' 
      ? demoCredits.length 
      : demoCredits.filter(credit => credit.projectType === option.id).length
  }));

  // Calculate portfolio stats
  const totalValue = demoCredits.reduce((sum, credit) => sum + (credit.credits * credit.pricePerCredit), 0);
  const totalCO2Offset = totalCredits * 2.3;
  const avgPricePerCredit = totalCredits > 0 ? totalValue / totalCredits : 0;

  const handleRetire = (creditId) => {
    toast.success('Carbon credits retired successfully!', {
      icon: '🌿',
      duration: 3000
    });
  };

  const handleShare = (credit) => {
    if (navigator.share) {
      navigator.share({
        title: `Carbon Credit: ${credit.projectName}`,
        text: `Check out this carbon credit project: ${credit.projectName} in ${credit.location}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`${credit.projectName} - ${credit.credits} carbon credits from ${credit.location}`);
      toast.success('Project details copied to clipboard!');
    }
  };

  if (demoCredits.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg">
              <WalletIcon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Your Carbon Credits Portfolio
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              You haven't minted any carbon credits yet. Start creating projects to build your sustainable portfolio.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => onNavigate('mintCredits')}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <PlusIcon className="w-6 h-6 mr-3" />
                Create Your First Project
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-2xl hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Dashboard
              </button>
            </div>
          </motion.div>
        </div>
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
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
              <WalletIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Your Portfolio
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Manage and track your carbon credit investments. Monitor your environmental impact and portfolio performance.
          </p>
        </motion.div>

        {/* Portfolio Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
        >
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCredits.toLocaleString()}</p>
                <p className="text-gray-600">Total Credits</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${totalValue.toLocaleString()}</p>
                <p className="text-gray-600">Portfolio Value</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <GlobeAltIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalCO2Offset.toLocaleString()}</p>
                <p className="text-gray-600">CO₂ Tons Offset</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TagIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${avgPricePerCredit.toFixed(2)}</p>
                <p className="text-gray-600">Avg. Price/Credit</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                {filterOptionsWithCounts.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label} ({option.count})
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => onNavigate('mintCredits')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 transition-all duration-200"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Project
              </button>
            </div>
          </div>
        </motion.div>

        {/* Credits Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
        >
          {sortedCredits.map((credit, index) => (
            <motion.div
              key={credit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden border border-white/20 shadow-lg hover:shadow-2xl transition-all duration-300 group"
            >
              {/* Card Header */}
              <div className={`h-2 bg-gradient-to-r ${credit.template?.color || 'from-gray-400 to-gray-600'}`} />
              
              <div className="p-6">
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {credit.template && (
                      <div className={`w-12 h-12 bg-gradient-to-r ${credit.template.color} rounded-xl flex items-center justify-center text-lg shadow-md`}>
                        {credit.template.icon}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">
                        {credit.projectName}
                      </h3>
                      <p className="text-gray-600 text-sm flex items-center">
                        <MapPinIcon className="w-4 h-4 mr-1" />
                        {credit.location}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedCredit(credit)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
                    >
                      <EyeIcon className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleShare(credit)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors duration-200"
                    >
                      <ShareIcon className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                {/* Project Stats */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Credits:</span>
                    <span className="font-semibold text-gray-900">{credit.credits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Value:</span>
                    <span className="font-semibold text-gray-900">${(credit.credits * credit.pricePerCredit).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Price/Credit:</span>
                    <span className="font-semibold text-gray-900">${credit.pricePerCredit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">CO₂ Offset:</span>
                    <span className="font-semibold text-gray-900">{(credit.credits * 2.3).toLocaleString()} tons</span>
                  </div>
                </div>

                {/* Token Info */}
                <div className="bg-gray-50 rounded-xl p-3 mb-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Token ID:</span>
                    <span className="font-mono font-semibold">{credit.tokenId}</span>
                  </div>
                </div>

                {/* Status and Date */}
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircleIcon className="w-3 h-3 mr-1" />
                    Active
                  </span>
                  <span className="text-xs text-gray-500 flex items-center">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    {new Date(credit.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => handleRetire(credit.id)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold py-2 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                  >
                    Retire Credits
                  </button>
                  <button
                    onClick={() => setSelectedCredit(credit)}
                    className="flex-1 border border-gray-300 text-gray-700 text-sm font-semibold py-2 px-4 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* No Results */}
        {sortedCredits.length === 0 && (searchQuery || selectedFilter !== 'all') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedFilter('all');
              }}
              className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              <ArrowPathIcon className="w-5 h-5 mr-2" />
              Clear Filters
            </button>
          </motion.div>
        )}
      </div>

      {/* Credit Detail Modal */}
      <AnimatePresence>
        {selectedCredit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedCredit(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className={`h-32 bg-gradient-to-r ${selectedCredit.template?.color || 'from-gray-400 to-gray-600'} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative h-full flex items-center justify-between p-6">
                  <div className="flex items-center space-x-4">
                    {selectedCredit.template && (
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
                        {selectedCredit.template.icon}
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedCredit.projectName}</h2>
                      <p className="text-white/80">{selectedCredit.location}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCredit(null)}
                    className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Project Description */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Description</h3>
                  <p className="text-gray-600 leading-relaxed">{selectedCredit.description}</p>
                </div>

                {/* Project Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Project Type:</span>
                        <span className="font-medium">{selectedCredit.template?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Start Date:</span>
                        <span className="font-medium">{new Date(selectedCredit.startDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">End Date:</span>
                        <span className="font-medium">{new Date(selectedCredit.endDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Methodology:</span>
                        <span className="font-medium">{selectedCredit.methodology || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Standard:</span>
                        <span className="font-medium">{selectedCredit.verificationStandard || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Token Information</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Credits Minted:</span>
                        <span className="font-medium">{selectedCredit.credits.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price per Credit:</span>
                        <span className="font-medium">${selectedCredit.pricePerCredit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Value:</span>
                        <span className="font-medium">${(selectedCredit.credits * selectedCredit.pricePerCredit).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">CO₂ Offset:</span>
                        <span className="font-medium">{(selectedCredit.credits * 2.3).toLocaleString()} tons</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Token ID:</span>
                        <span className="font-mono text-sm">{selectedCredit.tokenId}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blockchain Information */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Blockchain Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Transaction Hash:</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded break-all">
                        {selectedCredit.transactionHash}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Minted:</span>
                      <span className="font-medium">{new Date(selectedCredit.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => handleRetire(selectedCredit.id)}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200"
                  >
                    Retire Credits
                  </button>
                  <button
                    onClick={() => handleShare(selectedCredit)}
                    className="flex-1 border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    Share Project
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
