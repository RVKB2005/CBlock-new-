import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import adminService, { AUDIT_LOG_TYPES } from '../services/admin.js';
import authService from '../services/auth.js';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [systemStats, setSystemStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [showBackupModal, setShowBackupModal] = useState(false);

    // Check admin access
    useEffect(() => {
        if (!adminService.isAdmin()) {
            setError('Access denied. Admin privileges required.');
            setLoading(false);
            return;
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersData, logsData, statsData] = await Promise.all([
                adminService.getAllUsers(),
                adminService.getAuditLogs(),
                adminService.getSystemStats()
            ]);

            setUsers(usersData);
            setAuditLogs(logsData);
            setSystemStats(statsData);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole, reason) => {
        try {
            await adminService.changeUserRole(userId, newRole, reason);
            await loadData(); // Refresh data
            setShowUserModal(false);
            setSelectedUser(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleCredentialsUpdate = async (userId, credentials) => {
        try {
            await adminService.assignVerifierCredentials(userId, credentials);
            await loadData(); // Refresh data
            setShowCredentialsModal(false);
            setSelectedUser(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleBackup = async () => {
        try {
            const backupData = await adminService.createBackup();
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cblock-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setShowBackupModal(false);
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-carbon-600"></div>
            </div>
        );
    }

    if (error && !adminService.isAdmin()) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-600 mt-2">Manage users, roles, and system settings</p>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-800">{error}</p>
                        <button
                            onClick={() => setError('')}
                            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* System Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Total Users</h3>
                        <p className="text-3xl font-bold text-carbon-600">{systemStats.totalUsers || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Active Verifiers</h3>
                        <p className="text-3xl font-bold text-green-600">{systemStats.activeVerifiers || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
                        <p className="text-3xl font-bold text-blue-600">{systemStats.totalAuditLogs || 0}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900">Credentials</h3>
                        <p className="text-3xl font-bold text-purple-600">{systemStats.credentialsManaged || 0}</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-white rounded-lg shadow mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="-mb-px flex space-x-8 px-6">
                            {[
                                { id: 'users', label: 'User Management' },
                                { id: 'audit', label: 'Audit Logs' },
                                { id: 'backup', label: 'Backup & Recovery' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id
                                            ? 'border-carbon-500 text-carbon-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'users' && (
                            <UsersTab
                                users={users}
                                onUserSelect={(user) => {
                                    setSelectedUser(user);
                                    setShowUserModal(true);
                                }}
                                onCredentialsManage={(user) => {
                                    setSelectedUser(user);
                                    setShowCredentialsModal(true);
                                }}
                            />
                        )}

                        {activeTab === 'audit' && (
                            <AuditLogsTab auditLogs={auditLogs} />
                        )}

                        {activeTab === 'backup' && (
                            <BackupTab onBackup={() => setShowBackupModal(true)} />
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UserManagementModal
                show={showUserModal}
                user={selectedUser}
                onClose={() => {
                    setShowUserModal(false);
                    setSelectedUser(null);
                }}
                onRoleChange={handleRoleChange}
            />

            <CredentialsModal
                show={showCredentialsModal}
                user={selectedUser}
                onClose={() => {
                    setShowCredentialsModal(false);
                    setSelectedUser(null);
                }}
                onUpdate={handleCredentialsUpdate}
            />

            <BackupModal
                show={showBackupModal}
                onClose={() => setShowBackupModal(false)}
                onBackup={handleBackup}
            />
        </div>
    );
};

// Users Tab Component
const UsersTab = ({ users, onUserSelect, onCredentialsManage }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.accountType === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                    />
                </div>
                <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                >
                    <option value="all">All Roles</option>
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                    <option value="verifier">Verifier</option>
                    <option value="admin">Admin</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Last Activity
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.accountType === 'admin' ? 'bg-red-100 text-red-800' :
                                            user.accountType === 'verifier' ? 'bg-blue-100 text-blue-800' :
                                                user.accountType === 'business' ? 'bg-green-100 text-green-800' :
                                                    'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.accountType}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                            user.status === 'pending_credentials' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(user.lastActivity).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => onUserSelect(user)}
                                        className="text-carbon-600 hover:text-carbon-900 mr-3"
                                    >
                                        Manage
                                    </button>
                                    {user.accountType === 'verifier' && (
                                        <button
                                            onClick={() => onCredentialsManage(user)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            Credentials
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Audit Logs Tab Component
const AuditLogsTab = ({ auditLogs }) => {
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');

    const filteredLogs = auditLogs.filter(log => {
        const matchesType = typeFilter === 'all' || log.type === typeFilter;

        let matchesDate = true;
        if (dateFilter !== 'all') {
            const logDate = new Date(log.timestamp);
            const now = new Date();
            const daysDiff = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));

            if (dateFilter === '7days' && daysDiff > 7) matchesDate = false;
            if (dateFilter === '30days' && daysDiff > 30) matchesDate = false;
        }

        return matchesType && matchesDate;
    });

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                >
                    <option value="all">All Types</option>
                    {Object.values(AUDIT_LOG_TYPES).map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                </select>
                <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                >
                    <option value="all">All Time</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                </select>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Timestamp
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Admin
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Details
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(log.timestamp).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                        {log.type.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {log.adminEmail}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {JSON.stringify(log.details, null, 2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Backup Tab Component
const BackupTab = ({ onBackup }) => {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Data Backup & Recovery</h3>
                <p className="text-gray-600 mb-6">
                    Create backups of user data, audit logs, and verifier credentials.
                    Backups are downloaded as JSON files that can be restored later.
                </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Backups include sensitive user data - store securely</li>
                    <li>• Regular backups are recommended before major changes</li>
                    <li>• Restore operations will overwrite existing data</li>
                </ul>
            </div>

            <div className="flex space-x-4">
                <button
                    onClick={onBackup}
                    className="bg-carbon-600 text-white px-6 py-2 rounded-lg hover:bg-carbon-700 transition-colors"
                >
                    Create Backup
                </button>
            </div>
        </div>
    );
};

// User Management Modal
const UserManagementModal = ({ show, user, onClose, onRoleChange }) => {
    const [newRole, setNewRole] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (user) {
            setNewRole(user.accountType);
            setReason('');
        }
    }, [user]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (newRole !== user.accountType) {
            onRoleChange(user.id, newRole, reason);
        } else {
            onClose();
        }
    };

    if (!show || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Manage User: {user.name}</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Current Role: {user.accountType}
                        </label>
                        <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                        >
                            <option value="individual">Individual</option>
                            <option value="business">Business</option>
                            <option value="verifier">Verifier</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    {newRole !== user.accountType && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Change
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Enter reason for role change..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                                rows="3"
                                required
                            />
                        </div>
                    )}

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            className="flex-1 bg-carbon-600 text-white py-2 px-4 rounded-md hover:bg-carbon-700 transition-colors"
                        >
                            {newRole !== user.accountType ? 'Update Role' : 'Close'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Credentials Modal
const CredentialsModal = ({ show, user, onClose, onUpdate }) => {
    const [credentials, setCredentials] = useState({
        certificationId: '',
        issuingAuthority: '',
        validUntil: ''
    });

    useEffect(() => {
        if (user?.verifierCredentials) {
            setCredentials({
                certificationId: user.verifierCredentials.certificationId || '',
                issuingAuthority: user.verifierCredentials.issuingAuthority || '',
                validUntil: user.verifierCredentials.validUntil ?
                    user.verifierCredentials.validUntil.split('T')[0] : ''
            });
        } else {
            setCredentials({
                certificationId: '',
                issuingAuthority: '',
                validUntil: ''
            });
        }
    }, [user]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(user.id, credentials);
    };

    if (!show || !user) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Manage Verifier Credentials: {user.name}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Certification ID
                        </label>
                        <input
                            type="text"
                            value={credentials.certificationId}
                            onChange={(e) => setCredentials({ ...credentials, certificationId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Issuing Authority
                        </label>
                        <input
                            type="text"
                            value={credentials.issuingAuthority}
                            onChange={(e) => setCredentials({ ...credentials, issuingAuthority: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Valid Until
                        </label>
                        <input
                            type="date"
                            value={credentials.validUntil}
                            onChange={(e) => setCredentials({ ...credentials, validUntil: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-carbon-500"
                            required
                        />
                    </div>

                    <div className="flex space-x-3">
                        <button
                            type="submit"
                            className="flex-1 bg-carbon-600 text-white py-2 px-4 rounded-md hover:bg-carbon-700 transition-colors"
                        >
                            Update Credentials
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Backup Modal
const BackupModal = ({ show, onClose, onBackup }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create Data Backup</h3>

                <div className="mb-6">
                    <p className="text-gray-600 mb-4">
                        This will create a backup file containing all user data, audit logs, and verifier credentials.
                    </p>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                            <strong>Warning:</strong> The backup file contains sensitive data. Store it securely.
                        </p>
                    </div>
                </div>

                <div className="flex space-x-3">
                    <button
                        onClick={onBackup}
                        className="flex-1 bg-carbon-600 text-white py-2 px-4 rounded-md hover:bg-carbon-700 transition-colors"
                    >
                        Create Backup
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;