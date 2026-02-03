
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { auth as authService } from '../../services/firebase';
import { Mail, Lock, CarFront, AlertCircle, Check } from 'lucide-react';

interface LoginViewProps {
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
    const { t, dir, language } = useLocalization();
    const { signInWithEmail, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false); 
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email || !password) {
            setError(t('error_missing_fields'));
            return;
        }
        setIsSubmitting(true);
        try {
            await authService.setPersistence(rememberMe ? 'local' : 'none');
            await signInWithEmail(email, password);
        } catch (err: any) {
            setIsSubmitting(false);
            const errorCode = err.code;
            if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-email') {
                setError(t('error_user_not_found'));
            } else if (errorCode === 'auth/wrong-password') {
                setError(language === 'he' ? 'סיסמה שגויה. נסה שוב.' : 'Incorrect password. Try again.');
            } else {
                setError(t('error_generic'));
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsSubmitting(true);
        try {
            await authService.setPersistence(rememberMe ? 'local' : 'none');
            await signInWithGoogle();
        } catch (err: any) {
            setIsSubmitting(false);
            console.error("Google login error:", err);
            
            if (err.code === 'auth/popup-blocked') {
                setError(language === 'he' ? 'החלון הקופץ נחסם על ידי הדפדפן. אנא אפשר פופ-אפים לאתר זה.' : 'Popup blocked by browser. Please allow popups for this site.');
            } else if (err.code === 'auth/unauthorized-domain') {
                setError(language === 'he' ? 'דומיין זה אינו מורשה להתחברות גוגל. בדוק הגדרות Firebase.' : 'Unauthorized domain. Check Firebase configuration.');
            } else if (err.code === 'auth/operation-not-allowed') {
                setError(language === 'he' ? 'ספק גוגל אינו מופעל ב-Firebase Console.' : 'Google provider not enabled in Firebase Console.');
            } else if (err.code === 'auth/popup-closed-by-user') {
                // User closed popup, don't show scary error
                return;
            } else {
                setError(t('error_generic'));
            }
        }
    };

    return (
        <div className="animate-fade-in w-full max-w-sm mx-auto flex flex-col min-h-[500px]">
            <div className="flex flex-col items-center mb-10">
                <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
                    <CarFront size={32} className="text-white" />
                </div>
                
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white text-center tracking-tight mb-2">
                    {t('app_title')}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm font-medium px-4">
                    {t('login_subtitle')}
                </p>
            </div>

            {error && (
                <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-600 dark:text-red-300">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-3">
                    <div className="relative group">
                        <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                            <Mail className="w-5 h-5" />
                        </div>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400 ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600'}`} placeholder={t('email_address')} />
                    </div>

                    <div className="relative group">
                         <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                            <Lock className="w-5 h-5" />
                        </div>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400 ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-600'}`} placeholder={t('password')} />
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

                <button type="submit" disabled={isSubmitting} className="w-full h-12 flex items-center justify-center text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all text-base disabled:opacity-80">
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>{t('sign_in')}</span>}
                </button>
            </form>
            
            <div className="mt-8 flex flex-col gap-5">
                <div className="relative flex items-center justify-center">
                    <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-700"></div>
                    <span className="relative bg-white dark:bg-slate-900 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('or_continue_with')}</span>
                </div>

                <button onClick={handleGoogleLogin} disabled={isSubmitting} className="w-full h-12 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all text-slate-700 dark:text-slate-200 font-bold text-sm">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>
                    <span>{t('login_with_google')}</span>
                </button>
            </div>
            
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-8">
                {t('dont_have_account')}{' '}
                <button onClick={onSwitchToRegister} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4">{t('sign_up')}</button>
            </p>

            <div className="mt-auto pt-10 text-center opacity-40">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© All Rights Reserved to Sahar Mishan</p>
            </div>
        </div>
    );
};

export default LoginView;
