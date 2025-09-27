import React, { useState, useContext, createContext, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  SparklesIcon,
  DocumentTextIcon,
  CameraIcon,
  MapPinIcon,
  CalendarIcon,
  TagIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowRightIcon,
  ClockIcon,
  GlobeAltIcon,
  BeakerIcon,
  ChartBarIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import authService from './services/auth.js';
import errorHandler from './services/errorHandler.js';
import toastNotifications from './components/ToastNotifications.jsx';
import { LoadingOverlay } from './components/LoadingStates.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ROLES, PERMISSIONS, isVerifier, getCurrentUserRole, getRoleDisplayName } from './utils/permissions.js';

// Demo Credits Context
const DemoCreditsContext = createContext();

export const DemoCreditsProvider = ({ children }) => {
  const [demoCredits, setDemoCredits] = useState([]);
  const [mintHistory, setMintHistory] = useState([]);

  const addDemoCredit = useCallback((credit) => {
    const newCredit = {
      ...credit,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'minted',
      tokenId: `DCT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
    };

    setDemoCredits(prev => [newCredit, ...prev]);
    setMintHistory(prev => [{
      id: newCredit.id,
      type: 'mint',
      projectName: credit.projectName,
      credits: credit.credits,
      timestamp: new Date().toISOString()
    }, ...prev]);

    return newCredit;
  }, []);

  const value = {
    demoCredits,
    mintHistory,
    addDemoCredit,
    totalCredits: demoCredits.reduce((sum, credit) => sum + credit.credits, 0)
  };

  return (
    <DemoCreditsContext.Provider value={value}>
      {children}
    </DemoCreditsContext.Provider>
  );
};

export const useDemoCredits = () => {
  const context = useContext(DemoCreditsContext);
  if (!context) {
    throw new Error('useDemoCredits must be used within a DemoCreditsProvider');
  }
  return context;
};

// Project Type Templates
const PROJECT_TEMPLATES = [
  {
    id: 'renewable-energy',
    name: 'Renewable Energy',
    icon: '⚡',
    description: 'Solar, wind, and other clean energy projects',
    color: 'from-yellow-400 to-orange-500',
    examples: ['Solar Farm Installation', 'Wind Energy Project', 'Hydroelectric Plant'],
    defaultCredits: 1000
  },
  {
    id: 'forest-conservation',
    name: 'Forest Conservation',
    icon: '🌲',
    description: 'Forest protection and reforestation initiatives',
    color: 'from-green-400 to-emerald-600',
    examples: ['Amazon Rainforest Protection', 'Urban Tree Planting', 'Mangrove Restoration'],
    defaultCredits: 750
  },
  {
    id: 'carbon-capture',
    name: 'Carbon Capture',
    icon: '🏭',
    description: 'Direct air capture and storage technologies',
    color: 'from-blue-400 to-indigo-600',
    examples: ['Industrial Carbon Capture', 'Ocean Carbon Storage', 'Soil Carbon Enhancement'],
    defaultCredits: 1200
  },
  {
    id: 'sustainable-transport',
    name: 'Sustainable Transport',
    icon: '🚌',
    description: 'Electric vehicles and public transport projects',
    color: 'from-purple-400 to-pink-500',
    examples: ['Electric Bus Fleet', 'EV Charging Network', 'Bike Share Program'],
    defaultCredits: 500
  },
  {
    id: 'waste-management',
    name: 'Waste Management',
    icon: '♻️',
    description: 'Recycling and waste reduction initiatives',
    color: 'from-teal-400 to-cyan-600',
    examples: ['Plastic Recycling Plant', 'Composting Facility', 'Waste-to-Energy Plant'],
    defaultCredits: 300
  },
  {
    id: 'agricultural',
    name: 'Sustainable Agriculture',
    icon: '🌾',
    description: 'Regenerative farming and soil health projects',
    color: 'from-amber-400 to-yellow-600',
    examples: ['Regenerative Farming', 'Precision Agriculture', 'Organic Conversion'],
    defaultCredits: 400
  }
];

// Location suggestions
const LOCATION_SUGGESTIONS = [
  'California, USA', 'New York, USA', 'Texas, USA', 'British Columbia, Canada',
  'Ontario, Canada', 'London, UK', 'Berlin, Germany', 'Paris, France',
  'Amsterdam, Netherlands', 'São Paulo, Brazil', 'Tokyo, Japan', 'Sydney, Australia',
  'Singapore', 'Mumbai, India', 'Beijing, China', 'Lagos, Nigeria'
];

export default function MintCreditsPage({ onNavigate }) {
  const { addDemoCredit, totalCredits, demoCredits } = useDemoCredits();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [formData, setFormData] = useState({
    projectName: '',
    projectType: '',
    description: '',
    location: '',
    startDate: '',
    endDate: '',
    credits: '',
    pricePerCredit: '',
    methodology: '',
    verificationStandard: '',
    images: []
  });

  // Check user role and redirect verifiers
  useEffect(() => {
    try {
      const user = authService.getCurrentUser();
      const role = getCurrentUserRole(user);

      setCurrentUser(user);
      setUserRole(role);

      // Redirect verifiers to their dashboard
      if (isVerifier(user)) {
        toastNotifications.info(
          'As a verifier, you should use the Verifier Dashboard for document review and minting.',
          {
            icon: '🔄',
            duration: 3000,
            roleSpecific: true,
            operation: 'role_redirect'
          }
        );
        setTimeout(() => {
          onNavigate('verifierDashboard');
        }, 2000);
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        {
          operation: 'user_role_check',
          component: 'MintCreditsPage'
        },
        {
          showToast: true,
          showRetry: false
        }
      );
    }
  }, [onNavigate]);

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      projectType: template.id,
      credits: template.defaultCredits.toString(),
      pricePerCredit: '25'
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateDemoProject = () => {
    const template = PROJECT_TEMPLATES[Math.floor(Math.random() * PROJECT_TEMPLATES.length)];
    const example = template.examples[Math.floor(Math.random() * template.examples.length)];
    const location = LOCATION_SUGGESTIONS[Math.floor(Math.random() * LOCATION_SUGGESTIONS.length)];

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Math.floor(Math.random() * 12));
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1 + Math.floor(Math.random() * 3));

    setSelectedTemplate(template);
    setFormData({
      projectName: example,
      projectType: template.id,
      description: `A comprehensive ${template.name.toLowerCase()} project focused on reducing carbon emissions and promoting environmental sustainability.`,
      location: location,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      credits: (template.defaultCredits + Math.floor(Math.random() * 500)).toString(),
      pricePerCredit: (20 + Math.floor(Math.random() * 20)).toString(),
      methodology: 'VCS (Verified Carbon Standard)',
      verificationStandard: 'Gold Standard',
      images: []
    });
    setShowCreateForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const currentUserRole = userRole || getCurrentUserRole(currentUser);

    try {
      setIsSubmitting(true);

      // Show loading notification
      const loadingToastId = toastNotifications.loading(
        'Creating project submission...',
        {
          roleSpecific: true,
          operation: 'project_creation'
        }
      );

      // Validate form data
      if (!formData.projectName.trim()) {
        throw new Error('Project name is required');
      }

      if (!formData.description.trim()) {
        throw new Error('Project description is required');
      }

      if (!formData.location.trim()) {
        throw new Error('Project location is required');
      }

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For non-verifiers, create a document submission record
      if (currentUserRole !== ROLES.VERIFIER) {
        const documentSubmission = {
          ...formData,
          credits: formData.credits ? parseInt(formData.credits) : null,
          pricePerCredit: null, // Not set by uploaders
          template: selectedTemplate,
          status: 'pending_verification',
          submittedBy: currentUser?.email || 'Unknown',
          submitterRole: userRole
        };

        const newDocument = addDemoCredit(documentSubmission);

        // Dismiss loading notification
        toastNotifications.dismiss(loadingToastId);

        // Show success notification with role-specific messaging
        toastNotifications.success(
          `Project submitted successfully for verification!`,
          {
            roleSpecific: true,
            operation: 'project_submission',
            duration: 5000
          }
        );

        // Show additional guidance for non-verifiers
        setTimeout(() => {
          toastNotifications.info(
            `Your project is now in the verification queue. You'll be notified when a verifier reviews it.`,
            {
              roleSpecific: true,
              operation: 'verification_queue',
              duration: 7000
            }
          );
        }, 2000);
      }

      // Reset form
      setFormData({
        projectName: '',
        projectType: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        credits: '',
        pricePerCredit: '',
        methodology: '',
        verificationStandard: '',
        images: []
      });
      setSelectedTemplate(null);
      setShowCreateForm(false);

    } catch (error) {
      // Enhanced error handling
      errorHandler.handleError(
        error,
        {
          operation: 'project_submission',
          component: 'MintCreditsPage',
          userRole: currentUserRole,
          formData: {
            projectName: formData.projectName,
            projectType: formData.projectType,
            location: formData.location
          }
        },
        {
          showToast: true,
          showRetry: true,
          retryAction: () => handleSubmit(e)
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ErrorBoundary componentName="MintCreditsPage" context={{ userRole, currentUser }}>
      <LoadingOverlay
        show={isSubmitting}
        message="Processing project submission..."
        userRole={userRole}
        operation="project_creation"
      />
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
                <SparklesIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                {userRole === ROLES.VERIFIER ? 'Verifier Dashboard Access' : 'Submit Project Documents'}
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              {userRole === ROLES.VERIFIER
                ? 'As a verifier, you have access to the Verifier Dashboard where you can review documents, perform attestations, and mint carbon credits.'
                : 'Submit your environmental impact project documentation for verification. Upload project details to begin the carbon credit verification process.'
              }
            </p>
          </motion.div>

          {/* Role-based Information Banner */}
          {userRole && userRole !== ROLES.VERIFIER && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="mb-8"
            >
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 shadow-lg">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <InformationCircleIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                      Document Upload for {getRoleDisplayName(userRole)}s
                    </h3>
                    <p className="text-blue-800 mb-3">
                      As a {getRoleDisplayName(userRole).toLowerCase()}, you can upload documents for verification.
                      Only verified documents can be minted into carbon credits by authorized verifiers.
                    </p>
                    <div className="bg-blue-100 rounded-lg p-3">
                      <p className="text-sm text-blue-700 font-medium">
                        📋 What you can do: Upload project documents, track submission status, view your document portfolio
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        🔒 What requires verification: Document attestation and credit minting (performed by verifiers)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Stats Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12"
          >
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <ChartBarIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{userRole === ROLES.VERIFIER ? totalCredits.toLocaleString() : demoCredits.length}</p>
                  <p className="text-gray-600">{userRole === ROLES.VERIFIER ? 'Total Credits Minted' : 'Documents Submitted'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DocumentTextIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{demoCredits.length}</p>
                  <p className="text-gray-600">Active Projects</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${(totalCredits * 25).toLocaleString()}
                  </p>
                  <p className="text-gray-600">Estimated Value</p>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {(totalCredits * 2.3).toLocaleString()}
                  </p>
                  <p className="text-gray-600">CO₂ Tons Offset</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons - Role-based */}
          {userRole && userRole !== ROLES.VERIFIER && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-2xl hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <DocumentTextIcon className="w-6 h-6 mr-3" />
                Upload Document
              </button>

              <button
                onClick={generateDemoProject}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-2xl hover:from-purple-600 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <BeakerIcon className="w-6 h-6 mr-3" />
                Generate Demo Document
              </button>

              {demoCredits.length > 0 && (
                <button
                  onClick={() => onNavigate('portfolio')}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-2xl hover:from-amber-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <ArrowRightIcon className="w-6 h-6 mr-3" />
                  View My Documents
                </button>
              )}
            </motion.div>
          )}

          {/* Verifier Redirect Message */}
          {userRole === ROLES.VERIFIER && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex justify-center mb-12"
            >
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8 max-w-2xl text-center shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheckIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-indigo-900 mb-3">
                  Verifier Access Detected
                </h3>
                <p className="text-indigo-700 mb-4">
                  As a verifier, you have access to the Verifier Dashboard where you can review,
                  attest, and mint carbon credits from uploaded documents.
                </p>
                <p className="text-sm text-indigo-600 mb-6">
                  Redirecting you to the Verifier Dashboard...
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <ClockIcon className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-indigo-600 font-medium">Please wait...</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Project Templates Grid - Only for non-verifiers */}
          {!showCreateForm && userRole && userRole !== ROLES.VERIFIER && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-12"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                Choose Your Project Type
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROJECT_TEMPLATES.map((template, index) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    onClick={() => handleTemplateSelect(template)}
                    className="group cursor-pointer"
                  >
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                      <div className={`w-16 h-16 bg-gradient-to-r ${template.color} rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4 group-hover:scale-110 transition-transform duration-200`}>
                        {template.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {template.name}
                      </h3>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{template.defaultCredits} credits</span>
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Create Project Form */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden"
              >
                {/* Form Header */}
                <div className="bg-gradient-to-r from-green-500 to-blue-600 px-8 py-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {selectedTemplate && (
                        <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl`}>
                          {selectedTemplate.icon}
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          Upload Project Document
                        </h2>
                        <p className="text-white/80">
                          Submit your project documentation for verification
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors duration-200"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column */}
                    <div className="space-y-6">

                      {/* Project Name */}
                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          Project Name *
                        </label>
                        <input
                          type="text"
                          value={formData.projectName}
                          onChange={(e) => handleInputChange('projectName', e.target.value)}
                          placeholder="Enter your project name"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                      </div>

                      {/* Project Type */}
                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <TagIcon className="w-4 h-4 mr-2" />
                          Project Type *
                        </label>
                        <select
                          value={formData.projectType}
                          onChange={(e) => handleInputChange('projectType', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          required
                        >
                          <option value="">Select project type</option>
                          {PROJECT_TEMPLATES.map(template => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Location */}
                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <MapPinIcon className="w-4 h-4 mr-2" />
                          Location *
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => handleInputChange('location', e.target.value)}
                          placeholder="Enter project location"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                      </div>

                      {/* Date Range */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            Start Date *
                          </label>
                          <input
                            type="date"
                            value={formData.startDate}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            End Date *
                          </label>
                          <input
                            type="date"
                            value={formData.endDate}
                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                            required
                          />
                        </div>
                      </div>

                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">

                      {/* Description */}
                      <div>
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                          <DocumentTextIcon className="w-4 h-4 mr-2" />
                          Description *
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="Describe your project's environmental impact..."
                          rows="4"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 resize-none"
                          required
                        />
                      </div>

                      {/* Estimated Credits - For Non-Verifiers (read-only display) */}
                      {userRole !== ROLES.VERIFIER && (
                        <div>
                          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                            <ChartBarIcon className="w-4 h-4 mr-2" />
                            Estimated Credits
                          </label>
                          <div className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-600">
                            {formData.credits || 'To be determined by verifier'}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Credit amount will be determined during the verification process
                          </p>
                        </div>
                      )}

                      {/* Verification Standards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                            <ShieldCheckIcon className="w-4 h-4 mr-2" />
                            Methodology
                          </label>
                          <select
                            value={formData.methodology}
                            onChange={(e) => handleInputChange('methodology', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="">Select methodology</option>
                            <option value="VCS (Verified Carbon Standard)">VCS (Verified Carbon Standard)</option>
                            <option value="CDM (Clean Development Mechanism)">CDM (Clean Development Mechanism)</option>
                            <option value="CAR (Climate Action Reserve)">CAR (Climate Action Reserve)</option>
                            <option value="ACR (American Carbon Registry)">ACR (American Carbon Registry)</option>
                          </select>
                        </div>
                        <div>
                          <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Verification Standard
                          </label>
                          <select
                            value={formData.verificationStandard}
                            onChange={(e) => handleInputChange('verificationStandard', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          >
                            <option value="">Select standard</option>
                            <option value="Gold Standard">Gold Standard</option>
                            <option value="Plan Vivo">Plan Vivo</option>
                            <option value="Social Carbon">Social Carbon</option>
                            <option value="CCBA Standards">CCBA Standards</option>
                          </select>
                        </div>
                      </div>



                      {/* Document Submission Summary - For Non-Verifiers */}
                      {userRole !== ROLES.VERIFIER && formData.projectName && formData.description && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">Document Status:</span>
                            <span className="text-lg font-semibold text-blue-600">Ready for Submission</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Your project documentation will be submitted for verification by authorized verifiers.</p>
                            <p className="mt-1 font-medium text-blue-700">Next step: Verifier review and attestation</p>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-8 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                    >
                      {isSubmitting ? (
                        <>
                          <ClockIcon className="w-5 h-5 mr-2 animate-spin" />
                          Uploading Document...
                        </>
                      ) : (
                        <>
                          <DocumentTextIcon className="w-5 h-5 mr-2" />
                          Submit for Verification
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recent Projects */}
          {demoCredits.length > 0 && !showCreateForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-16"
            >
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                {userRole === ROLES.VERIFIER ? 'Recent Minted Credits' : 'Your Submitted Documents'}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {demoCredits.slice(0, 6).map((credit, index) => (
                  <motion.div
                    key={credit.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-shadow duration-300"
                  >
                    <div className="flex items-center space-x-3 mb-4">
                      {credit.template && (
                        <div className={`w-10 h-10 bg-gradient-to-r ${credit.template.color} rounded-xl flex items-center justify-center text-sm`}>
                          {credit.template.icon}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">
                          {credit.projectName}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {credit.location}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {userRole === ROLES.VERIFIER ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Credits Minted:</span>
                            <span className="font-semibold">{credit.credits.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Value:</span>
                            <span className="font-semibold">${(credit.credits * (credit.pricePerCredit || 25)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Token ID:</span>
                            <span className="font-mono text-xs">{credit.tokenId}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-semibold">{credit.status === 'pending_verification' ? 'Pending Verification' : 'Verified'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Submitted By:</span>
                            <span className="font-semibold">{getRoleDisplayName(credit.submitterRole || userRole)}</span>
                          </div>
                          {credit.credits && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Est. Credits:</span>
                              <span className="font-semibold">{credit.credits.toLocaleString()}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      {userRole === ROLES.VERIFIER ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          Minted
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${credit.status === 'pending_verification'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                          }`}>
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {credit.status === 'pending_verification' ? 'Pending Review' : 'Verified'}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(credit.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
