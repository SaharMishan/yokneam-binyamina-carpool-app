
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, MASTER_EMAIL } from '../../context/AuthContext';
import { db, dbInstance } from '../../services/firebase';
import { UserProfile, Trip, Report } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import { 
    Shield, Trash2, Search, Send, User, CarFront, 
    Loader2, Megaphone, Activity, Users, MessageSquare, 
    CheckCircle2, Database, Lock, Zap, Globe, Eye, Check, 
    ActivitySquare, History, LayoutDashboard, X, AlertTriangle, Mail
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit, getCountFromServer } from 'firebase/firestore';
import Portal from '../Portal';

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const { t, dir } = useLocalization();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [messagesCount, setMessagesCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'trips' | 'reports' | 'broadcast' | 'dashboard' | 'versions'>('dashboard');
    
    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [showBroadcastSuccess, setShowBroadcastSuccess] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Deletion confirmation state
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'user' | 'trip', id: string, name: string, date?: string } | null>(null);
    const [isDeletingAction, setIsDeletingAction] = useState(false);

    const [filterTripStatus, setFilterTripStatus] = useState<'all' | 'active' | 'closed'>('all');
    const [filterTripType, setFilterTripType] = useState<'offer' | 'request'>('offer');

    const isMaster = user?.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

    useEffect(() => {
        if (!user?.isAdmin) return;
        setLoading(true);

        const usersUnsub = onSnapshot(collection(dbInstance, 'users'), (snap) => {
            setUsers(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
        });

        const reportsUnsub = onSnapshot(collection(dbInstance, 'reports'), (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setReports(fetched);
        });

        const tripsQ = query(collection(dbInstance, 'trips'), orderBy('departureTime', 'desc'), limit(150));
        const tripsUnsub = onSnapshot(tripsQ, (snap) => {
            setTrips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));
            setLoading(false);
        });

        getCountFromServer(collection(dbInstance, 'messages')).then(snap => setMessagesCount(snap.data().count));

        return () => { usersUnsub(); reportsUnsub(); tripsUnsub(); };
    }, [user?.isAdmin]);

    const executeDelete = async () => {
        if (!confirmDelete) return;
        setIsDeletingAction(true);
        try {
            if (confirmDelete.type === 'user') {
                await db.deleteUserProfile(confirmDelete.id);
            } else if (confirmDelete.type === 'trip') {
                await db.cancelTrip(confirmDelete.id);
            }
            setConfirmDelete(null);
        } catch (e) {
            alert(t('error_generic'));
        } finally {
            setIsDeletingAction(false);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setIsBroadcasting(true);
        try {
            await db.broadcastNotification(broadcastTitle || t('admin_update_title'), broadcastMsg.trim());
            setBroadcastMsg(''); 
            setBroadcastTitle('');
            setShowBroadcastSuccess(true);
            setTimeout(() => setShowBroadcastSuccess(false), 4000);
        } catch (e) { 
            alert(t('error_generic')); 
        } finally { 
            setIsBroadcasting(false); 
        }
    };

    const filteredUsers = useMemo(() => 
        users.filter(u => 
            u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.phoneNumber?.includes(searchTerm) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [users, searchTerm]);
    
    const filteredTrips = useMemo(() => {
        return trips.filter(t => {
            // First filter by type (Offer/Request)
            if (t.type !== filterTripType) return false;

            // Then filter by status
            if (filterTripStatus === 'active') return !t.isClosed;
            if (filterTripStatus === 'closed') return t.isClosed;
            return true;
        });
    }, [trips, filterTripStatus, filterTripType]);

    const SystemHealthCard = ({ icon: Icon, label, status, color }: any) => (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-opacity-100`}>
                    <Icon size={18} className={color.replace('bg-', 'text-')} />
                </div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">{status}</span>
            </div>
        </div>
    );

    const tabs = [
        { id: 'dashboard', icon: LayoutDashboard, label: t('admin_tab_dashboard') },
        { id: 'users', icon: Users, label: t('admin_tab_users') },
        { id: 'trips', icon: CarFront, label: t('admin_tab_trips') },
        { id: 'reports', icon: MessageSquare, label: t('admin_tab_reports') },
        { id: 'broadcast', icon: Send, label: t('admin_tab_broadcast') },
        { id: 'versions', icon: History, label: t('admin_tab_versions') },
    ];

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">טוען נתונים...</p>
        </div>
    );

    return (
        <div className="animate-fade-in w-full pb-32 max-w-2xl mx-auto">
            {/* Admin Header */}
            <div className="mb-6 flex items-center justify-between px-4 pt-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-tr from-indigo-600 to-indigo-800 p-3.5 rounded-2xl text-white shadow-xl shadow-indigo-500/20"><Shield size={28} /></div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{t('admin_panel')}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                {isMaster ? 'מרכז שליטה ראשי' : 'גישת מנהל רגילה'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Grid (3x2 on Mobile, Flex on Desktop) */}
            <div className="grid grid-cols-3 gap-2 md:flex md:flex-row bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-[2rem] mb-8 shadow-inner mx-4">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveTab(tab.id as any)} 
                        className={`flex-1 py-3 px-1 rounded-2xl text-[9px] font-black transition-all flex flex-col items-center justify-center gap-1.5 ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon size={16} />
                        <span className="truncate w-full text-center uppercase tracking-tighter">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="px-4 space-y-8">
                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-fade-in">
                        {/* Stats Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <Activity size={14} className="text-indigo-500" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_stats_title')}</h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                    <span className="text-3xl font-black text-slate-900 dark:text-white leading-none mb-2">{users.length}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{t('admin_stat_users')}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                    <span className="text-3xl font-black text-indigo-600 leading-none mb-2">{trips.filter(t => !t.isClosed).length}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{t('admin_stat_active')}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                    <span className="text-3xl font-black text-amber-500 leading-none mb-2">{reports.filter(r => r.status === 'open').length}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{t('admin_stat_reports')}</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                                    <span className="text-3xl font-black text-emerald-500 leading-none mb-2">{messagesCount}</span>
                                    <span className="text-[9px] font-black text-slate-400 uppercase">{t('admin_stat_messages')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Health Section (Integrated into Dashboard) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <Zap size={14} className="text-amber-500" />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('admin_health_title')}</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <SystemHealthCard icon={Database} label="שרת מסד נתונים" status={t('admin_status_operational')} color="bg-orange-500" />
                                <SystemHealthCard icon={Lock} label="שירות אימות" status={t('admin_status_operational')} color="bg-blue-500" />
                                <SystemHealthCard icon={Globe} label="רשת אחסון" status={t('admin_status_optimal')} color="bg-indigo-500" />
                                <SystemHealthCard icon={Zap} label="התראות בזמן אמת" status={t('admin_status_active')} color="bg-amber-500" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'versions' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-col items-center text-center gap-3 mb-2">
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full flex items-center justify-center shadow-inner ring-4 ring-slate-100 dark:ring-slate-700/30">
                                <History size={28} />
                            </div>
                            <div>
                                <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">{t('v_title')}</h3>
                                <p className="text-xs text-slate-500 font-bold px-4">{t('v_desc')}</p>
                            </div>
                        </div>

                        <div className="relative space-y-4 before:absolute before:inset-y-0 before:start-8 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 before:z-0">
                            {[
                                { v: '1.9.0', t: 'שיפור מערכת הניהול: הוספת אישורי מחיקה מותאמים, איחוד דשבורד סטטיסטיקה ובריאות מערכת, ושיפור ניווט גריד במובייל.', color: 'bg-emerald-600' },
                                { v: '1.8.5', t: t('v_ui_ux'), color: 'bg-indigo-500' },
                                { v: '1.8.0', t: t('v_admin'), color: 'bg-indigo-600' },
                                { v: '1.6.0', t: t('v_notif'), color: 'bg-blue-500' },
                                { v: '1.4.0', t: t('v_pwa'), color: 'bg-emerald-500' },
                                { v: '1.2.0', t: t('v_chat'), color: 'bg-amber-500' },
                                { v: '1.0.0', t: t('v_initial'), color: 'bg-slate-400' }
                            ].map((ver, i) => (
                                <div key={i} className="relative flex items-start gap-4 z-10">
                                    <div className={`w-16 h-8 ${ver.color} text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 shadow-lg`}>
                                        v{ver.v}
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex-1 text-start">
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {ver.t}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'broadcast' && (
                    <div className="space-y-6 animate-fade-in">
                        {showBroadcastSuccess && (
                            <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-3 animate-fade-in shadow-lg shadow-emerald-500/20 font-bold">
                                <CheckCircle2 size={24} /> {t('admin_broadcast_success')}
                            </div>
                        )}

                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-lg space-y-6">
                            <div className="flex flex-col items-center text-center gap-3">
                                <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center">
                                    <Megaphone size={28} />
                                </div>
                                <div>
                                    <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('admin_broadcast_title')}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold px-4">{t('admin_broadcast_desc')}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-1.5 text-start">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">כותרת ההודעה</label>
                                    <input 
                                        type="text" 
                                        value={broadcastTitle} 
                                        onChange={e => setBroadcastTitle(e.target.value)} 
                                        placeholder="למשל: גרסה חדשה זמינה! 🚀" 
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-start" 
                                    />
                                </div>
                                <div className="space-y-1.5 text-start">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">תוכן ההודעה</label>
                                    <textarea 
                                        value={broadcastMsg} 
                                        onChange={e => setBroadcastMsg(e.target.value)} 
                                        placeholder="מה תרצו להגיד לקהילה?..." 
                                        className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-start" 
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setShowPreview(true)}
                                        disabled={!broadcastMsg.trim()}
                                        className="flex-1 h-12 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 text-xs"
                                    >
                                        <Eye size={16} /> תצוגה
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={handleBroadcast} 
                                        disabled={isBroadcasting || !broadcastMsg.trim()} 
                                        className="flex-[2] h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 transition-all text-xs"
                                    >
                                        {isBroadcasting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} 
                                        שדר
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'trips' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Type Selector (Offers/Requests) */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner gap-1">
                             <button 
                                onClick={() => setFilterTripType('offer')} 
                                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${filterTripType === 'offer' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}
                             >
                                 <CarFront size={14} />
                                 {t('tab_offers')}
                             </button>
                             <button 
                                onClick={() => setFilterTripType('request')} 
                                className={`flex-1 py-3 text-[10px] font-black uppercase rounded-xl transition-all flex items-center justify-center gap-2 ${filterTripType === 'request' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}
                             >
                                 <Users size={14} />
                                 {t('tab_requests')}
                             </button>
                        </div>

                        {/* Status Filter */}
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shadow-inner">
                             {(['all', 'active', 'closed'] as const).map((st) => (
                                 <button key={st} onClick={() => setFilterTripStatus(st)} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-xl transition-all ${filterTripStatus === st ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md' : 'text-slate-500'}`}>
                                     {t(`filter_status_${st}`)}
                                 </button>
                             ))}
                        </div>

                        <div className="space-y-3">
                            {filteredTrips.length === 0 ? (
                                <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                    <p className="text-sm font-bold text-slate-400 uppercase">לא נמצאו נסיעות התואמות לסינון</p>
                                </div>
                            ) : (
                                filteredTrips.map(trip => (
                                    <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4 group">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center overflow-hidden shrink-0 text-slate-400">
                                                {trip.driverPhoto ? <img src={trip.driverPhoto} className="w-full h-full object-cover" /> : (trip.type === 'offer' ? <CarFront size={18} /> : <User size={18} />)}
                                            </div>
                                            <div className="min-w-0 text-start">
                                                <span className="text-sm font-black text-slate-900 dark:text-white truncate block">{trip.driverName}</span>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase">
                                                    {trip.departureTime.toDate().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })} • {t(trip.direction === 'Yokneam -> Binyamina' ? 'yokneam_to_binyamina' : 'binyamina_to_yokneam')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {trip.isClosed && (
                                                <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg" title={t('ride_closed')}>
                                                    <Lock size={14} />
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => setConfirmDelete({ 
                                                    type: 'trip', 
                                                    id: trip.id, 
                                                    name: trip.driverName, 
                                                    date: trip.departureTime.toDate().toLocaleDateString() 
                                                })} 
                                                className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl active:scale-90 transition-all hover:bg-red-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-4 animate-fade-in">
                        <div className="relative group">
                            <Search className={`absolute ${dir === 'rtl' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} size={18} />
                            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="חפש משתמש..." className={`w-full ${dir === 'rtl' ? 'pr-12 pl-4' : 'pl-12 pr-4'} h-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-sm outline-none text-start focus:ring-2 focus:ring-indigo-500/20`} />
                        </div>
                        <div className="space-y-3">
                            {filteredUsers.map(u => (
                                <div key={u.uid} className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-between gap-4 group">
                                    <div className="flex items-center gap-4 min-w-0 flex-1">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-slate-500 shrink-0 overflow-hidden">
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full object-cover" /> : u.displayName?.charAt(0)}
                                        </div>
                                        <div className="flex flex-col min-w-0 text-start">
                                            <span className="text-sm font-black text-slate-900 dark:text-white truncate">{u.displayName}</span>
                                            <div className="flex flex-col gap-0.5 mt-0.5">
                                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 truncate">
                                                    <Mail size={10} className="shrink-0" /> {u.email}
                                                </span>
                                                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold flex items-center gap-1.5 truncate">
                                                    <Globe size={10} className="shrink-0" /> {u.phoneNumber}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {isMaster && u.email?.toLowerCase() !== user?.email?.toLowerCase() && (
                                        <button 
                                            onClick={() => setConfirmDelete({ 
                                                type: 'user', 
                                                id: u.uid, 
                                                name: u.displayName || 'משתמש ללא שם' 
                                            })} 
                                            className="p-3 bg-red-50 dark:bg-red-900/10 text-red-500 rounded-xl active:scale-90 transition-all hover:bg-red-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="space-y-4 animate-fade-in">
                         {reports.length === 0 ? (
                            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-700">
                                <MessageSquare size={40} className="mx-auto text-slate-200 mb-4" />
                                <p className="text-sm font-bold text-slate-400 uppercase">אין דיווחים כרגע</p>
                            </div>
                         ) : (
                            reports.map(report => (
                                <div key={report.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${report.type === 'bug' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {report.type === 'bug' ? <X size={18} /> : <Zap size={18} />}
                                            </div>
                                            <div className="text-start">
                                                <h4 className="text-sm font-black text-slate-900 dark:text-white leading-none">{report.userName}</h4>
                                                <span className="text-[9px] text-slate-400 font-bold uppercase mt-1 block">{report.createdAt.toDate().toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${report.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {report.status === 'resolved' ? 'טופל' : 'פתוח'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl leading-relaxed text-start">
                                        {report.description}
                                    </p>
                                    <div className="flex gap-2">
                                        {report.status !== 'resolved' && (
                                            <button onClick={() => db.resolveReport(report)} className="flex-1 h-10 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all active:scale-95">
                                                <Check size={14} /> סמן כטופל
                                            </button>
                                        )}
                                        <button onClick={() => db.deleteReport(report.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center transition-all active:scale-95">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                         )}
                    </div>
                )}
            </div>

            {/* Global Delete Confirmation Modal */}
            {confirmDelete && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-fade-in" onClick={() => !isDeletingAction && setConfirmDelete(null)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in relative" onClick={e => e.stopPropagation()}>
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 mb-6 ring-8 ring-red-50/50 dark:ring-red-900/10">
                                    <AlertTriangle size={44} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">
                                    {confirmDelete.type === 'user' ? 'מחיקת משתמש' : 'מחיקת נסיעה'}
                                </h3>
                                <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 mb-8">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {confirmDelete.type === 'user' 
                                            ? t('confirm_delete_user_msg').replace('{name}', confirmDelete.name)
                                            : t('confirm_delete_trip_msg').replace('{name}', confirmDelete.name).replace('{date}', confirmDelete.date || '')}
                                    </p>
                                    <p className="mt-4 text-[10px] text-red-500 font-black uppercase tracking-widest">פעולה זו היא סופית ולא ניתנת לביטול</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button 
                                        onClick={() => setConfirmDelete(null)}
                                        disabled={isDeletingAction}
                                        className="py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-xs"
                                    >
                                        ביטול
                                    </button>
                                    <button 
                                        onClick={executeDelete}
                                        disabled={isDeletingAction}
                                        className="py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                                    >
                                        {isDeletingAction ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        מחק
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {/* Broadcast Preview Modal */}
            {showPreview && (
                <Portal>
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-fade-in" onClick={() => setShowPreview(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in relative" onClick={e => e.stopPropagation()}>
                            <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-600 w-full"></div>
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-6">
                                    <Megaphone size={32} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4">{broadcastTitle || t('admin_update_title')}</h3>
                                <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 mb-8 max-h-[30vh] overflow-y-auto scrollbar-hide">
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-start">
                                        {broadcastMsg || 'תוכן ההודעה יופיע כאן...'}
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setShowPreview(false)}
                                    className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
                                >
                                    חזרה לעריכה
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default AdminDashboard;
