import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  PlusCircleIcon,
  ShoppingBagIcon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  WalletIcon,
  ChartBarIcon,
  CogIcon,
  Bars3Icon,
  UserIcon
} from '@heroicons/react/24/outline';
import WalletConnection from './WalletConnection';

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: HomeIcon, description: 'Overview of your portfolio' },
  { name: 'My Tokens', href: 'tokens', icon: WalletIcon, description: 'View your carbon credits' },
  { name: 'Mint Credits', href: 'mint', icon: PlusCircleIcon, description: 'Create new carbon credits' },
  { name: 'Marketplace', href: 'market', icon: ShoppingBagIcon, description: 'Buy and sell credits' },
  { name: 'Retire Credits', href: 'retire', icon: ArrowRightOnRectangleIcon, description: 'Retire credits for impact' },
  { name: 'Analytics', href: 'analytics', icon: ChartBarIcon, description: 'Market insights and trends' },
];

export default function Layout({ children, currentPage, onPageChange, walletAddress, onConnectWallet, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-carbon-50 via-white to-primary-50">
      {/* Mobile sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-carbon-900/80 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-carbon-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-lg">🌱</span>
                  </div>
                  <h1 className="text-xl font-bold gradient-text">CBlock</h1>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-carbon-100 transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-carbon-600" />
                </button>
              </div>
              <MobileNavigation 
                navigation={navigation} 
                currentPage={currentPage} 
                onPageChange={onPageChange}
                onClose={() => setSidebarOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-72 lg:flex lg:flex-col">
        <div className="flex flex-col flex-1 bg-white shadow-lg">
          {/* Logo */}
          <div className="flex items-center px-6 py-6 border-b border-carbon-200">
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🌱</span>
            </div>
            <div className="ml-3">
              <h1 className="text-2xl font-bold gradient-text">CBlock</h1>
              <p className="text-sm text-carbon-600">Carbon Marketplace</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = currentPage === item.href;
              return (
                <motion.button
                  key={item.name}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onPageChange(item.href)}
                  className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                      : 'text-carbon-700 hover:bg-carbon-50 hover:text-carbon-900'
                  }`}
                >
                  <item.icon className={`w-6 h-6 mr-3 transition-colors ${
                    isActive ? 'text-primary-600' : 'text-carbon-500 group-hover:text-carbon-700'
                  }`} />
                  <div className="flex-1">
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </motion.button>
              );
            })}
          </nav>

          {/* User Info & Wallet Connection */}
          <div className="p-4 border-t border-carbon-200 space-y-3">
            {/* User Profile */}
            {user && (
              <div className="flex items-center space-x-3 p-3 bg-carbon-50 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-carbon-900 truncate">
                    {user.name || 'User'}
                  </p>
                  <p className="text-xs text-carbon-600 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onPageChange('settings')}
                    className="p-1.5 text-carbon-400 hover:text-carbon-600 transition-colors"
                    title="Settings"
                  >
                    <CogIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onLogout}
                    className="p-1.5 text-carbon-400 hover:text-carbon-600 transition-colors"
                    title="Logout"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            
            <WalletConnection address={walletAddress} onConnect={onConnectWallet} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar for mobile */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-carbon-200 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-carbon-100 transition-colors"
          >
            <Bars3Icon className="w-6 h-6 text-carbon-600" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">🌱</span>
            </div>
            <h1 className="text-lg font-bold gradient-text">CBlock</h1>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Page content */}
        <main className="flex-1">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-screen"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

function MobileNavigation({ navigation, currentPage, onPageChange, onClose }) {
  return (
    <nav className="flex-1 px-4 py-6 space-y-2">
      {navigation.map((item) => {
        const isActive = currentPage === item.href;
        return (
          <motion.button
            key={item.name}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              onPageChange(item.href);
              onClose();
            }}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-left transition-all duration-200 ${
              isActive
                ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                : 'text-carbon-700 hover:bg-carbon-50 hover:text-carbon-900'
            }`}
          >
            <item.icon className={`w-6 h-6 mr-3 transition-colors ${
              isActive ? 'text-primary-600' : 'text-carbon-500'
            }`} />
            <div className="flex-1">
              <div className="font-semibold">{item.name}</div>
              <div className="text-xs opacity-70">{item.description}</div>
            </div>
          </motion.button>
        );
      })}
    </nav>
  );
}
