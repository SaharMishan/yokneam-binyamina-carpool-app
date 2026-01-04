
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useNotifications } from '../context/NotificationContext';
import { AppNotification } from '../types';
import { Bell, X, AlertTriangle, CheckCircle2, Info, UserX, Send, Megaphone } from 'lucide-react';

const GlobalNotifier: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const { notifications } = useNotifications(); // Use existing context stream
    const [activeToast, setActiveToast] = useState<AppNotification | null>(null);
    const [lastShownId, setLastShownId] = useState<string | null>(null);

    useEffect(() => {
        if (!user || notifications.length === 0) return;

        // Check the newest notification from the context array
        // (Assuming context sorts by Newest first, which it does)
        const newest = notifications[0];

        // Only show if:
        // 1. It's unread
        // 2. We haven't shown this exact ID yet (prevent loop)
        // 3. It's very recent (e.g. created in last 60 seconds)
        //    This prevents old unread notifications from popping up on refresh.
        if (!newest.isRead && newest.id !== lastShownId) {
            const now = Date.now();
            const notifTime = newest.createdAt?.toMillis() || 0;
            
            if (notifTime > now - 60000) {
                setActiveToast(newest);
                setLastShownId(newest.id);

                // Auto hide non-system messages
                if (newest.type !== 'info') {
                    const timer = setTimeout(() => {
                        setActiveToast(null);
                    }, 8000);
                    return () => clearTimeout(timer);
                }
            } else {
                // If it's old but unread, we just mark it as "seen by notifier" so we don't check it again
                setLastShownId(newest.id);
            }
        }
    }, [notifications, user, lastShownId]);

    const getSmartMessage = (notif: AppNotification) => {
        if (notif.type !== 'invite' || !notif.metadata) {
            if (notif.message && notif.message.includes('|')) {
                const parts = notif.message.split('|');
                return t(parts[0]).replace('{name}', parts[1]);
            }
            return t(notif.message) || notif.message;
        }

        const meta = notif.metadata;
        const departureTs = meta.departureTimestamp;
        
        if (!departureTs) {
             return t('notif_invite_msg')
                .replace('{name}', meta.driverName)
                .replace('{direction}', t(meta.directionKey))
                .replace('{time}', meta.time);
        }

        const tripDate = new Date(departureTs);
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const isToday = tripDate.toDateString() === today.toDateString();
        const isTomorrow = tripDate.toDateString() === tomorrow.toDateString();

        if (isToday) {
            return t('notif_invite_msg_today')
                .replace('{name}', meta.driverName)
                .replace('{direction}', t(meta.directionKey))
                .replace('{time}', meta.time);
        } else if (isTomorrow) {
            return t('notif_invite_msg_tomorrow')
                .replace('{name}', meta.driverName)
                .replace('{direction}', t(meta.directionKey))
                .replace('{time}', meta.time);
        } else {
            return t('notif_invite_msg_future')
                .replace('{name}', meta.driverName)
                .replace('{direction}', t(meta.directionKey))
                .replace('{time}', meta.time)
                .replace('{dayName}', meta.dayName)
                .replace('{date}', meta.date);
        }
    };

    if (!activeToast) return null;

    const displayMessage = getSmartMessage(activeToast);

    // --- RENDER AS MODAL FOR SYSTEM MESSAGES (INFO) ---
    if (activeToast.type === 'info') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700 animate-scale-in">
                    {/* Header */}
                    <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 shadow-inner backdrop-blur-md">
                            <Megaphone size={32} className="text-white" />
                        </div>
                        <h3 className="text-xl font-black text-white leading-tight uppercase tracking-wide">
                            {t(activeToast.title)}
                        </h3>
                    </div>
                    
                    {/* Content */}
                    <div className="p-6">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 mb-6">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed text-center">
                                {displayMessage}
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => setActiveToast(null)}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            {t('confirm')}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- RENDER AS TOAST FOR OTHER NOTIFICATIONS ---

    const getIcon = () => {
        switch (activeToast.type) {
            case 'cancel': return <UserX size={20} className="text-white" />;
            case 'approved': return <CheckCircle2 size={20} className="text-white" />;
            case 'invite': return <Send size={20} className="text-white" />;
            case 'match': return <AlertTriangle size={20} className="text-white" />;
            case 'request': return <Bell size={20} className="text-white" />;
            default: return <Info size={20} className="text-white" />;
        }
    };

    const getBgColor = () => {
        switch (activeToast.type) {
            case 'cancel': return 'bg-red-600 border-red-500';
            case 'approved': return 'bg-emerald-600 border-emerald-500';
            case 'invite': return 'bg-indigo-600 border-indigo-500 shadow-indigo-600/30';
            case 'request': return 'bg-amber-600 border-amber-500 shadow-amber-600/30';
            case 'match': return 'bg-orange-600 border-orange-500 shadow-orange-600/30';
            default: return 'bg-slate-800 border-slate-700';
        }
    };

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm px-4 animate-fade-in">
            <div className={`${getBgColor()} text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border backdrop-blur-md transition-all`}>
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                    {getIcon()}
                </div>
                <div className="flex-1 overflow-hidden">
                    <h4 className="font-black text-sm uppercase tracking-tight leading-tight">{t(activeToast.title)}</h4>
                    <p className="text-xs text-white/95 mt-1 leading-relaxed font-bold">{displayMessage}</p>
                </div>
                <button 
                    onClick={() => setActiveToast(null)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors shrink-0"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default GlobalNotifier;
