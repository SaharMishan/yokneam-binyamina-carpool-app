
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { auth as authService } from '../../services/firebase';
import { Mail, Lock, Check, Loader2 } from 'lucide-react';

interface LoginViewProps {
    onSwitchToRegister: () => void;
    onSwitchToForgotPassword: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onSwitchToRegister, onSwitchToForgotPassword }) => {
    const { t } = useLocalization();
    const { signInWithEmail, signInWithGoogle, firebaseUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true); 
    const [error, setError] = useState<string | null>(null);
    const [isEmailSubmitting, setIsEmailSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const isMounted = React.useRef(true);

    React.useEffect(() => {
        return () => { isMounted.current = false; };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        
        const cleanEmail = email.trim().toLowerCase();
        
        if (!cleanEmail || !password) {
            setError(t('error_login_required'));
            return;
        }

        setIsEmailSubmitting(true);
        try {
            console.log("🚀 LoginView: Email login attempt for:", cleanEmail);
            await authService.setPersistence(rememberMe ? 'local' : 'session');
            await signInWithEmail(cleanEmail, password);
            console.log("🚀 LoginView: Email login call finished");
            
            // If we are still here after 2 seconds, reset submitting state
            setTimeout(() => {
                if (isMounted.current && !firebaseUser) {
                    setIsEmailSubmitting(false);
                }
            }, 2000);
        } catch (err: any) {
            setIsEmailSubmitting(false);
            console.error("🚀 LoginView: Email login error:", err.code, err.message);
            
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(t('error_invalid_credentials'));
            } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('403')) {
                setError(`שגיאת אבטחה (403): הדומיין ${window.location.hostname} אינו מורשה ב-Firebase Console.`);
            } else if (err.code === 'auth/too-many-requests') {
                setError(t('error_too_many_requests'));
            } else {
                setError(t('error_generic') + ` (${err.code})`);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setError(null);
        setIsGoogleSubmitting(true);
        try {
            console.log("🚀 LoginView: Google login attempt started");
            await signInWithGoogle();
            setTimeout(() => {
                if (isMounted.current && !firebaseUser) {
                    setIsGoogleSubmitting(false);
                }
            }, 2000);
        } catch (err: any) {
            setIsGoogleSubmitting(false);
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error("🚀 LoginView: Google login error:", err.code);
                if (err.code === 'auth/account-exists-with-different-credential' || err.code === 'auth/email-already-in-use') {
                    setError(t('error_account_collision'));
                    return;
                }
                setError(t('error_generic') + ` (${err.code})`);
            }
        }
    };

    return (
        <div className="flex flex-col h-full max-w-md mx-auto px-4 py-8">
            <div className="text-center mb-10">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">קארפול יקנעם-בנימינה</h1>
                <p className="text-slate-500 dark:text-slate-400 font-medium">התחברו לקהילת הקארפול שלנו</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="text-red-600 dark:text-red-400 mt-0.5">
                        <Mail className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300 leading-relaxed">{error}</p>
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
                            className="text-start w-full ps-12 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-base text-slate-900 dark:text-white" 
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
                            className="text-start w-full ps-12 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-base text-slate-900 dark:text-white" 
                            placeholder={t('password')} 
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                        <input 
                            type="checkbox" 
                            checked={rememberMe} 
                            onChange={(e) => setRememberMe(e.target.checked)} 
                            className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${rememberMe ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-300'}`}>
                            {rememberMe && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{t('remember_me')}</span>
                    </label>
                    <button type="button" onClick={onSwitchToForgotPassword} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">{t('forgot_password')}</button>
                </div>

                <button type="submit" disabled={isEmailSubmitting || isGoogleSubmitting} className="w-full h-14 flex items-center justify-center gap-3 text-white font-black bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-xl transition-all text-base disabled:opacity-80">
                    {isEmailSubmitting ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <span>{t('sign_in')}</span>
                    )}
                </button>
            </form>
            
            <div className="mt-8 flex flex-col gap-3">
                <div className="relative flex items-center justify-center mb-2">
                    <div className="absolute inset-x-0 h-px bg-slate-200 dark:bg-slate-700"></div>
                    <span className="relative bg-white dark:bg-slate-900 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('or_continue_with')}</span>
                </div>

                <button onClick={handleGoogleLogin} disabled={isEmailSubmitting || isGoogleSubmitting} className="w-full h-14 flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 transition-all text-slate-700 dark:text-slate-200 font-black text-sm shadow-sm disabled:opacity-70">
                    {isGoogleSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    ) : (
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5"/>
                    )}
                    <span>{t('login_with_google')}</span>
                </button>
            </div>
            
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-8">
                {t('dont_have_account')}{' '}
                <button onClick={onSwitchToRegister} className="font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4">{t('sign_up')}</button>
            </p>

            <div className="mt-auto pt-10 text-center opacity-40">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">© All Rights Reserved to Sahar Mishan</p>
            </div>
        </div>
    );
};

export default LoginView;
