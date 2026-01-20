
import React, { useState, useRef, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { Direction } from '../types';
import { Menu, CarFront, Moon, Sun, Globe, Bell, Trash2, Check, X, Megaphone } from 'lucide-react';

interface HeaderProps {
    onMenuClick: () => void;
    onLogoClick: () => void;
    onNavigateToTrip: (tripId: string, direction: Direction) => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, onLogoClick, onNavigateToTrip }) => {
    const { t, language, toggleLanguage, isDarkMode, toggleTheme, dir } = useLocalization();
    const { user } = useAuth();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, setActiveSystemMessage } = useNotifications();
    const [showNotifications, setShowNotifications] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);
    const [processingNotifId, setProcessingNotifId] = useState<string | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const NotificationItem: React.FC<{ notif: any }> = ({ notif }) => {
        let message = notif.message;
        if (message && message.includes('|')) {
            const parts = message.split('|');
            message = t(parts[0]).replace('{name}', parts[1]);
        } else if (notif.type === 'invite' && notif.metadata) {
            message = t('notif_invite_msg').replace('{name}', notif.metadata.driverName).replace('{direction}', t(notif.metadata.directionKey)).replace('{time}', notif.metadata.time);
        } else { message = t(message) || message; }

        const handleNotifClick = () => {
            if (notif.type === 'info') {
                setActiveSystemMessage(notif);
                setShowNotifications(false);
                return;
            }
            
            markAsRead(notif.id);
            if (notif.relatedTripId && notif.metadata?.direction) {
                onNavigateToTrip(notif.relatedTripId, notif.metadata.direction);
                setShowNotifications(false);
            }
        };

        const handleAction = async (e: React.MouseEvent, action: 'approve' | 'reject') => {
            e.stopPropagation();
            if (processingNotifId) return;
            setProcessingNotifId(notif.id);
            try {
                if (notif.type === 'request' && notif.metadata?.passengerId) {
                    if (action === 'approve') await db.approveJoinRequest(notif.relatedTripId, notif.metadata.passengerId);
                    else await db.rejectJoinRequest(notif.relatedTripId, notif.metadata.passengerId);
                    markAsRead(notif.id);
                } else if (notif.type === 'invite') {
                    if (action === 'approve') {
                         await db.acceptTripInvitation(notif.relatedTripId, { uid: user!.uid, name: user!.displayName || 'Guest', photo: user!.photoURL || '', phoneNumber: user!.phoneNumber || '', status: 'approved' }, notif.id);
                         // Navigate passenger to the trip they just joined
                         if (notif.relatedTripId && notif.metadata?.direction) {
                            onNavigateToTrip(notif.relatedTripId, notif.metadata.direction);
                            setShowNotifications(false);
                         }
                    } else { 
                        await db.rejectTripInvitation(notif.relatedTripId, user!.displayName || 'Guest', notif.id); 
                    }
                }
            } catch (err) { 
                console.error(err); 
            }
            finally { setProcessingNotifId(null); }
        };

        const isActionable = (notif.type === 'request' || notif.type === 'invite') && !notif.isRead;
        const isInfo = notif.type === 'info';

        return (
            <div onClick={handleNotifClick} className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-all relative group ${!notif.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                        {isInfo && <Megaphone size={14} className="text-indigo-600" />}
                        <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-indigo-700 dark:text-indigo-400' : 'font-semibold text-slate-700 dark:text-slate-300'}`}>{t(notif.title)}</h4>
                    </div>
                    <span className="text-[10px] text-slate-400">{notif.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pr-4 leading-relaxed font-medium">{message}</p>
                {isActionable ? (
                    <div className="flex gap-2 mt-3">
                        <button onClick={(e) => handleAction(e, 'approve')} className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 transition-all"><Check size={14}/>{t('approve')}</button>
                        <button onClick={(e) => handleAction(e, 'reject')} className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 active:scale-95 transition-all"><X size={14}/>{t('reject')}</button>
                    </div>
                ) : (
                    <div className="absolute bottom-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 h-16 z-[60] transition-all shadow-sm">
            <div className="w-full px-4 sm:px-6 h-full flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={onLogoClick}>
                    <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-md group-hover:rotate-6 transition-transform"><CarFront size={20} /></div>
                    <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 hidden sm:block">{t('app_title')}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative" ref={notifRef}>
                        <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-all relative">
                            <Bell size={20} />
                            {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>}
                        </button>
                        {showNotifications && (
                            <div className={`fixed inset-x-4 top-16 md:absolute md:inset-auto md:top-12 ${dir === 'rtl' ? 'md:left-0' : 'md:right-0'} md:w-[400px] max-h-[80vh] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col animate-fade-in z-[100]`}>
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-row-reverse justify-between items-center shrink-0">
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('notifications_title')}</h3>
                                    <div className="flex items-center gap-3">
                                        <button onClick={markAllAsRead} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">{t('mark_all_read')}</button>
                                        <button onClick={clearAllNotifications} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 scrollbar-hide overscroll-contain">
                                    {notifications.length === 0 ? (<div className="p-12 text-center flex flex-col items-center gap-3"><div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center text-slate-300"><Bell size={24} /></div><span className="text-sm font-medium text-slate-400">{t('no_notifications')}</span></div>) : (notifications.map(n => <NotificationItem key={n.id} notif={n} />))}
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={toggleTheme} className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 hidden sm:block">{isDarkMode ? <Moon size={20} /> : <Sun size={20} />}</button>
                    <button onClick={toggleLanguage} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><Globe size={16} /><span className="text-xs font-black uppercase tracking-widest">{language}</span></button>
                    <button onClick={onMenuClick} className="md:hidden p-2 rounded-full text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all active:scale-95"><Menu size={20} /></button>
                </div>
            </div>
        </header>
    );
};

export default Header;
