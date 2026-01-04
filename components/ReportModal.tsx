
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { db } from '../services/firebase';
import { X, Bug, Lightbulb, Send, CheckCircle, Loader2 } from 'lucide-react';
import Portal from './Portal';

interface ReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const [type, setType] = useState<'bug' | 'improvement'>('bug');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !description.trim()) return;

        setIsSubmitting(true);
        try {
            await db.submitReport({
                userId: user.uid,
                userName: user.displayName || 'Unknown',
                userPhoto: user.photoURL,
                type,
                description: description.trim()
            });
            setIsSuccess(true);
            setTimeout(() => {
                onClose();
                setTimeout(() => {
                    setIsSuccess(false);
                    setDescription('');
                    setType('bug');
                }, 300);
            }, 2000);
        } catch (error) {
            alert(t('error_generic'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    {isSuccess ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 animate-float">
                                <CheckCircle size={40} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">{t('report_submitted')}</h3>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                                <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('report_modal_title')}</h3>
                                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all active:scale-90"><X size={20} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    <button type="button" onClick={() => setType('bug')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${type === 'bug' ? 'bg-white dark:bg-slate-700 text-red-500 shadow-sm' : 'text-slate-500'}`}><Bug size={16} /> {t('report_type_bug')}</button>
                                    <button type="button" onClick={() => setType('improvement')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-xs font-bold transition-all ${type === 'improvement' ? 'bg-white dark:bg-slate-700 text-amber-500 shadow-sm' : 'text-slate-500'}`}><Lightbulb size={16} /> {t('report_type_improvement')}</button>
                                </div>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('report_desc_placeholder')} className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none focus:border-indigo-500 transition-all font-medium text-sm text-slate-800 dark:text-white" required />
                                <button type="submit" disabled={isSubmitting || !description.trim()} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50">{isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />} {t('report_submit')}</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </Portal>
    );
};

export default ReportModal;
