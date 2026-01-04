
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { db, dbInstance } from '../services/firebase';
import { Trip, Direction } from '../types';
import { User, Phone, Save, Edit2, Car, MapPin, Upload, Calendar, ArrowLeft, ArrowRight, Globe, CheckCircle2, Clock, Filter, ArrowUpDown } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import BadgeDisplay from './BadgeDisplay';

interface ProfileViewProps {
    onEditTrip: (trip: Trip) => void;
}

// Improved Trip Row Component
const HistoryItem: React.FC<{ trip: Trip }> = ({ trip }) => {
    const { t, language, dir } = useLocalization();
    
    const date = trip.departureTime.toDate();
    const dateStr = date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' });
    const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const isYokneamToBinyamina = trip.direction === Direction.YOKNEAM_TO_BINYAMINA;
    const fromCity = isYokneamToBinyamina ? t('city_yokneam') : t('city_binyamina');
    const toCity = isYokneamToBinyamina ? t('city_binyamina') : t('city_yokneam');
    
    const isClosed = trip.isClosed;
    const isRequest = trip.type === 'request';
    const isOffer = trip.type === 'offer';

    // Status Determination
    let statusColor = "text-slate-500";
    let statusIcon = <Clock size={14} />;
    let statusText = "Active";

    if (isClosed) {
        statusColor = "text-slate-400";
        statusIcon = <CheckCircle2 size={14} />;
        statusText = t('ride_closed');
    } else {
        if (isRequest) {
             statusColor = "text-orange-500";
             statusText = t('trip_type_request');
        } else {
             statusColor = "text-indigo-500";
             statusText = t('trip_type_offer');
        }
    }

    return (
        <div className={`relative flex flex-col p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group`}>
            {/* Left/Right color bar indicator */}
            <div className={`absolute top-0 bottom-0 ${dir === 'rtl' ? 'right-0' : 'left-0'} w-1.5 ${isRequest ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>

            <div className={`flex items-start justify-between ${dir === 'rtl' ? 'mr-3' : 'ml-3'}`}>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wide mb-1">
                        <Calendar size={12} />
                        <span>{dateStr}</span>
                        <span>•</span>
                        <span>{timeStr}</span>
                    </div>

                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-2 text-base font-black text-slate-800 dark:text-white">
                            <span>{fromCity}</span>
                            {dir === 'rtl' ? <ArrowLeft size={16} className="text-slate-300" /> : <ArrowRight size={16} className="text-slate-300" />}
                            <span>{toCity}</span>
                        </div>
                    </div>
                </div>

                <div className={`p-2 rounded-xl ${isRequest ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-500' : 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-500'}`}>
                    {isRequest ? <User size={20} /> : <Car size={20} />}
                </div>
            </div>

            <div className={`flex items-center justify-between mt-4 pt-3 border-t border-slate-50 dark:border-slate-700/50 ${dir === 'rtl' ? 'mr-3' : 'ml-3'}`}>
                 <div className="flex items-center gap-2">
                     <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-md ${isClosed ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : (isRequest ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-600' : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600')}`}>
                        {statusIcon}
                        <span>{statusText}</span>
                     </div>
                 </div>
                 
                 {/* Fixed: Show passenger count for drivers with forced LTR to prevent slash inversion */}
                 {isOffer && trip.passengers && (
                     <div className="flex items-center gap-1 text-slate-400 text-xs font-medium" dir="ltr">
                         <User size={12} />
                         <span>{trip.passengers.filter(p => p.status === 'approved').length} / {trip.availableSeats + trip.passengers.filter(p => p.status === 'approved').length}</span>
                     </div>
                 )}
            </div>
        </div>
    );
};

const ProfileView: React.FC<ProfileViewProps> = ({ onEditTrip }) => {
    const { user, updateProfile } = useAuth();
    const { t, language } = useLocalization();
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.displayName || '');
    const [nameEn, setNameEn] = useState(user?.displayNameEn || '');
    const [phone, setPhone] = useState(user?.phoneNumber || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [stats, setStats] = useState({ given: 0, taken: 0 });
    const [userTrips, setUserTrips] = useState<Trip[]>([]);
    const [historyTab, setHistoryTab] = useState<'driver' | 'passenger'>('driver');
    
    // Filtering and Sorting States
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [filterDirection, setFilterDirection] = useState<'all' | Direction>('all');

    useEffect(() => {
        if (!user) return;

        const q = query(collection(dbInstance, 'trips'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allTrips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
            
            const given = allTrips.filter(t => t.driverId === user.uid && t.type === 'offer').length;
            const taken = allTrips.filter(t => 
                (t.passengers?.some(p => p.uid === user.uid && p.status === 'approved')) || 
                (t.driverId === user.uid && t.type === 'request')
            ).length;
            
            setStats({ given, taken });

            // Fetch all relevant trips for history list
            const myTrips = allTrips.filter(t => t.driverId === user.uid || t.passengers?.some(p => p.uid === user.uid));
            setUserTrips(myTrips);
        });

        return () => unsubscribe();
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhotoURL(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateProfile({ 
                displayName: name, 
                displayNameEn: nameEn || null, 
                phoneNumber: phone, 
                photoURL: photoURL 
            });
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredHistory = userTrips
        .filter(t => {
            // Tab filtering
            if (historyTab === 'driver') {
                if (!(t.driverId === user?.uid && t.type === 'offer')) return false;
            } else {
                const joined = t.passengers?.some(p => p.uid === user?.uid);
                const myRequest = t.driverId === user?.uid && t.type === 'request';
                if (!(joined || myRequest)) return false;
            }

            // Direction filtering
            if (filterDirection !== 'all' && t.direction !== filterDirection) return false;

            return true;
        })
        .sort((a, b) => {
            const timeA = a.departureTime.toMillis();
            const timeB = b.departureTime.toMillis();
            return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
        });

    if (!user) return null;

    return (
        <div className="animate-fade-in space-y-6 w-full pb-20">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">{t('menu_profile')}</h2>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex flex-col items-center">
                    <div className="relative group cursor-pointer mb-6" onClick={() => isEditing && fileInputRef.current?.click()}>
                        {photoURL ? (
                             <img src={photoURL} alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-indigo-50 dark:ring-slate-700" />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-indigo-50 dark:ring-slate-700">
                                {user.displayName?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="text-white" size={20} />
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                    </div>

                    {isEditing ? (
                        <div className="w-full space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('full_name')}</label>
                                <div className="relative">
                                    <User className={`absolute top-3.5 ${language === 'he' ? 'right-3' : 'left-3'} text-slate-400`} size={18} />
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={`w-full ${language === 'he' ? 'pr-10 pl-3' : 'pl-10 pr-3'} p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium`} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('full_name_en')}</label>
                                <div className="relative">
                                    <Globe className={`absolute top-3.5 ${language === 'he' ? 'right-3' : 'left-3'} text-slate-400`} size={18} />
                                    <input 
                                        type="text" 
                                        value={nameEn} 
                                        onChange={(e) => setNameEn(e.target.value)} 
                                        placeholder="Israel Israeli" 
                                        className={`w-full ${language === 'he' ? 'pr-10 pl-3' : 'pl-10 pr-3'} p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium`}
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t('phone_number')}</label>
                                <div className="relative">
                                    <Phone className={`absolute top-3.5 ${language === 'he' ? 'right-3' : 'left-3'} text-slate-400`} size={18} />
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={`w-full ${language === 'he' ? 'pr-10 pl-3' : 'pl-10 pr-3'} p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-medium text-start`} />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm">{t('profile_cancel')}</button>
                                <button onClick={handleSave} disabled={loading} className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md flex justify-center items-center">
                                    {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={18} className="me-2" />}
                                    {t('profile_save')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center w-full flex flex-col items-center">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{language === 'en' && user.displayNameEn ? user.displayNameEn : user.displayName}</h3>
                            <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-3">{user.phoneNumber}</p>
                            
                            {/* Badges */}
                            <div className="mb-5">
                                <BadgeDisplay userId={user.uid} size="lg" />
                            </div>

                            <button onClick={() => setIsEditing(true)} className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50"><Edit2 size={16} />{t('profile_edit')}</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-blue-100 dark:border-slate-700 flex flex-col items-center justify-center">
                    <Car size={24} className="text-blue-600 mb-2" />
                    <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.given}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t('stats_rides_given')}</div>
                </div>
                <div className="bg-purple-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-purple-100 dark:border-slate-700 flex flex-col items-center justify-center">
                    <MapPin size={24} className="text-purple-600 mb-2" />
                    <div className="text-3xl font-black text-slate-800 dark:text-white">{stats.taken}</div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t('stats_trips_taken')}</div>
                </div>
            </div>

            <div className="mt-8">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 px-1">{t('history_title')}</h3>
                 
                 <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4">
                    <button onClick={() => setHistoryTab('driver')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${historyTab === 'driver' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>{t('history_tab_driver')}</button>
                    <button onClick={() => setHistoryTab('passenger')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${historyTab === 'passenger' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>{t('history_tab_passenger')}</button>
                 </div>

                 {/* Filters */}
                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="relative min-w-[120px]">
                        <div className="absolute top-2.5 left-2.5 pointer-events-none text-slate-400"><ArrowUpDown size={14} /></div>
                        <select 
                            value={sortOrder} 
                            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg py-2.5 pl-8 pr-2 outline-none appearance-none cursor-pointer"
                        >
                            <option value="newest">{t('sort_newest')}</option>
                            <option value="oldest">{t('sort_oldest')}</option>
                        </select>
                    </div>
                    <div className="relative min-w-[140px] flex-1">
                        <div className="absolute top-2.5 left-2.5 pointer-events-none text-slate-400"><Filter size={14} /></div>
                        <select 
                            value={filterDirection} 
                            onChange={(e) => setFilterDirection(e.target.value as any)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg py-2.5 pl-8 pr-2 outline-none appearance-none cursor-pointer"
                        >
                            <option value="all">{t('filter_direction_all')}</option>
                            <option value={Direction.YOKNEAM_TO_BINYAMINA}>{t('yokneam_to_binyamina')}</option>
                            <option value={Direction.BINYAMINA_TO_YOKNEAM}>{t('binyamina_to_yokneam')}</option>
                        </select>
                    </div>
                 </div>

                 <div className="space-y-4">
                     {filteredHistory.length === 0 ? (
                         <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm flex flex-col items-center gap-2">
                             <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-1">
                                 <Clock size={24} />
                             </div>
                             {t('history_empty')}
                         </div>
                     ) : (
                         filteredHistory.map(trip => <HistoryItem key={trip.id} trip={trip} />)
                     )}
                 </div>
            </div>
        </div>
    );
};

export default ProfileView;
