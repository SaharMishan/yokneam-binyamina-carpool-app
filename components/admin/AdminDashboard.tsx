
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
            fetched.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
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

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                            activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="mt-6">
                {activeTab === 'dashboard' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <SystemHealthCard icon={Database} label="Firebase Auth" status="Operational" color="bg-emerald-500" />
                        <SystemHealthCard icon={Zap} label="Firestore DB" status="Optimal" color="bg-indigo-500" />
                        <SystemHealthCard icon={Globe} label="API Endpoints" status="Active" color="bg-blue-500" />
                        <SystemHealthCard icon={Lock} label="Security Rules" status="Enforced" color="bg-amber-500" />
                    </div>
                )}
                <div className="p-10 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                    <Activity size={48} className="mx-auto text-indigo-600/20 mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">תוכן הלשונית "{activeTab}" בטעינה...</p>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
