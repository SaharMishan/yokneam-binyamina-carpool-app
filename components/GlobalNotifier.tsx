
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../types';
import { Bell, X, CheckCircle2, Megaphone, Sparkles } from 'lucide-react';

const GlobalNotifier: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const { notifications, activeSystemMessage, confirmSystemMessage } = useNotifications();
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const shownToastIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!user || notifications.length === 0) return;

        const newest = notifications.find(n => !n.isRead && n.type !== 'info' && !shownToastIds.current.has(n.id));
        
        if (newest) {
            const now = Date.now();
            const notifTime = newest.createdAt?.toMillis() || 0;
            
            if (notifTime > now - 120000) {
                setActiveToast(newest);
                shownToastIds.current.add(newest.id);
                const timer = setTimeout(() => setActiveToast(null), 6000);
                return () => clearTimeout(timer);
            }
        }
    }, [notifications, user]);

    const getSmartMessage = (notif: AppNotification) => {
        if (notif.type === 'invite' && notif.metadata) {
            return t('notif_invite_msg')
                .replace('{name}', notif.metadata.driverName)
                .replace('{direction}', t(notif.metadata.directionKey))
                .replace('{time}', notif.metadata.time);
        }
        if (notif.message && notif.message.includes('|')) {
            const parts = notif.message.split('|');
            return t(parts[0]).replace('{name}', parts[1]);
        }
        return t(notif.message) || notif.message;
    };

    if (activeSystemMessage) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in relative">
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600 w-full"></div>
                    
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner ring-8 ring-indigo-50/50 dark:ring-indigo-900/10">
                                <Megaphone size={40} className="animate-bounce-slow" />
                            </div>
                            <div className="absolute -top-1 -right-1 bg-amber-400 text-white p-1.5 rounded-full shadow-lg animate-pulse">
                                <Sparkles size={16} />
                            </div>
                        </div>

                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 leading-tight">
                            {activeSystemMessage.title}
                        </h3>
                        
                        <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 mb-8 max-h-[35vh] overflow-y-auto scrollbar-hide">
                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-start">
                                {activeSystemMessage.message}
                            </p>
                        </div>
                        
                        <button 
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                confirmSystemMessage();
                            }}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-indigo-500/20"
                        >
                            <CheckCircle2 size={20} />
                            {t('confirm')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!activeToast) return null;

    const getBgColor = () => {
        switch (activeToast.type) {
            case 'cancel': return 'bg-red-600';
            case 'approved': return 'bg-emerald-600';
            case 'invite': return 'bg-indigo-600';
            case 'request': return 'bg-amber-600';
            default: return 'bg-slate-800';
        }
    };

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm px-4 animate-fade-in">
            <div className={`${getBgColor()} text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-white/10 backdrop-blur-md`}>
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                    <Bell size={20} />
                </div>
                <div className="flex-1">
                    <h4 className="font-black text-xs uppercase tracking-tight">{t(activeToast.title)}</h4>
                    <p className="text-xs text-white/90 mt-1 font-bold">{getSmartMessage(activeToast)}</p>
                </div>
                <button onClick={() => setActiveToast(null)} className="p-1 hover:bg-white/20 rounded-full shrink-0">
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default GlobalNotifier;
