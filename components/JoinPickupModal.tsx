
import React, { useState } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { MapPin, Send, X, Loader2 } from 'lucide-react';
import Portal from './Portal';

interface JoinPickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (location: string) => Promise<void>;
}

const JoinPickupModal: React.FC<JoinPickupModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const { t, dir } = useLocalization();
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!location.trim()) return;
        setIsSubmitting(true);
        try {
            await onConfirm(location.trim());
            onClose();
            setLocation('');
        } catch (error) {
            alert(t('error_generic'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <div className="flex flex-col">
                            <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">{t('pickup_modal_title')}</h3>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-400 transition-all active:scale-90">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                            {t('pickup_modal_desc')}
                        </p>

                        <div className="relative group">
                            <div className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} text-indigo-500 pointer-events-none transition-transform group-focus-within:scale-110`}>
                                <MapPin size={22} />
                            </div>
                            <input 
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder={t('pickup_modal_placeholder')}
                                className={`w-full p-4 ${dir === 'rtl' ? 'pr-12' : 'pl-12'} bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all text-start`}
                                autoFocus
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={!location.trim() || isSubmitting}
                            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                            {t('pickup_modal_btn')}
                        </button>
                    </form>
                </div>
            </div>
        </Portal>
    );
};

export default JoinPickupModal;
