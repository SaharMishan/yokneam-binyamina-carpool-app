
import React, { useEffect, useState, useMemo } from 'react';
import { dbInstance } from '../services/firebase';
import { Trip, TripType } from '../types';
import TripCard from './TripCard';
import { useLocalization } from '../context/LocalizationContext';
import { CalendarDays, Plus, CarFront, Users, Filter, ArrowUpDown, Compass } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';

interface ScheduleViewProps {
    onEditTrip: (trip: Trip) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ onEditTrip }) => {
    const { t, language } = useLocalization();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    
    // Filtering states
    const [activeTab, setActiveTab] = useState<'all' | TripType>('all');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    
    // Generate working days (Sun-Thu)
    const dates = useMemo(() => {
        const result = [];
        let d = new Date();
        d.setHours(0,0,0,0);
        
        let daysAdded = 0;
        while (daysAdded < 5) {
            const dayOfWeek = d.getDay(); 
            if (dayOfWeek !== 5 && dayOfWeek !== 6) {
                result.push(new Date(d));
                daysAdded++;
            }
            d.setDate(d.getDate() + 1);
        }
        return result;
    }, []);

    useEffect(() => {
        const today = new Date();
        const day = today.getDay();
        if (day === 5 || day === 6) {
            const nextSun = new Date(today);
            nextSun.setDate(today.getDate() + (day === 5 ? 2 : 1));
            setSelectedDate(nextSun);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(dbInstance, 'trips'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTrips = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Trip));
            
            setTrips(fetchedTrips);
            setLoading(false);
        }, (error) => {
            console.error("Schedule snapshot error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredTrips = useMemo(() => {
        const nowTime = new Date().getTime();
        const thirtyMinsInMs = 30 * 60 * 1000;

        return trips.filter(trip => {
            const tripDate = trip.departureTime.toDate();
            
            // 1. Date check
            const isSameDay = tripDate.getDate() === selectedDate.getDate() &&
                            tripDate.getMonth() === selectedDate.getMonth() &&
                            tripDate.getFullYear() === selectedDate.getFullYear();
            
            if (!isSameDay) return false;

            // 2. 30-min Grace Period check
            if (nowTime > trip.departureTime.toMillis() + thirtyMinsInMs) return false;
            
            // 3. Tab Filter
            if (activeTab !== 'all' && trip.type !== activeTab) return false;

            return true;
        }).sort((a, b) => {
            const timeA = a.departureTime.toMillis();
            const timeB = b.departureTime.toMillis();
            return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
        });
    }, [trips, selectedDate, activeTab, sortOrder]);

    const getCountText = () => {
        const offers = filteredTrips.filter(t => t.type === 'offer').length;
        const requests = filteredTrips.filter(t => t.type === 'request').length;
        
        if (offers === 0 && requests === 0) return '';
        
        const parts = [];
        if (offers > 0) {
            const key = offers === 1 ? 'ride_count_single' : 'ride_count_plural';
            parts.push(t(key).replace('{count}', offers.toString()));
        }
        if (requests > 0) {
            const key = requests === 1 ? 'request_count_single' : 'request_count_plural';
            parts.push(t(key).replace('{count}', requests.toString()));
        }
        return parts.join(', ');
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
                 <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col animate-fade-in min-h-[calc(100dvh-180px)] overflow-x-hidden">
            <div className="flex items-center gap-2 mb-4 pt-1 px-1 shrink-0">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                    <CalendarDays size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight break-words">
                    {t('menu_schedule')}
                </h3>
            </div>

            <div className="mb-6 w-full shrink-0">
                <div className="grid grid-cols-5 gap-2 w-full">
                    {dates.map((date, idx) => {
                        const isSelected = date.getDate() === selectedDate.getDate() && date.getMonth() === selectedDate.getMonth();
                        const isToday = new Date().getDate() === date.getDate() && new Date().getMonth() === date.getMonth();
                        
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedDate(date)}
                                className={`relative flex flex-col items-center justify-center py-3 rounded-xl transition-all duration-200 border ${
                                    isSelected 
                                    ? 'bg-indigo-600 text-white border-transparent shadow-md transform scale-[1.02]' 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 active:bg-slate-50'
                                }`}
                            >
                                <span className={`text-[10px] font-bold uppercase tracking-tighter leading-none mb-1 ${isSelected ? 'opacity-90' : 'opacity-60'}`}>
                                    {date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' })}
                                </span>
                                <span className="text-lg font-black leading-none">{date.getDate()}</span>
                                {isToday && !isSelected && (
                                    <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                 <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('departure_date')}</span>
                     <span className="text-lg font-black text-slate-800 dark:text-white">
                        {selectedDate.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                     </span>
                 </div>
                 {filteredTrips.length > 0 && (
                     <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-lg text-[11px] font-black shadow-sm whitespace-nowrap">
                        {getCountText()}
                     </span>
                 )}
            </div>

            {/* Filters Row */}
            <div className="flex gap-2 mb-4 shrink-0 overflow-x-auto pb-2 scrollbar-hide items-center h-10">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg h-full items-center">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`h-full px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center ${activeTab === 'all' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        {t('filter_all')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('offer')}
                        className={`h-full px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'offer' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        <CarFront size={14} />
                        {t('tab_offers')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('request')}
                        className={`h-full px-3 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'request' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' : 'text-slate-500'}`}
                    >
                        <Users size={14} />
                        {t('tab_requests')}
                    </button>
                </div>

                <div className="relative h-full shrink-0">
                    <div className="absolute top-1/2 -translate-y-1/2 left-2.5 pointer-events-none text-slate-400"><ArrowUpDown size={12} /></div>
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="h-full bg-slate-100 dark:bg-slate-800 border-none text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg pl-8 pr-2 outline-none appearance-none cursor-pointer min-w-[100px] focus:ring-2 focus:ring-indigo-500/20"
                    >
                        <option value="asc">{t('sort_time_asc')}</option>
                        <option value="desc">{t('sort_time_desc')}</option>
                    </select>
                </div>
            </div>

            <div className="w-full flex-1 flex flex-col relative">
                {filteredTrips.length === 0 ? (
                    <div className="flex-1 w-full flex flex-col items-center justify-center py-8">
                         <div className="relative w-full bg-white dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 py-8 px-6 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mb-3 text-slate-300 dark:text-slate-500 shrink-0">
                                <Compass size={24} strokeWidth={1.5} />
                            </div>
                            <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">{t('no_trips_schedule')}</h4>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-6">
                                {t('no_trips_subtitle')}
                            </p>
                            
                            <button 
                                onClick={() => onEditTrip({ type: activeTab === 'all' ? 'offer' : activeTab } as any)} 
                                className="px-6 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                <Plus size={16} />
                                {t('post_a_trip')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 pb-24 w-full">
                        {filteredTrips.map(trip => <TripCard key={trip.id} trip={trip} onEdit={onEditTrip} />) || null}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleView;
