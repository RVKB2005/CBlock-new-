import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/auth.js';
import AccessDenied from './AccessDenied.jsx';

const AdminRoute = ({ children }) => {
    const isAuthenticated = authService.isUserAuthenticated();
    const isAdmin = authService.isAdmin();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <AccessDenied message="Admin access required" />;
    }

    return children;
};

export default AdminRoute;