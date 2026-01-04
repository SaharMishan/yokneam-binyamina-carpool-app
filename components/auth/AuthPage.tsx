
import React, { useState } from 'react';
import LoginView from './LoginView';
import RegisterView from './RegisterView';
import ForgotPasswordView from './ForgotPasswordView';
import HeroSection from './HeroSection';
import { useLocalization } from '../../context/LocalizationContext';
import { Globe } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot-password';

const AuthPage: React.FC = () => {
    const [view, setView] = useState<AuthView>('login');
    const { dir, toggleLanguage, language } = useLocalization();

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

    const LanguageToggle = () => (
        <button
            onClick={toggleLanguage}
            className="absolute top-6 end-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/30 backdrop-blur-xl border border-white/40 shadow-lg hover:bg-white/50 transition-all group active:scale-95"
        >
            <Globe size={18} className="text-slate-800 dark:text-white drop-shadow-sm group-hover:rotate-12 transition-transform duration-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white drop-shadow-sm">
                {language}
            </span>
        </button>
    );

    const formSection = (
        <div className="relative flex flex-col justify-center items-center p-6 sm:p-12 h-[100dvh] overflow-hidden bg-white/80 dark:bg-slate-900/80 shadow-2xl z-20 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <div className="w-full max-w-[400px] relative z-10 transition-all duration-300">
                 {/* Key added here to force animation when view switches */}
                 <div key={view} className="animate-fade-in">
                    {renderView()}
                 </div>
            </div>
        </div>
    );

    return (
        <div className="h-[100dvh] w-full relative overflow-hidden selection:bg-indigo-100 flex flex-col md:grid md:grid-cols-2">
            <LanguageToggle />
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
