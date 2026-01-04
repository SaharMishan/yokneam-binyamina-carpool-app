
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { User, Phone, Mail, Lock, AlertCircle, Globe } from 'lucide-react';

interface RegisterViewProps {
    onSwitchToLogin: () => void;
}

const RegisterView: React.FC<RegisterViewProps> = ({ onSwitchToLogin }) => {
    const { t, dir } = useLocalization();
    const { registerWithEmail } = useAuth();
    const [name, setName] = useState('');
    const [nameEn, setNameEn] = useState(''); // State for English Name
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = () => {
        if (!name || !phone || !email || !password) {
            setError(t('error_missing_fields'));
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError(t('error_invalid_email'));
            return false;
        }
        if (password.length < 6) {
            setError(t('error_password_short'));
            return false;
        }
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 9) {
            setError(t('error_invalid_phone'));
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            // Pass nameEn to the registration function
            await registerWithEmail(name, phone, email, password, nameEn);
        } catch (err: any) {
            setIsSubmitting(false);
            console.error("Registration failed:", err.code, err.message);
            if (err.code === 'auth/email-already-in-use') {
                setError(t('error_email_in_use'));
            } else {
                setError(t('error_generic') + ` (${err.message})`);
            }
        }
    };

    return (
        <div className="animate-fade-in w-full max-w-sm mx-auto">
            <div className="mb-6 text-center">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900/10">
                    <User size={28} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('create_account')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('register_subtitle')}</p>
            </div>

            {error && (
                <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-start gap-3 animate-fade-in">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs font-bold text-red-600 dark:text-red-300">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative group">
                    <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                        <User className="w-5 h-5" />
                    </div>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={(e) => { setName(e.target.value); setError(null); }} 
                        className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400
                        ${error 
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-600 hover:border-slate-300'
                        }`} 
                        placeholder={t('full_name')}
                    />
                </div>

                <div className="relative group">
                    <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                        <Globe className="w-5 h-5" />
                    </div>
                    {/* Removed dir="ltr" to align placeholder to the right (RTL default) */}
                    <input 
                        type="text" 
                        value={nameEn} 
                        onChange={(e) => { setNameEn(e.target.value); setError(null); }} 
                        className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400 border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-600 hover:border-slate-300`} 
                        placeholder={t('full_name_en')}
                    />
                </div>
                
                <div className="relative group">
                    <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                        <Phone className="w-5 h-5" />
                    </div>
                    <input 
                        type="tel" 
                        dir={dir}
                        value={phone} 
                        onChange={(e) => { setPhone(e.target.value); setError(null); }} 
                        className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400
                        ${error 
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-600 hover:border-slate-300'
                        }`}
                        placeholder={t('phone_number')}
                    />
                </div>
                
                <div className="relative group">
                    <div className={`absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none transition-colors ${error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'}`}>
                        <Mail className="w-5 h-5" />
                    </div>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => { setEmail(e.target.value); setError(null); }} 
                        className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400
                        ${error 
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-600 hover:border-slate-300'
                        }`} 
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
                        onChange={(e) => { setPassword(e.target.value); setError(null); }} 
                        className={`text-start w-full ps-12 p-3.5 bg-white dark:bg-slate-800 border rounded-xl focus:ring-2 transition-all outline-none font-medium text-base text-slate-900 dark:text-white placeholder-slate-400
                        ${error 
                            ? 'border-red-300 dark:border-red-700 focus:ring-red-500/20 focus:border-red-500' 
                            : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20 focus:border-indigo-600 hover:border-slate-300'
                        }`} 
                        placeholder="••••••••" 
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-12 mt-4 text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>{t('sign_up')}</span>}
                </button>
            </form>
            
            <p className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 mt-6">
                {t('already_have_account')}{' '}
                <button onClick={onSwitchToLogin} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4">{t('sign_in')}</button>
            </p>
        </div>
    );
};

export default RegisterView;
