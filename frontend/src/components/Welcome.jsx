import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRightIcon, 
  ShieldCheckIcon, 
  GlobeAltIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  UserGroupIcon,
  PlayIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

export default function Welcome({ onShowAuth }) {
  const features = [
    {
      icon: ShieldCheckIcon,
      title: 'Verified Credits',
      description: 'All carbon credits are verified by accredited organizations with blockchain transparency'
    },
    {
      icon: GlobeAltIcon,
      title: 'Global Impact',
      description: 'Connect with environmental projects worldwide and track your climate impact'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Secure Trading',
      description: 'Trade carbon credits securely with smart contracts and instant settlements'
    },
    {
      icon: ChartBarIcon,
      title: 'Real-time Analytics',
      description: 'Monitor market trends, price movements, and your portfolio performance'
    }
  ];

  const stats = [
    { number: '10M+', label: 'CO₂ Tons Offset' },
    { number: '500+', label: 'Verified Projects' },
    { number: '50K+', label: 'Active Users' },
    { number: '99.9%', label: 'Uptime' }
  ];

  const [currentSection, setCurrentSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'features', 'testimonials', 'pricing', 'cta'];
      const scrollPosition = window.scrollY + 100;

      sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setCurrentSection(section);
          }
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-cyan-50 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-white/80 backdrop-blur-md border-b border-primary-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">🌱</span>
            </div>
            <span className="text-2xl font-bold gradient-text">CBlock</span>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex items-center space-x-8"
          >
            <a href="#features" className="text-carbon-600 hover:text-primary-600 transition-colors">Features</a>
            <a href="#testimonials" className="text-carbon-600 hover:text-primary-600 transition-colors">Testimonials</a>
            <a href="#pricing" className="text-carbon-600 hover:text-primary-600 transition-colors">Pricing</a>
            <button 
              onClick={() => onShowAuth('login')}
              className="text-carbon-700 hover:text-primary-600 transition-colors font-medium"
            >
              Sign In
            </button>
            <button 
              onClick={() => onShowAuth('signup')}
              className="btn-primary"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="relative pt-20">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-primary-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-cyan-400/20 to-primary-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 opacity-20">
            <motion.div
              animate={{ 
                y: [-10, 10, -10],
                rotate: [0, 5, 0]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="text-6xl"
            >
              🌍
            </motion.div>
          </div>
          
          <div className="absolute top-40 right-20 opacity-30">
            <motion.div
              animate={{ 
                y: [10, -10, 10],
                rotate: [0, -5, 0]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="text-4xl"
            >
              ♻️
            </motion.div>
          </div>
          
          <div className="absolute bottom-40 left-1/4 opacity-25">
            <motion.div
              animate={{ 
                y: [-15, 15, -15],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="text-5xl"
            >
              🌿
            </motion.div>
          </div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column - Hero Content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="inline-flex items-center px-4 py-2 mb-6 bg-gradient-to-r from-primary-500/10 to-cyan-500/10 border border-primary-200 rounded-full text-primary-700 text-sm font-medium"
                >
                  🚀 Powered by Ethereum & IPFS
                </motion.div>
                
                <h1 className="text-6xl lg:text-7xl font-bold text-carbon-900 leading-tight mb-6">
                  The Future of
                  <span className="gradient-text block">Carbon Trading</span>
                </h1>
                <p className="text-xl lg:text-2xl text-carbon-600 mb-8 max-w-2xl leading-relaxed">
                  Trade verified carbon credits on the world's most transparent blockchain-powered marketplace. 
                  Make a real impact on climate change while building your sustainable portfolio.
                </p>
                
                {/* Value Proposition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg backdrop-blur-sm"
                  >
                    <CheckIcon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-carbon-700">Blockchain Verified</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg backdrop-blur-sm"
                  >
                    <CheckIcon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-carbon-700">Zero Fees</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center space-x-2 p-3 bg-white/50 rounded-lg backdrop-blur-sm"
                  >
                    <CheckIcon className="w-5 h-5 text-primary-600" />
                    <span className="text-sm font-medium text-carbon-700">Global Impact</span>
                  </motion.div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onShowAuth('signup')}
                  className="btn-primary text-lg px-8 py-4 flex items-center justify-center group"
                >
                  Start Trading
                  <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => window.open('/assets/CBlock.mp4', '_blank')}
                  className="btn-secondary text-lg px-8 py-4 flex items-center justify-center group"
                >
                  <PlayIcon className="w-5 h-5 mr-2" />
                  Watch Demo
                </motion.button>
              </motion.div>

              {/* Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-6"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-carbon-900">{stat.number}</div>
                    <div className="text-sm text-carbon-600">{stat.label}</div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Right Column - Dashboard Preview */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="relative"
            >
              <div className="relative">
                {/* Main Dashboard Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm">🌱</span>
                      </div>
                      <span className="font-semibold text-carbon-900">Portfolio Overview</span>
                    </div>
                    <div className="text-sm text-carbon-500">Live</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-4 text-white">
                      <div className="text-2xl font-bold">1,250</div>
                      <div className="text-primary-100">Credits Owned</div>
                    </div>
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg p-4 text-white">
                      <div className="text-2xl font-bold">$43,750</div>
                      <div className="text-cyan-100">Portfolio Value</div>
                    </div>
                  </div>
                  
                  {/* Mini Chart */}
                  <div className="h-20 bg-gradient-to-r from-primary-50 to-cyan-50 rounded-lg flex items-end justify-between p-3">
                    {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                      <div 
                        key={i}
                        className="bg-gradient-to-t from-primary-500 to-cyan-500 rounded-sm w-4 transition-all duration-500 hover:scale-110"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 }}
                  className="absolute -top-6 -right-6 bg-white rounded-xl shadow-lg p-4 border border-primary-100"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-carbon-700">Market Active</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-4 border border-cyan-100"
                >
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-4 h-4 text-cyan-500" />
                    <span className="text-sm font-medium text-carbon-700">2.4k Online</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-carbon-900 mb-4">
              Why Choose CBlock?
            </h2>
            <p className="text-xl text-carbon-600 max-w-3xl mx-auto">
              Join thousands of organizations and individuals making a real difference in the fight against climate change.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="text-center group"
              >
                <div className="w-16 h-16 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-carbon-900 mb-3">{feature.title}</h3>
                <p className="text-carbon-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-gradient-to-br from-carbon-50 to-primary-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-carbon-900 mb-4">
              Trusted by Climate Leaders
            </h2>
            <p className="text-xl text-carbon-600 max-w-3xl mx-auto">
              Join organizations making a measurable impact on global climate action.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "CBlock has revolutionized how we approach carbon offsetting. The transparency and verification process gives us complete confidence.",
                author: "Sarah Chen",
                role: "Sustainability Director",
                company: "TechCorp Global",
                avatar: "SC"
              },
              {
                quote: "The blockchain integration ensures every credit is authentic. We've offset 10,000+ tons through the platform with full traceability.",
                author: "Michael Rodriguez",
                role: "Environmental Manager",
                company: "Green Industries",
                avatar: "MR"
              },
              {
                quote: "Outstanding user experience and real impact. The marketplace makes carbon trading accessible and transparent for everyone.",
                author: "Dr. Emily Watson",
                role: "Climate Researcher",
                company: "Climate Institute",
                avatar: "EW"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="bg-white p-6 rounded-2xl shadow-lg border border-carbon-200 hover:shadow-xl transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  {[1,2,3,4,5].map((star) => (
                    <svg key={star} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-carbon-700 mb-6 italic">
                  "{testimonial.quote}"
                </blockquote>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-cyan-500 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-semibold">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-carbon-900">{testimonial.author}</div>
                    <div className="text-sm text-carbon-600">{testimonial.role}</div>
                    <div className="text-sm text-primary-600">{testimonial.company}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-white relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold text-carbon-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-carbon-600 max-w-3xl mx-auto">
              Choose the plan that fits your carbon trading needs. All plans include full access to our blockchain-powered marketplace.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="bg-white border border-carbon-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-carbon-900 mb-2">Explorer</h3>
                <div className="text-4xl font-bold text-primary-600 mb-2">Free</div>
                <p className="text-carbon-600">Perfect for getting started</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Browse marketplace</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">View portfolio analytics</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Basic market insights</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Up to 10 transactions/month</span>
                </li>
              </ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShowAuth('signup')}
                className="w-full btn-secondary"
              >
                Get Started Free
              </motion.button>
            </motion.div>

            {/* Pro Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="bg-gradient-to-br from-primary-50 to-cyan-50 border-2 border-primary-200 rounded-2xl p-8 shadow-xl relative"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-primary-500 to-cyan-500 text-white px-4 py-2 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-carbon-900 mb-2">Professional</h3>
                <div className="text-4xl font-bold text-primary-600 mb-2">$29<span className="text-lg text-carbon-600">/month</span></div>
                <p className="text-carbon-600">For active traders and organizations</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Unlimited transactions</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Advanced analytics & reporting</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Priority support</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">API access</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Custom integrations</span>
                </li>
              </ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShowAuth('signup')}
                className="w-full btn-primary"
              >
                Start Pro Trial
              </motion.button>
            </motion.div>

            {/* Enterprise Plan */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="bg-white border border-carbon-200 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-carbon-900 mb-2">Enterprise</h3>
                <div className="text-4xl font-bold text-primary-600 mb-2">Custom</div>
                <p className="text-carbon-600">Tailored solutions for large organizations</p>
              </div>

              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Everything in Professional</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Dedicated account manager</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">Custom reporting & dashboards</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">White-label solutions</span>
                </li>
                <li className="flex items-center">
                  <CheckIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <span className="text-carbon-700">SLA guarantees</span>
                </li>
              </ul>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShowAuth('signup')}
                className="w-full btn-secondary"
              >
                Contact Sales
              </motion.button>
            </motion.div>
          </div>

          {/* FAQ Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 max-w-3xl mx-auto"
          >
            <h3 className="text-2xl font-bold text-carbon-900 text-center mb-8">Frequently Asked Questions</h3>
            <div className="space-y-6">
              <div className="bg-carbon-50 rounded-lg p-6">
                <h4 className="font-semibold text-carbon-900 mb-2">Are there any hidden fees?</h4>
                <p className="text-carbon-600">No hidden fees. All pricing is transparent, and transaction fees are clearly displayed before any trade.</p>
              </div>
              <div className="bg-carbon-50 rounded-lg p-6">
                <h4 className="font-semibold text-carbon-900 mb-2">Can I change plans anytime?</h4>
                <p className="text-carbon-600">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
              </div>
              <div className="bg-carbon-50 rounded-lg p-6">
                <h4 className="font-semibold text-carbon-900 mb-2">Is there a free trial?</h4>
                <p className="text-carbon-600">Yes, all paid plans come with a 14-day free trial. No credit card required to start.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="cta" className="py-24 bg-gradient-to-r from-primary-600 to-cyan-600 relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse delay-1000"></div>
        </div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold text-white mb-6">
              Ready to Make an Impact?
            </h2>
            <p className="text-2xl text-primary-100 mb-12 leading-relaxed">
              Join the carbon credit revolution and start trading verified environmental assets today.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-1">50K+</div>
                <div className="text-primary-100 text-sm">Active Users</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-1">10M+</div>
                <div className="text-primary-100 text-sm">CO₂ Offset</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-1">500+</div>
                <div className="text-primary-100 text-sm">Projects</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center"
              >
                <div className="text-3xl font-bold text-white mb-1">99.9%</div>
                <div className="text-primary-100 text-sm">Uptime</div>
              </motion.div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShowAuth('signup')}
                className="bg-white text-primary-600 px-10 py-5 rounded-xl font-bold text-lg hover:bg-primary-50 transition-all duration-300 flex items-center justify-center shadow-2xl"
              >
                Create Account
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onShowAuth('login')}
                className="border-2 border-white text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white hover:text-primary-600 transition-all duration-300 shadow-2xl"
              >
                Sign In
              </motion.button>
            </div>
            
            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 opacity-80">
              <div className="text-primary-100 text-sm flex items-center">
                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                Enterprise Security
              </div>
              <div className="text-primary-100 text-sm flex items-center">
                <GlobeAltIcon className="w-5 h-5 mr-2" />
                Global Compliance
              </div>
              <div className="text-primary-100 text-sm flex items-center">
                <CheckIcon className="w-5 h-5 mr-2" />
                ISO Certified
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
