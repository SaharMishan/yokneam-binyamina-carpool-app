
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { auth as authService } from '../../services/firebase';
import { Mail, Lock, CarFront, AlertCircle, Check, Info, HelpCircle, Loader2 } from 'lucide-react';

interface LoginViewProps {
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
    const { t, language } = useLocalization();
    const { signInWithEmail, signInWithGoogle, signInWithApple } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true); 
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const cleanEmail = email.trim().toLowerCase();
        
        if (!cleanEmail || !password) {
            setError(t('error_login_required'));
            return;
        }

        setIsSubmitting(true);
        try {
            await authService.setPersistence(rememberMe ? 'local' : 'session');
            await signInWithEmail(cleanEmail, password);
        } catch (err: any) {
            setIsSubmitting(false);
            console.error("Login attempt failed error code:", err.code);
            
            // Firebase returns auth/invalid-credential if:
            // 1. Password is wrong
            // 2. Email not found
            // 3. Account exists via Google but has no password set yet
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(t('error_invalid_credentials'));
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('error_too_many_requests'));
            } else if (err.code === 'auth/invalid-email') {
                setError(t('error_invalid_email'));
            } else {
                setError(t('error_generic') + ` (${err.code})`);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await authService.setPersistence(rememberMe ? 'local' : 'session');
            await signInWithGoogle();
        } catch (err: any) {
            setIsSubmitting(false);
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error("Google login error:", err.code);
                
                // Specific handling for account collision
                if (err.code === 'auth/account-exists-with-different-credential' || err.code === 'auth/email-already-in-use') {
                    setError(t('error_account_collision'));
                    return;
                }

                // Specific handling for iOS PWA issues
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
                
                if (isIOS && isPWA) {
                    setError(t('error_ios_pwa_google'));
                } else {
                    setError(t('error_generic') + ` (${err.code})`);
                }
            }
        }
    };

    const handleAppleLogin = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await authService.setPersistence(rememberMe ? 'local' : 'session');
            await signInWithApple();
        } catch (err: any) {
            setIsSubmitting(false);
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error("Apple login error:", err.code);
                setError(t('error_generic') + ` (${err.code})`);
            }
        }
    };

    const isIOSPWA = typeof window !== 'undefined' && 
                     /iPhone|iPad|iPod/i.test(navigator.userAgent) && 
                     (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone);

    return (
        <div className="animate-fade-in w-full max-w-sm mx-auto flex flex-col min-h-[450px]">
            <div className="flex flex-col items-center mb-8">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6 group hover:scale-105 transition-transform overflow-hidden border border-slate-100 dark:border-slate-700">
                    <img src="/logo.svg" alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center tracking-tight mb-2">
                    {t('app_title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium px-4">
                    {t('login_subtitle')}
                </p>
            </div>

            {isIOSPWA && (
                <div className="mb-6 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 flex flex-col gap-2 animate-slide-up">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-indigo-800 dark:text-indigo-300 leading-relaxed">
                            {t('error_ios_pwa_google_hint')}
                        </p>
                    </div>
                    <button 
                        onClick={onSwitchToForgotPassword}
                        className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 underline text-start ps-8"
                    >
                        {t('error_set_password_hint')}
                    </button>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex flex-col gap-3 animate-slide-up shadow-sm">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-red-700 dark:text-red-300 leading-relaxed">{error}</p>
                    </div>
                    {error.includes('Google') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-red-100 dark:border-red-800/50 mt-1">
                            <HelpCircle size={12} className="text-red-500" />
                            <button 
                                onClick={onSwitchToForgotPassword}
                                className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider hover:underline"
                            >
                                לחץ כאן להגדרת סיסמה ראשונה
                            </button>
                        </div>
                    )}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                    <div className="relative group">
                        <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                            <Mail className="w-5 h-5" />
                        </div>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            className={`text-start w-full ps-12 p-4 bg-white dark:bg-slate-800 border rounded-xl transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400 ${error ? 'border-red-300 ring-4 ring-red-50 dark:ring-red-900/10' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/10'}`} 
                            placeholder={t('email_address')} 
                        />
                    </div>

                    <div className="relative group">
                         <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                            <Lock className="w-5 h-5" />
                        </div>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            className={`text-start w-full ps-12 p-4 bg-white dark:bg-slate-800 border rounded-xl transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400 ${error ? 'border-red-300 ring-4 ring-red-50 dark:ring-red-900/10' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 dark:focus:ring-indigo-900/10'}`} 
                            placeholder={t('password')} 
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <div className="relative">
                            <input 
                                type="checkbox" 
                                checked={rememberMe} 
                                onChange={(e) => setRememberMe(e.target.checked)} 
                                className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600 shadow-sm shadow-indigo-600/20' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 group-hover:border-indigo-400'}`}>
                                {rememberMe && <Check size={14} className="text-white" />}
                            </div>
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 transition-colors">{t('remember_me')}</span>
                    </label>
                    <button type="button" onClick={onSwitchToForgotPassword} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">{t('forgot_password')}</button>
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full h-14 flex items-center justify-center gap-3 text-white font-black bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all text-base disabled:opacity-80">
                    {isSubmitting ? (
                        <div className="flex items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>{t('sign_in')}</span>
                        </div>
                    ) : (
                        <span>{t('sign_in')}</span>
                    )}
                </button>
            </form>
            
            <div className="mt-8 flex flex-col gap-4">
                <div className="relative flex items-center justify-center mb-1">
                    <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-700"></div>
                    <span className="relative bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('or_continue_with')}</span>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={handleGoogleLogin} 
                        disabled={isSubmitting} 
                        className="w-full h-14 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-slate-700 dark:text-slate-200 font-black text-sm shadow-sm active:scale-[0.98] animate-slide-up"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>
                        <span>{t('login_with_google')}</span>
                    </button>

                    <button 
                        onClick={handleAppleLogin} 
                        disabled={isSubmitting} 
                        className="w-full h-14 flex items-center justify-center gap-3 bg-black text-white border border-black rounded-xl hover:bg-slate-900 transition-all font-black text-sm shadow-sm active:scale-[0.98] animate-slide-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 384 512">
                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                        </svg>
                        <span>{t('login_with_apple')}</span>
                    </button>
                </div>
            </div>
            
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-8">
                {t('dont_have_account')}{' '}
                <button onClick={onSwitchToRegister} className="font-black text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4">{t('sign_up')}</button>
            </p>

            <div className="mt-auto pt-10 text-center opacity-40">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© All Rights Reserved to Sahar Mishan</p>
            </div>
        </div>
    );
};

export default LoginView;
