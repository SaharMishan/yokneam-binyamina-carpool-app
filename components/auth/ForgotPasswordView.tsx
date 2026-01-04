
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';

interface ForgotPasswordViewProps {
    onSwitchToLogin: () => void;
}

const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({ onSwitchToLogin }) => {
    const { t, dir } = useLocalization();
    const { sendPasswordReset } = useAuth();
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await sendPasswordReset(email);
            setIsSuccess(true);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="animate-fade-in w-full text-center py-8">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">{t('reset_success')}</h2>
                <button 
                    onClick={onSwitchToLogin} 
                    className="mt-6 font-bold text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-2 mx-auto"
                >
                    <ArrowLeft className={`w-4 h-4 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
                    {t('back_to_login')}
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in w-full">
             <div className="mb-8 text-center">
                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400 ring-4 ring-indigo-50 dark:ring-indigo-900/10">
                    <Mail size={28} />
                </div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('reset_your_password')}</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{t('forgot_password_subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative group">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="text-start w-full ps-11 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all outline-none font-medium text-slate-900 dark:text-white placeholder-slate-400" placeholder="name@example.com"/>
                </div>
                
                <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full py-4 px-4 text-white font-bold bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:shadow-none flex items-center justify-center gap-2"
                >
                     {isSubmitting ? (
                         <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> 
                     ) : (
                         <>
                            <span>{t('send_reset_link')}</span>
                            <Send className="w-4 h-4" />
                         </>
                     )}
                </button>
            </form>
            
            <p className="text-center mt-8">
                <button onClick={onSwitchToLogin} className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors group">
                    {dir === 'rtl' ? <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" /> : <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />}
                    {t('back_to_login')}
                </button>
            </p>
        </div>
    );
};

export default ForgotPasswordView;
