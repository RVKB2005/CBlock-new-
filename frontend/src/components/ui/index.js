import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Info, 
  Loader2, 
  Wallet,
  Upload,
  FileText,
  Coins,
  ShoppingCart,
  Recycle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

// Button Component
export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  disabled = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props 
}) => {
  const baseClass = `btn btn-${variant} btn-${size}`;
  const classes = `${baseClass} ${className}`;
  
  return (
    <motion.button
      whileHover={!disabled && !loading ? { scale: 1.02 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.98 } : {}}
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="spinner" size={16} />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </motion.button>
  );
};

// Card Component
export const Card = ({ children, className = '', hover = true, ...props }) => {
  const classes = `card ${className}`;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={hover ? { y: -4 } : {}}
      className={classes}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '' }) => (
  <div className={`card-header ${className}`}>{children}</div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={`card-body ${className}`}>{children}</div>
);

export const CardFooter = ({ children, className = '' }) => (
  <div className={`card-footer ${className}`}>{children}</div>
);

// Input Component
export const Input = ({ 
  label, 
  error, 
  icon,
  className = '',
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="relative">
        <input 
          className={`form-input ${error ? 'border-error' : ''} ${className}`}
          {...props}
        />
        {icon && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

// Textarea Component
export const Textarea = ({ 
  label, 
  error, 
  className = '',
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <textarea 
        className={`form-textarea ${error ? 'border-error' : ''} ${className}`}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
    </div>
  );
};

// File Upload Component
export const FileUpload = ({ 
  onFileSelect, 
  accept = "*",
  multiple = false,
  className = '',
  children
}) => {
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  return (
    <div className={`file-input-container w-full ${className}`}>
      <input
        type="file"
        className="file-input"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
      />
      <div
        className={`file-input-label ${selectedFile ? 'has-file' : ''} ${dragActive ? 'border-primary bg-primary/5' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <>
            <FileText size={24} />
            <span>{selectedFile.name}</span>
            <span className="text-sm text-gray-500">Click to change file</span>
          </>
        ) : (
          children || (
            <>
              <Upload size={24} />
              <span>Click to upload or drag and drop</span>
              <span className="text-sm text-gray-500">Max file size: 10MB</span>
            </>
          )
        )}
      </div>
    </div>
  );
};

// Alert Component
export const Alert = ({ 
  type = 'info', 
  children, 
  onClose,
  className = ''
}) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <XCircle size={20} />,
    warning: <AlertCircle size={20} />,
    info: <Info size={20} />
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-start gap-3 p-4 rounded-lg border ${className}`}
      style={{
        backgroundColor: type === 'success' ? '#f0fdf4' : 
                        type === 'error' ? '#fef2f2' :
                        type === 'warning' ? '#fffbeb' : '#f0f9ff',
        borderColor: type === 'success' ? '#22c55e' : 
                     type === 'error' ? '#ef4444' :
                     type === 'warning' ? '#f59e0b' : '#3b82f6',
        color: type === 'success' ? '#166534' : 
               type === 'error' ? '#991b1b' :
               type === 'warning' ? '#92400e' : '#1e40af'
      }}
    >
      {icons[type]}
      <div className="flex-1">{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-current opacity-70 hover:opacity-100">
          <XCircle size={16} />
        </button>
      )}
    </motion.div>
  );
};

// Badge Component
export const Badge = ({ 
  children, 
  variant = 'default',
  size = 'md',
  className = ''
}) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'status-success',
    error: 'status-error',
    warning: 'status-warning',
    info: 'status-info',
    primary: 'bg-primary/10 text-primary'
  };
  
  return (
    <span className={`status-badge ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Progress Steps Component
export const ProgressSteps = ({ steps, currentStep, className = '' }) => {
  return (
    <div className={`progress-steps ${className}`}>
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isActive = stepNumber === currentStep;
        const isCompleted = stepNumber < currentStep;
        
        return (
          <div 
            key={index}
            className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
          >
            <div className="progress-step-circle">
              {isCompleted ? <Check size={16} /> : stepNumber}
            </div>
            <div className="progress-step-label">
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Loading Component
export const Loading = ({ size = 'md', text = 'Loading...' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className={`spinner ${sizes[size]}`} />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  );
};

// Copy to Clipboard Component
export const CopyButton = ({ text, className = '' }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`btn btn-sm btn-secondary ${className}`}
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

// External Link Component
export const ExternalLinkButton = ({ href, children, className = '' }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`btn btn-secondary btn-sm ${className}`}
  >
    {children}
    <ExternalLink size={14} />
  </a>
);

// Wallet Address Display
export const WalletAddress = ({ address, showFull = false }) => {
  const displayAddress = showFull ? address : `${address?.slice(0, 6)}...${address?.slice(-4)}`;
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
      <Wallet size={16} className="text-primary" />
      <code className="text-sm">{displayAddress}</code>
      <CopyButton text={address} />
    </div>
  );
};

// Token Balance Display
export const TokenBalance = ({ balance, symbol = '', className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Coins size={20} className="text-primary" />
    <span className="font-semibold text-lg">{balance}</span>
    {symbol && <span className="text-gray-500">{symbol}</span>}
  </div>
);

// Transaction Hash Display
export const TransactionHash = ({ hash, explorerUrl }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
    <code className="text-sm font-mono">{`${hash.slice(0, 10)}...${hash.slice(-8)}`}</code>
    <CopyButton text={hash} />
    {explorerUrl && (
      <ExternalLinkButton href={`${explorerUrl}/tx/${hash}`}>
        View
      </ExternalLinkButton>
    )}
  </div>
);

// Navigation Icons
export const NavIcons = {
  Wallet,
  Upload,
  FileText,
  Coins,
  ShoppingCart,
  Recycle,
  CheckCircle,
  AlertCircle,
  XCircle,
  Info
};

export default {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Input,
  Textarea,
  FileUpload,
  Alert,
  Badge,
  ProgressSteps,
  Loading,
  CopyButton,
  ExternalLinkButton,
  WalletAddress,
  TokenBalance,
  TransactionHash,
  NavIcons
};
