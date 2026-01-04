
import React from 'react';
import { useAuth } from '../context/AuthContext';
import AuthPage from './auth/AuthPage';

const AuthGate = () => {
    const { loading } = useAuth();
    
    if (loading) {
        return (
             <div className="flex items-center justify-center w-full h-[100dvh] relative z-20">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }
    
    return <AuthPage />;
};

export default AuthGate;
