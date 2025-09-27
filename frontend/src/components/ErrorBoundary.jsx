import React from 'react';
import { motion } from 'framer-motion';
import {
    ExclamationTriangleIcon,
    ArrowPathIcon,
    HomeIcon,
    ShieldCheckIcon,
    UserIcon,
    BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import authService from '../services/auth.js';
import errorHandler from '../services/errorHandler.js';

/**
 * Error Boundary Component for Role-Based Error Handling
 * Catches JavaScript errors anywhere in the child component tree and displays role-appropriate fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: 0
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error with context
        const currentUser = authService.getCurrentUser();
        const userRole = currentUser?.accountType || 'guest';

        const context = {
            component: this.props.componentName || 'Unknown',
            userRole,
            errorBoundary: true,
            props: this.props.context || {},
            componentStack: errorInfo.componentStack
        };

        // Use error handler service to log and process the error
        errorHandler.handleError(error, context, {
            showToast: false, // Don't show toast for boundary errors
            logError: true
        });

        this.setState({
            error,
            errorInfo,
            hasError: true
        });
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1
        }));
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const currentUser = authService.getCurrentUser();
            const userRole = currentUser?.accountType || 'guest';

            return (
                <ErrorFallback
                    error={this.state.error}
                    errorInfo={this.state.errorInfo}
                    userRole={userRole}
                    componentName={this.props.componentName}
                    onRetry={this.handleRetry}
                    onGoHome={this.handleGoHome}
                    retryCount={this.state.retryCount}
                    maxRetries={this.props.maxRetries || 3}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * Error Fallback Component with Role-Specific UI
 */
function ErrorFallback({
    error,
    errorInfo,
    userRole,
    componentName,
    onRetry,
    onGoHome,
    retryCount,
    maxRetries
}) {
    const getRoleIcon = (role) => {
        const icons = {
            verifier: ShieldCheckIcon,
            business: BuildingOfficeIcon,
            individual: UserIcon,
            guest: UserIcon
        };
        return icons[role] || UserIcon;
    };

    const getRoleSpecificMessage = (role, componentName) => {
        const messages = {
            verifier: {
                title: 'Verifier Dashboard Error',
                description: 'There was an issue with the verifier interface. This may affect document review and attestation functions.',
                suggestions: [
                    'Try refreshing the page to reload the verifier dashboard',
                    'Check if your wallet is properly connected',
                    'Ensure you have the necessary verifier permissions',
                    'Contact system administrator if the issue persists'
                ]
            },
            business: {
                title: 'Business Account Error',
                description: 'There was an issue with the business user interface. This may affect document uploads and project management.',
                suggestions: [
                    'Try refreshing the page to reload your business dashboard',
                    'Check your internet connection',
                    'Ensure your business account is properly configured',
                    'Try uploading documents again after refresh'
                ]
            },
            individual: {
                title: 'Individual Account Error',
                description: 'There was an issue with the individual user interface. This may affect document uploads and credit tracking.',
                suggestions: [
                    'Try refreshing the page to reload your dashboard',
                    'Check your internet connection',
                    'Ensure your account is properly set up',
                    'Try uploading documents again after refresh'
                ]
            },
            guest: {
                title: 'Application Error',
                description: 'There was an issue loading the application. Please try logging in or creating an account.',
                suggestions: [
                    'Try refreshing the page',
                    'Create an account or log in to access full features',
                    'Check your internet connection',
                    'Contact support if the issue continues'
                ]
            }
        };

        return messages[role] || messages.guest;
    };

    const roleMessage = getRoleSpecificMessage(userRole, componentName);
    const RoleIcon = getRoleIcon(userRole);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-red-200 overflow-hidden"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-orange-500 px-8 py-6">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-white">
                                {roleMessage.title}
                            </h1>
                            <div className="flex items-center space-x-2 mt-1">
                                <RoleIcon className="w-4 h-4 text-white/80" />
                                <span className="text-white/80 text-sm capitalize">
                                    {userRole} Account
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    <div className="space-y-6">
                        {/* Description */}
                        <div>
                            <p className="text-gray-700 leading-relaxed">
                                {roleMessage.description}
                            </p>
                        </div>

                        {/* Error Details (Collapsible) */}
                        <details className="bg-gray-50 rounded-lg border border-gray-200">
                            <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                                Technical Details (Click to expand)
                            </summary>
                            <div className="px-4 py-3 border-t border-gray-200 space-y-2">
                                <div>
                                    <span className="text-xs font-medium text-gray-500">Component:</span>
                                    <code className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                                        {componentName || 'Unknown'}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500">Error:</span>
                                    <code className="ml-2 text-xs bg-red-50 px-2 py-1 rounded font-mono text-red-700">
                                        {error?.message || 'Unknown error'}
                                    </code>
                                </div>
                                <div>
                                    <span className="text-xs font-medium text-gray-500">Retry Count:</span>
                                    <span className="ml-2 text-xs text-gray-600">
                                        {retryCount} / {maxRetries}
                                    </span>
                                </div>
                            </div>
                        </details>

                        {/* Suggestions */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                What you can try:
                            </h3>
                            <ul className="space-y-2">
                                {roleMessage.suggestions.map((suggestion, index) => (
                                    <li key={index} className="flex items-start space-x-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-medium text-blue-600">
                                                {index + 1}
                                            </span>
                                        </div>
                                        <span className="text-gray-700 text-sm">
                                            {suggestion}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                            {retryCount < maxRetries && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={onRetry}
                                    className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg"
                                >
                                    <ArrowPathIcon className="w-5 h-5" />
                                    <span>Try Again</span>
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onGoHome}
                                className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-200 shadow-lg"
                            >
                                <HomeIcon className="w-5 h-5" />
                                <span>Go to Home</span>
                            </motion.button>
                        </div>

                        {/* Additional Help */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <div className="w-5 h-5 text-blue-600 mt-0.5">
                                    ℹ️
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-blue-900 mb-1">
                                        Need more help?
                                    </p>
                                    <p className="text-blue-700">
                                        If this error continues to occur, please take a screenshot and contact our support team.
                                        Include your account type ({userRole}) and what you were trying to do when the error occurred.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * Higher-Order Component to wrap components with error boundary
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {string} componentName - Name of the component for error reporting
 * @param {Object} options - Additional options
 * @returns {React.Component} Wrapped component with error boundary
 */
export function withErrorBoundary(WrappedComponent, componentName, options = {}) {
    const WithErrorBoundaryComponent = (props) => (
        <ErrorBoundary
            componentName={componentName}
            context={props}
            {...options}
        >
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    WithErrorBoundaryComponent.displayName = `withErrorBoundary(${componentName})`;
    return WithErrorBoundaryComponent;
}

export default ErrorBoundary;