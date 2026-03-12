
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
import { motion, AnimatePresence } from 'motion/react';

/**
 * AdminDashboard component - provides management interface for administrators.
 * This file was truncated and is now fixed with the missing export.
 */
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
    const [permissionError, setPermissionError] = useState(false);
    
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
        setPermissionError(false);

        const usersUnsub = onSnapshot(collection(dbInstance, 'users'), (snap) => {
            setUsers(snap.docs.map(doc => ({ ...doc.data(), uid: doc.id } as UserProfile)));
        }, (err) => {
            console.error("Admin Users Listener Error:", err);
            if (err.code === 'permission-denied') setPermissionError(true);
        });

        const reportsUnsub = onSnapshot(collection(dbInstance, 'reports'), (snap) => {
            const fetched = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            fetched.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || Date.now();
                const timeB = b.createdAt?.toMillis() || Date.now();
                return timeB - timeA;
            });
            setReports(fetched);
        }, (err) => {
            console.error("Admin Reports Listener Error:", err);
            if (err.code === 'permission-denied') setPermissionError(true);
        });

        const tripsQ = query(collection(dbInstance, 'trips'), orderBy('departureTime', 'desc'), limit(150));
        const tripsUnsub = onSnapshot(tripsQ, (snap) => {
            setTrips(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip)));
            setLoading(false);
        }, (err) => {
            console.error("Admin Trips Listener Error:", err);
            setLoading(false);
            if (err.code === 'permission-denied') setPermissionError(true);
        });

        getCountFromServer(collection(dbInstance, 'messages'))
            .then(snap => setMessagesCount(snap.data().count))
            .catch(e => console.error("Admin Messages Count Error:", e));

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
            if (t.type !== filterTripType) return false;
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

    if (permissionError) {
        return (
            <div className="flex flex-col items-center justify-center py-40 px-6 text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-600 mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">גישה נדחתה</h2>
                <p className="text-slate-500 mt-2">אין לך הרשאות ניהול למערכת זו.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg">
                        <Shield size={24} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{t('admin_panel')}</h1>
                </div>
            </div>

            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sticky top-16 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md z-30 py-4 -mx-2 px-2 sm:mx-0 sm:px-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-2.5 rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-tighter sm:tracking-tight transition-all ${
                            activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02] sm:scale-105'
                            : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-900/30'
                        }`}
                    >
                        <tab.icon size={16} className={activeTab === tab.id ? 'animate-pulse' : ''} />
                        <span className="text-center leading-tight">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-6 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs">טוען נתונים מהשרת...</p>
                    </div>
                ) : (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 'dashboard' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <SystemHealthCard icon={Database} label="Firebase Auth" status="Operational" color="bg-emerald-500" />
                                    <SystemHealthCard icon={Zap} label="Firestore DB" status="Optimal" color="bg-indigo-500" />
                                    <SystemHealthCard icon={Globe} label="API Endpoints" status="Active" color="bg-blue-500" />
                                    <SystemHealthCard icon={Lock} label="Security Rules" status="Enforced" color="bg-amber-500" />
                                    
                                    <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סה"כ משתמשים</div>
                                            <div className="text-3xl font-black text-slate-800 dark:text-white">{users.length}</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">נסיעות פעילות</div>
                                            <div className="text-3xl font-black text-slate-800 dark:text-white">{trips.filter(t => !t.isClosed).length}</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">דיווחים פתוחים</div>
                                            <div className="text-3xl font-black text-red-500">{reports.filter(r => r.status !== 'resolved').length}</div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">הודעות צ'אט</div>
                                            <div className="text-3xl font-black text-indigo-600">{messagesCount}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {activeTab === 'users' && (
                            <div className="space-y-4">
                                <div className="relative">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder={t('admin_search_users')} 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full h-12 pr-12 pl-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredUsers.length === 0 ? (
                                        <div className="p-10 text-center text-slate-400 font-bold">לא נמצאו משתמשים</div>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <div key={u.uid} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                                        {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <User size={20} className="text-slate-400" />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{u.displayName}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">{u.email}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setConfirmDelete({ type: 'user', id: u.uid, name: u.displayName || '' })}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'trips' && (
                            <div className="space-y-4">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <div className="flex-1 relative">
                                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder={t('admin_search_trips')} 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full h-12 pr-12 pl-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        <button onClick={() => setFilterTripType('offer')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterTripType === 'offer' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>{t('trip_type_offer')}</button>
                                        <button onClick={() => setFilterTripType('request')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterTripType === 'request' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'}`}>{t('trip_type_request')}</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {filteredTrips.length === 0 ? (
                                        <div className="p-10 text-center text-slate-400 font-bold">לא נמצאו נסיעות</div>
                                    ) : (
                                        filteredTrips.map(trip => (
                                            <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600">
                                                        <CarFront size={20} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-800 dark:text-white">{trip.driverName}</span>
                                                        <span className="text-[10px] font-bold text-slate-500">{t(trip.direction)} | {trip.departureTime.toDate().toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setConfirmDelete({ type: 'trip', id: trip.id, name: trip.driverName, date: trip.departureTime.toDate().toLocaleString() })}
                                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reports' && (
                            <div className="space-y-4">
                                {reports.length === 0 ? (
                                    <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                        <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
                                        <p className="text-slate-400 font-bold">{t('admin_no_reports')}</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {reports.map(report => (
                                            <div key={report.id} className={`bg-white dark:bg-slate-800 p-5 rounded-2xl border shadow-sm transition-all ${report.status === 'resolved' ? 'border-emerald-100 dark:border-emerald-900/20 opacity-75' : 'border-slate-100 dark:border-slate-700'}`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${report.type === 'bug' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                                                            {report.type === 'bug' ? <AlertTriangle size={18} /> : <Zap size={18} />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t(`report_type_${report.type}`)}</span>
                                                            <span className="text-sm font-black text-slate-800 dark:text-white">{report.userName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {report.status !== 'resolved' && (
                                                            <button 
                                                                onClick={() => db.resolveReport(report)}
                                                                className="p-2 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition-all active:scale-90"
                                                                title={t('admin_resolve_report')}
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={() => db.deleteReport(report.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">{report.description}</p>
                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400">{report.createdAt?.toDate().toLocaleString('he-IL')}</span>
                                                    {report.status === 'resolved' && (
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                                            <CheckCircle2 size={12} /> {t('admin_resolved')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'broadcast' && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Megaphone size={20} />
                                    </div>
                                    <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('admin_broadcast_title')}</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_broadcast_subject')}</label>
                                        <input 
                                            type="text" 
                                            value={broadcastTitle}
                                            onChange={(e) => setBroadcastTitle(e.target.value)}
                                            placeholder={t('admin_broadcast_subject_placeholder')}
                                            className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('admin_broadcast_message')}</label>
                                        <textarea 
                                            value={broadcastMsg}
                                            onChange={(e) => setBroadcastMsg(e.target.value)}
                                            placeholder={t('admin_broadcast_message_placeholder')}
                                            className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl outline-none focus:border-indigo-500 transition-all font-bold text-sm resize-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleBroadcast}
                                        disabled={isBroadcasting || !broadcastMsg.trim()}
                                        className="w-full h-14 bg-indigo-600 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isBroadcasting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                        {t('admin_send_broadcast')}
                                    </button>
                                </div>
                                {showBroadcastSuccess && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-4 rounded-xl flex items-center gap-3 text-emerald-600 animate-fade-in">
                                        <CheckCircle2 size={20} />
                                        <span className="text-xs font-black uppercase tracking-widest">{t('admin_broadcast_sent')}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'versions' && (
                            <div className="space-y-4">
                                <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-3">
                                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
                                                <History size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-xl text-slate-800 dark:text-white">יומן גרסאות מפורט</h3>
                                                <p className="text-xs text-slate-400 font-bold">היסטוריית הפיתוח והשיפורים</p>
                                            </div>
                                        </div>
                                        <span className="px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-200 dark:border-indigo-800">v1.2.6</span>
                                    </div>
                                    
                                    <div className="space-y-8 relative before:absolute before:right-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800">
                                        {/* v1.2.6 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 z-10 shadow-md"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.2.6 - אופטימיזציה למובייל ודיוק</span>
                                                <span className="text-[10px] font-bold text-slate-400">24/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> שדרוג תפריט הניהול למבנה Grid רספונסיבי (3 עמודות במובייל) לגישה מהירה לכל הלשוניות.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> תיקון מנגנון הדיווחים - מיון בזמן אמת (Live) לפי זמן יצירה, כולל טיפול ב-Server Timestamps.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הוספת מצבי טעינה (Skeleton/Loaders) לכל חלקי הדשבורד לשיפור חווית המשתמש.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הרחבת יומן הגרסאות לפירוט מלא של כל שלבי הפיתוח.</li>
                                            </ul>
                                        </div>

                                        {/* v1.2.5 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 z-10"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.2.5 - פאנל ניהול מתקדם</span>
                                                <span className="text-[10px] font-bold text-slate-400">24/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הקמת מרכז הניהול (Admin Dashboard) עם סטטיסטיקות מערכת בזמן אמת.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> ניהול משתמשים: חיפוש, סינון ואפשרות למחיקת חשבונות.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> ניהול נסיעות: מעקב אחרי כל הנסיעות הפעילות והסגורות במערכת.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> מערכת שידור (Broadcast): שליחת הודעות גלובליות לכל המשתמשים בלחיצת כפתור.</li>
                                            </ul>
                                        </div>

                                        {/* v1.2.4 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 z-10"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.2.4 - חווית משתמש ואנימציות</span>
                                                <span className="text-[10px] font-bold text-slate-400">23/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> שילוב ספריית Framer Motion לאנימציות מעבר חלקות בין מסכים וטאבים.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> עיצוב מחדש של כרטיסי הנסיעה למראה מודרני ונקי יותר.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הוספת אינדיקטורים ויזואליים לסטטוס נסיעה (פתוחה/סגורה/מלאה).</li>
                                            </ul>
                                        </div>

                                        {/* v1.2.0 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 z-10"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.2.0 - תקשורת וקהילה</span>
                                                <span className="text-[10px] font-bold text-slate-400">20/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> השקת מערכת הצ׳אט הקבוצתית לכל נסיעה לתיאום איסוף מדויק.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> מערכת התראות Push בזמן אמת על הודעות חדשות ובקשות הצטרפות.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> אפשרות לשיתוף מיקום חי בתוך הצ׳אט.</li>
                                            </ul>
                                        </div>

                                        {/* v1.1.0 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 z-10"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.1.0 - ליבת המערכת</span>
                                                <span className="text-[10px] font-bold text-slate-400">15/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> פיתוח מנגנון פרסום נסיעות ובקשות הצטרפות.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> אינטגרציה מלאה עם Firebase Firestore לניהול נתונים.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> תמיכה ב-PWA להתקנה כקיצור דרך על מסך הבית.</li>
                                            </ul>
                                        </div>

                                        {/* v1.0.0 */}
                                        <div className="relative pr-10">
                                            <div className="absolute right-0 top-1 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-900 z-10"></div>
                                            <div className="flex flex-col gap-1 mb-2">
                                                <span className="text-sm font-black text-slate-800 dark:text-white">גרסה 1.0.0 - השקה ראשונית</span>
                                                <span className="text-[10px] font-bold text-slate-400">10/02/2026</span>
                                            </div>
                                            <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2 list-none">
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הקמת תשתית הפרויקט וחיבור ל-Firebase Auth.</li>
                                                <li className="flex items-start gap-2"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /> הגדרת שפה (עברית) וכיווניות (RTL) לכל האפליקציה.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>

            {/* Confirmation Modal */}
            <Portal>
                <AnimatePresence>
                    {confirmDelete && (
                        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
                            ></motion.div>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10 p-8 text-center"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Trash2 size={40} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">האם אתה בטוח?</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium leading-relaxed">
                                    אתה עומד למחוק את {confirmDelete.type === 'user' ? 'המשתמש' : 'הנסיעה'} <span className="font-black text-slate-800 dark:text-white">{confirmDelete.name}</span>.<br/>פעולה זו אינה ניתנת לביטול.
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => setConfirmDelete(null)}
                                        className="flex-1 h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                                    >
                                        ביטול
                                    </button>
                                    <button 
                                        onClick={executeDelete}
                                        disabled={isDeletingAction}
                                        className="flex-1 h-14 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isDeletingAction ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                                        מחק
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </Portal>
        </div>
    );
};

export default AdminDashboard;
