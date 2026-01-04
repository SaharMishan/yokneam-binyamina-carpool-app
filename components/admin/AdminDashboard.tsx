
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { UserProfile, Trip, Direction, TripType, Report } from '../../types';
import { useLocalization } from '../../context/LocalizationContext';
import { Shield, Trash2, Search, Send, User, Check, X, AlertTriangle, Activity, Users, Lock, Unlock, CarFront, History, ClipboardList, MapPin, Filter, ArrowUpDown, Bug, Lightbulb, CheckCircle2, MessageSquare, Type, Clock, ChevronRight, TrendingUp, GitCommit, FileCode, Server, Loader2 } from 'lucide-react';

interface AdminDashboardProps {
    initialTab?: 'users' | 'trips' | 'reports' | 'broadcast' | 'stats' | 'changelog';
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ initialTab }) => {
    const { user } = useAuth();
    const { t, language, dir } = useLocalization();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'users' | 'trips' | 'reports' | 'broadcast' | 'stats' | 'changelog'>('stats');
    
    const CHANGELOG_DATA = [
        {
            version: "v1.6.5 (היום)",
            date: "01.01.2026",
            title: "תיקונים ושיפורים קריטיים",
            details: [
                "TimePicker: מנגנון גלילה חדש עם Snap וסנכרון ויזואלי מיידי.",
                "Admin Panel: הוספת מודל מחיקה מאובטח לדיווחים.",
                "Auth: שיפור הודעות שגיאה בכניסה למערכת."
            ]
        },
        {
            version: "v1.6.0",
            date: "30.12.2025",
            title: "מערכת ניהול מלאה",
            details: [
                "דשבורד מנהלים: סטטיסטיקות, ניהול משתמשים ונסיעות.",
                "Reports System: מערכת דיווח על תקלות והצעות ייעול.",
                "Broadcast: יכולת שליחת הודעות מתפרצות לכלל המשתמשים."
            ]
        },
        {
            version: "v1.5.0",
            date: "25.12.2025",
            title: "תקשורת בזמן אמת",
            details: [
                "Chat: צ'אט פנימי לכל נסיעה עם אינדיקטור הקלדה.",
                "Notifications: מרכז התראות (Notification Center) ו-Toast.",
                "Invite System: מנגנון הזמנת נוסעים לנסיעה ספציפית."
            ]
        },
        {
            version: "v1.4.0",
            date: "15.12.2025",
            title: "לו\"ז וסינונים מתקדמים",
            details: [
                "Schedule View: תצוגה קלנדרית שבועית.",
                "Smart Filters: סינון לפי שעה, יום וכיוון.",
                "Deep Links: קישורים לשיתוף ישיר של נסיעות בוואטסאפ."
            ]
        },
        {
            version: "v1.0.0 (MVP)",
            date: "01.12.2025",
            title: "השקה ראשונית",
            details: [
                "הקמת תשתית React & Firebase.",
                "מערכת אימות משתמשים (Auth).",
                "פרסום נסיעות וחיפוש בסיסי."
            ]
        }
    ];

    useEffect(() => {
        if (initialTab) {
            setActiveTab(initialTab);
        }
    }, [initialTab]);

    const [filterUserRole, setFilterUserRole] = useState<'all' | 'admin' | 'user'>('all');
    const [sortUserDate, setSortUserDate] = useState<'newest' | 'oldest'>('newest');

    const [filterTripDirection, setFilterTripDirection] = useState<'all' | Direction>('all');
    const [filterTripType, setFilterTripType] = useState<'all' | TripType>('all');
    const [filterTripStatus, setFilterTripStatus] = useState<'all' | 'active' | 'closed' | 'full'>('all');

    const [broadcastTitle, setBroadcastTitle] = useState('');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
    const [processingReportId, setProcessingReportId] = useState<string | null>(null);

    useEffect(() => {
        if (user?.isAdmin) {
            fetchData();
        }
    }, [user, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allUsers, allReports, allTrips] = await Promise.all([
                db.getAllUsers(),
                db.getReports(),
                db.getAllTripsForAdmin()
            ]);
            
            setUsers(allUsers);
            setReports(allReports);
            setTrips(allTrips);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handlePromote = async (targetUser: UserProfile) => {
        if (targetUser.uid === user?.uid) {
            alert(t('error_remove_self_admin'));
            return;
        }

        const newStatus = !targetUser.isAdmin;
        if (confirm(newStatus ? t('confirm_promote') : t('confirm_demote'))) {
            try {
                await db.updateUserRole(targetUser.uid, newStatus);
                setUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, isAdmin: newStatus } : u));
            } catch (e) {
                alert(t('error_generic'));
            }
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        if (deletingUser.uid === user?.uid) return;
        try {
            await db.deleteUserProfile(deletingUser.uid);
            setUsers(prev => prev.filter(u => u.uid !== deletingUser.uid));
            setDeletingUser(null);
        } catch (e) {
            alert(t('error_generic'));
        }
    };

    const handleDeleteTrip = async (tripId: string) => {
        if (confirm(t('confirm_delete_trip_admin'))) {
            try {
                await db.cancelTrip(tripId);
                setTrips(prev => prev.filter(t => t.id !== tripId));
            } catch (e) {
                alert(t('error_generic'));
            }
        }
    };

    const promptDeleteReport = (e: React.MouseEvent, reportId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDeletingReportId(reportId);
    };

    const confirmDeleteReport = async () => {
        if (!deletingReportId) return;
        setProcessingReportId(deletingReportId);
        try {
            await db.deleteReport(deletingReportId);
            setReports(prev => prev.filter(r => r.id !== deletingReportId));
        } catch (error) {
            console.error(error);
            alert(t('error_generic'));
        } finally {
            setProcessingReportId(null);
            setDeletingReportId(null);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setIsBroadcasting(true);
        try {
            await db.broadcastNotification(broadcastTitle.trim() || 'admin_update_title', broadcastMsg);
            setBroadcastMsg('');
            setBroadcastTitle('');
            alert(t('broadcast_sent'));
        } catch (e: any) {
            alert(t('error_generic'));
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleResolveReport = async (report: Report) => {
        try {
            await db.resolveReport(report);
            setReports(prev => prev.map(r => r.id === report.id ? { ...r, status: 'resolved' } : r));
        } catch (e) {
            alert(t('error_generic'));
        }
    };

    const getDirectionLabel = (direction: string) => {
        if (direction === Direction.YOKNEAM_TO_BINYAMINA) return t('yokneam_to_binyamina');
        if (direction === Direction.BINYAMINA_TO_YOKNEAM) return t('binyamina_to_yokneam');
        return direction;
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            const matchesSearch = (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (u.phoneNumber?.includes(searchTerm));
            if (!matchesSearch) return false;
            if (filterUserRole === 'admin' && !u.isAdmin) return false;
            if (filterUserRole === 'user' && u.isAdmin) return false;
            return true;
        }).sort((a, b) => {
            const timeA = a.createdAt?.toMillis() || 0;
            const timeB = b.createdAt?.toMillis() || 0;
            return sortUserDate === 'newest' ? timeB - timeA : timeA - timeB;
        });
    }, [users, searchTerm, filterUserRole, sortUserDate]);

    const filteredTrips = useMemo(() => {
        return trips.filter(trip => {
            if (filterTripDirection !== 'all' && trip.direction !== filterTripDirection) return false;
            if (filterTripType !== 'all' && trip.type !== filterTripType) return false;
            if (filterTripStatus === 'closed' && !trip.isClosed) return false;
            if (filterTripStatus === 'active' && (trip.isClosed || trip.availableSeats <= 0)) return false;
            if (filterTripStatus === 'full' && trip.availableSeats > 0) return false;
            return true;
        });
    }, [trips, filterTripDirection, filterTripType, filterTripStatus]);

    const stats = useMemo(() => {
        const now = new Date();
        const activeTrips = trips.filter(t => !t.isClosed && t.departureTime.toDate() > now).length;
        const totalOffers = trips.filter(t => t.type === 'offer').length;
        const totalRequests = trips.filter(t => t.type === 'request').length;
        const openReports = reports.filter(r => r.status === 'open').length;
        return { activeTrips, totalOffers, totalRequests, openReports };
    }, [trips, reports]);

    if (!user?.isAdmin) return <div className="p-8 text-center text-red-500 font-bold">{t('access_denied')}</div>;

    const tabs = [
        { id: 'stats', icon: Activity, label: t('admin_tab_stats') },
        { id: 'users', icon: Users, label: t('admin_tab_users') },
        { id: 'trips', icon: CarFront, label: t('admin_tab_trips') },
        { id: 'reports', icon: MessageSquare, label: t('admin_tab_reports') },
        { id: 'changelog', icon: History, label: t('admin_tab_changelog') },
        { id: 'broadcast', icon: Send, label: t('admin_tab_broadcast') }
    ];

    return (
        <div className="animate-fade-in w-full pb-32 px-1 overflow-x-hidden">
            {/* Header Area */}
            <div className="mb-4 sm:mb-6 flex items-center gap-3 px-2 sm:px-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-xl text-red-600 dark:text-red-400 shrink-0">
                    <Shield size={24} />
                </div>
                <div className="min-w-0">
                    <h2 className="text-lg sm:text-2xl font-black text-slate-800 dark:text-white leading-tight truncate">{t('admin_panel')}</h2>
                    <p className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{t('admin_subtitle')}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-2 sm:px-4 mb-6 sm:mb-8 overflow-x-auto scrollbar-hide">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl gap-1 min-w-[350px] sm:min-w-0">
                    {tabs.map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex-1 py-2 sm:py-3 px-1 rounded-xl text-[9px] sm:text-[10px] font-black transition-all flex flex-col items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <tab.icon size={16} />
                            <span className="truncate w-full text-center">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="px-2 sm:px-4 w-full">
                {activeTab === 'stats' && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Primary Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('stat_total_users')}</div>
                                <div className="text-3xl font-black text-slate-800 dark:text-white flex items-end gap-2">
                                    {users.length}
                                    <span className="text-xs text-emerald-500 font-bold mb-1.5 flex items-center"><TrendingUp size={12} className="mr-0.5" /> +12%</span>
                                </div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('stat_active_trips')}</div>
                                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.activeTrips}</div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('report_status_open')}</div>
                                <div className="text-3xl font-black text-amber-500">{stats.openReports}</div>
                            </div>

                            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
                                <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{t('stat_total_trips')}</div>
                                <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{trips.length}</div>
                            </div>
                        </div>

                        {/* Detailed Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><CarFront size={18} className="text-indigo-500"/> {t('stat_trip_distribution')}</h4>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl text-center">
                                        <div className="text-2xl font-black text-indigo-600">{stats.totalOffers}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('tab_offers')}</div>
                                    </div>
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-900 p-3 rounded-2xl text-center">
                                        <div className="text-2xl font-black text-orange-500">{stats.totalRequests}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">{t('tab_requests')}</div>
                                    </div>
                                </div>
                                {/* Visual Bar */}
                                <div className="mt-4 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex">
                                    <div className="bg-indigo-500 h-full" style={{ width: `${(stats.totalOffers / (stats.totalOffers + stats.totalRequests || 1)) * 100}%` }}></div>
                                    <div className="bg-orange-500 h-full flex-1"></div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-[2rem] shadow-lg">
                                <h4 className="font-bold mb-4 flex items-center gap-2"><Server size={18} className="text-blue-400"/> {t('stat_system_health')}</h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">{t('stat_db_status')}</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> {t('status_online')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">{t('stat_auth_status')}</span>
                                        <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={14}/> {t('status_operational')}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-400">{t('stat_storage')}</span>
                                        <span className="text-blue-400 font-bold">12%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-3">
                            <div className="relative">
                                <Search className={`absolute ${dir === 'rtl' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400`} size={12} />
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder={t('search_users')} className={`w-full ${dir === 'rtl' ? 'pr-8 pl-2' : 'pl-8 pr-2'} h-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium text-xs`} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <select value={filterUserRole} onChange={(e) => setFilterUserRole(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9 px-2 outline-none">
                                    <option value="all">{t('filter_user_role_all')}</option>
                                    <option value="admin">{t('filter_user_role_admin')}</option>
                                    <option value="user">{t('filter_user_role_user')}</option>
                                </select>
                                <select value={sortUserDate} onChange={(e) => setSortUserDate(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9 px-2 outline-none">
                                    <option value="newest">{t('filter_user_sort_newest')}</option>
                                    <option value="oldest">{t('filter_user_sort_oldest')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="text-center py-10"><div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div></div>
                            ) : filteredUsers.map(u => (
                                <div key={u.uid} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shrink-0 shadow-sm ${u.isAdmin ? 'bg-gradient-to-tr from-red-500 to-rose-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                                            {u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-2xl object-cover" /> : u.displayName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="font-bold text-slate-800 dark:text-white truncate text-sm">{u.displayName}</span>
                                                {u.isAdmin && <Shield size={12} className="text-red-500 shrink-0" />}
                                            </div>
                                            <span className="text-[10px] text-slate-500 truncate">{u.email}</span>
                                            <span className="text-[10px] text-indigo-500 font-bold mt-0.5">{u.phoneNumber}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-50 dark:border-slate-700/50">
                                        <button onClick={() => handlePromote(u)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-xs transition-all ${u.isAdmin ? 'text-orange-600 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20'}`}>
                                            {u.isAdmin ? <><Unlock size={14} /> {t('demote')}</> : <><Shield size={14} /> {t('promote')}</>}
                                        </button>
                                        <button onClick={() => setDeletingUser(u)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0 border border-red-100 dark:border-red-900/20">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'trips' && (
                    <div className="animate-fade-in space-y-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm space-y-4">
                            <h3 className="font-black text-slate-800 dark:text-white text-[10px] sm:text-xs flex items-center gap-2 uppercase tracking-widest"><ClipboardList size={16} className="text-indigo-600" /> {t('trip_inspector_title')}</h3>
                            <div className="flex flex-col gap-2.5">
                                <select value={filterTripDirection} onChange={(e) => setFilterTripDirection(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9 px-2 outline-none">
                                    <option value="all">{t('filter_direction_all')}</option>
                                    <option value={Direction.YOKNEAM_TO_BINYAMINA}>{t('yokneam_to_binyamina')}</option>
                                    <option value={Direction.BINYAMINA_TO_YOKNEAM}>{t('binyamina_to_yokneam')}</option>
                                </select>
                                <div className="grid grid-cols-2 gap-2">
                                    <select value={filterTripType} onChange={(e) => setFilterTripType(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9 px-2 outline-none">
                                        <option value="all">{t('filter_type_all')}</option>
                                        <option value="offer">{t('tab_offers')}</option>
                                        <option value="request">{t('tab_requests')}</option>
                                    </select>
                                    <select value={filterTripStatus} onChange={(e) => setFilterTripStatus(e.target.value as any)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl h-9 px-2 outline-none">
                                        <option value="all">{t('filter_status_all')}</option>
                                        <option value="active">{t('filter_status_active')}</option>
                                        <option value="closed">{t('filter_status_closed')}</option>
                                        <option value="full">{t('filter_status_full')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredTrips.map(trip => (
                                <div key={trip.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm min-w-0">
                                    <div className="flex justify-between items-start mb-3 min-w-0">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${trip.type === 'offer' ? 'bg-indigo-500' : 'bg-orange-500'}`}>
                                                {trip.type === 'offer' ? <CarFront size={20} /> : <User size={20} />}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-black text-slate-800 dark:text-white text-xs truncate break-words">{trip.driverName}</div>
                                                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                                    <Clock size={12} />
                                                    {trip.departureTime.toDate().toLocaleString([], { hour: '2-digit', minute:'2-digit', day:'numeric', month:'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => handleDeleteTrip(trip.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shrink-0">
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase">
                                            <MapPin size={12} className="text-indigo-500 shrink-0" />
                                            <span className="truncate">{trip.pickupLocation ? t(trip.pickupLocation) : 'No Loc'}</span>
                                        </div>
                                        <div className="flex items-center justify-between min-w-0 gap-2">
                                            <div className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 truncate">
                                                <ChevronRight size={12} className={dir === 'rtl' ? 'rotate-180' : ''} />
                                                <span className="truncate">{getDirectionLabel(trip.direction)}</span>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                {trip.isClosed && <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{t('filter_status_closed')}</span>}
                                                {trip.availableSeats === 0 && !trip.isClosed && <span className="bg-red-100 dark:bg-red-900/30 text-red-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">{t('filter_status_full')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'changelog' && (
                    <div className="animate-fade-in space-y-6">
                        {/* Changelog Header Card */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-3xl rounded-full"></div>
                             <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
                             <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <History size={28} className="text-indigo-400" />
                                    <h3 className="text-2xl font-black tracking-tight">{t('changelog_title')}</h3>
                                </div>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-80">{t('changelog_desc')}</p>
                             </div>
                        </div>

                        {/* Timeline */}
                        <div className="relative pl-4 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700/50">
                            {CHANGELOG_DATA.map((log, index) => (
                                <div key={index} className="relative pl-8">
                                    {/* Dot */}
                                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white dark:border-slate-900 ${index === 0 ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'} z-10 shadow-sm`}></div>
                                    
                                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-black uppercase mb-1 ${index === 0 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {log.version}
                                                </span>
                                                <h4 className="font-bold text-slate-800 dark:text-white">{log.title}</h4>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">{log.date}</span>
                                        </div>
                                        <ul className="space-y-2">
                                            {log.details.map((detail, idx) => (
                                                <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 font-medium flex items-start gap-2 leading-relaxed">
                                                    <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-1.5 shrink-0"></div>
                                                    {detail}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="animate-fade-in space-y-4">
                        {reports.length === 0 ? (
                            <div className="flex-1 w-full flex flex-col items-center justify-center py-16">
                                <div className="relative w-full bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-12 px-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-4 text-slate-300 dark:text-slate-500 shrink-0">
                                        <CheckCircle2 size={32} />
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{t('no_reports')}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">Everything is running smoothly!</p>
                                </div>
                            </div>
                        ) : (
                            reports.map(report => (
                                <div key={report.id} className={`p-6 rounded-3xl border flex flex-col gap-4 transition-all overflow-hidden ${report.status === 'resolved' ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${report.type === 'bug' ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30'}`}>
                                                {report.type === 'bug' ? t('report_type_bug') : t('report_type_improvement')}
                                            </span>
                                            {report.status === 'resolved' && (
                                                <span className="bg-emerald-100 text-emerald-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0">
                                                    <CheckCircle2 size={10} /> {t('report_status_resolved')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-400 font-black whitespace-nowrap">{report.createdAt.toDate().toLocaleDateString()}</span>
                                            <button 
                                                onClick={(e) => promptDeleteReport(e, report.id)} 
                                                disabled={processingReportId === report.id} 
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                            >
                                                {processingReportId === report.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-700 dark:text-slate-200 font-bold leading-relaxed italic border-l-4 border-indigo-200 dark:border-indigo-800 pl-4 break-words">{report.description}</p>
                                    <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-700/50 mt-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 border-2 border-white dark:border-slate-600 shadow-sm">
                                                {report.userPhoto ? <img src={report.userPhoto} className="w-full h-full object-cover" /> : <User size={16} className="m-2 text-slate-400" />}
                                            </div>
                                            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{report.userName}</span>
                                        </div>
                                        {report.status === 'open' && (
                                            <button onClick={() => handleResolveReport(report)} className="h-10 px-5 bg-emerald-600 text-white rounded-xl text-[10px] font-black shadow-lg shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition-all shrink-0">
                                                {t('resolve')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* DELETE REPORT MODAL */}
            {deletingReportId && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in" onClick={() => setDeletingReportId(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('delete_report_confirm')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">פעולה זו לא ניתנת לביטול.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingReportId(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">ביטול</button>
                            <button onClick={confirmDeleteReport} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/20">מחק</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete User Confirmation Modal */}
            {deletingUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 animate-fade-in" onClick={() => setDeletingUser(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('delete_user_confirm')}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">Cancel</button>
                            <button onClick={handleDeleteUser} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-600/20">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
