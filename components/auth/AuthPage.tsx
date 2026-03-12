
import React, { useState } from 'react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import HeroSection from './HeroSection';
import { useLocalization } from '../../context/LocalizationContext';
import { Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type AuthView = 'login' | 'register' | 'forgot-password';

const AuthPage: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');
    const { dir } = useLocalization();

    const renderView = () => {
        switch (view) {
            case 'register':
                return <RegisterView onSwitchToLogin={() => setView('login')} />;
            case 'forgot-password':
                return <ForgotPasswordView onSwitchToLogin={() => setView('login')} />;
            case 'login':
            default:
                return <LoginView onSwitchToRegister={() => setView('register')} onSwitchToForgotPassword={() => setView('forgot-password')} />;
        }
    };

    const formSection = (
        <div className="relative flex flex-col justify-center items-center p-6 sm:p-12 h-[100dvh] overflow-hidden bg-white/80 dark:bg-slate-900/80 shadow-2xl z-20 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="w-full max-w-[400px] relative z-10">
                 <AnimatePresence mode="wait">
                    <motion.div 
                        key={view}
                        initial={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: dir === 'rtl' ? -20 : 20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        {renderView()}
                    </motion.div>
                 </AnimatePresence>
            </div>
        </div>
    );

    return (
        <div className="h-[100dvh] w-full relative overflow-hidden selection:bg-indigo-100 flex flex-col md:grid md:grid-cols-2">
            {dir === 'ltr' ? (
                <>
                    {formSection}
                    <div className="hidden md:block h-full relative z-10"><HeroSection /></div>
                </>
            ) : (
                <>
                    <div className="hidden md:block h-full relative z-10"><HeroSection /></div>
                    {formSection}
                </>
            )}
        </div>
    );
};

export default AuthPage;
