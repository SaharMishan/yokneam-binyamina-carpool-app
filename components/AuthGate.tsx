
import React from 'react';
import { useAuth } from '../context/AuthContext';
import AuthPage from './auth/AuthPage';

const AuthGate = () => {
    const { firebaseUser } = useAuth();
    console.log("🚀 AuthGate: firebaseUser present:", !!firebaseUser);
    
    // If we have a firebaseUser but the profile (user) is still null, 
    // it means we are authenticated but the profile is still syncing.
    // In this case, we should NOT show the login page.
    if (firebaseUser) {
        return null; // Let App.tsx handle the authenticated state
    }
    
    return <AuthPage />;
};

export default AuthGate;
