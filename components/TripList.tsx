
import React, { useState, useEffect, useMemo, memo } from 'react';
import { dbInstance } from '../services/firebase';
import { Trip, Direction, TripType } from '../types';
import TripCard from './TripCard';
import { useLocalization } from '../context/LocalizationContext';
import { CarFront, Clock, X, Users, UserCheck } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import TimePickerModal from './TimePickerModal';

interface TripListProps {
    direction: Direction;
    setDirection: (direction: Direction) => void;
    onPostTrip: () => void;
    onEditTrip: (trip: Trip) => void;
}

type FilterDay = 'all' | 'today' | 'tomorrow';

const DaySection = memo(({ title, dayTrips, onEditTrip, onPostTrip }: { title: string, dayTrips: Trip[], onEditTrip: (trip: Trip) => void, onPostTrip: () => void }) => {
    if (dayTrips.length === 0) return null;

    return (
        <div className="mb-6 animate-fade-in w-full">
            <div className="flex items-center gap-3 mb-3 px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{title}</span>
                <div className="h-px bg-slate-100 dark:bg-slate-800 flex-1"></div>
            </div>
            <div className="space-y-4">
                {dayTrips.map(trip => <TripCard key={trip.id} trip={trip} onEdit={onEditTrip} onPostTripClick={onPostTrip} />)}
            </div>
        </div>
    );
});

const TripList: React.FC<TripListProps> = ({ direction, setDirection, onPostTrip, onEditTrip }) => {
    const { t } = useLocalization();
    const { user } = useAuth();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TripType>('offer');
    
    const [filterDay, setFilterDay] = useState<FilterDay>('all');
    const [filterTime, setFilterTime] = useState<string>('');
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

    // NEW: "Heartbeat" state to force re-calculation of expired trips every minute
    const [currentTime, setCurrentTime] = useState(Date.now());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000); // Check every 60 seconds
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(dbInstance, 'trips'),
            where('direction', '==', direction)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTrips = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Trip));
            
            fetchedTrips.sort((a, b) => a.departureTime.toMillis() - b.departureTime.toMillis());
            setTrips(fetchedTrips);
            setLoading(false);
        }, (error) => {
            console.error("Snapshot error:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [direction]);
    
    const isYokneamToBinyamina = direction === Direction.YOKNEAM_TO_BINYAMINA;

    const filteredTrips = useMemo(() => {
        const thirtyMinsInMs = 30 * 60 * 1000;

        return trips.filter(trip => {
            if (trip.type !== activeTab) return false;

            const tripDate = trip.departureTime.toDate();
            const tripTimeMillis = trip.departureTime.toMillis();
            
            // USE currentTime from state to ensure this updates live
            if (currentTime > tripTimeMillis + thirtyMinsInMs) return false;

            const nowObj = new Date(currentTime);
            const today = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate()).getTime();
            const tripDay = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate()).getTime();
            const tomorrow = today + 86400000;

            if (filterDay === 'today' && tripDay !== today) return false;
            if (filterDay === 'tomorrow' && tripDay !== tomorrow) return false;

            if (filterTime) {
                const [h, m] = filterTime.split(':').map(Number);
                const tripH = tripDate.getHours();
                const tripM = tripDate.getMinutes();
                if (tripH < h || (tripH === h && tripM < m)) return false;
            }

            return true;
        });
    }, [trips, activeTab, filterDay, filterTime, currentTime, user?.uid]);

    const grouped = useMemo(() => {
        const groups: { [key: string]: Trip[] } = { today: [], tomorrow: [], upcoming: [] };
        const nowObj = new Date(currentTime);
        const today = new Date(nowObj.getFullYear(), nowObj.getMonth(), nowObj.getDate()).getTime();
        const tomorrow = today + 86400000;
        const dayAfter = tomorrow + 86400000;

        filteredTrips.forEach(trip => {
            const tripDate = trip.departureTime.toDate();
            const tripDayTime = new Date(tripDate.getFullYear(), tripDate.getMonth(), tripDate.getDate()).getTime();
            if (tripDayTime === today) groups.today.push(trip);
            else if (tripDayTime === tomorrow) groups.tomorrow.push(trip);
            else if (tripDayTime >= dayAfter) groups.upcoming.push(trip);
        });
        return groups;
    }, [filteredTrips, currentTime]);

    return (
        <div className="w-full pt-2">
            <TimePickerModal 
                isOpen={isTimePickerOpen} 
                onClose={() => setIsTimePickerOpen(false)} 
                onSelect={setFilterTime}
                initialTime={filterTime || '08:00'}
            />

            <div className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl flex gap-1 mb-6 shadow-inner">
                <button
                    onClick={() => setDirection(Direction.YOKNEAM_TO_BINYAMINA)}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                        isYokneamToBinyamina 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {t('yokneam_to_binyamina')}
                </button>
                <button
                    onClick={() => setDirection(Direction.BINYAMINA_TO_YOKNEAM)}
                    className={`flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${
                        !isYokneamToBinyamina 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                    {t('binyamina_to_yokneam')}
                </button>
            </div>

            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
                <button 
                    onClick={() => setActiveTab('offer')}
                    className={`flex-1 pb-3 text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'offer' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <CarFront size={18} />
                    {t('tab_offers')}
                </button>
                <button 
                    onClick={() => setActiveTab('request')}
                    className={`flex-1 pb-3 text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'request' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Users size={18} />
                    {t('tab_requests')}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3 mb-8">
                 <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['all', 'today', 'tomorrow'] as FilterDay[]).map((d) => (
                        <button 
                            key={d}
                            onClick={() => setFilterDay(d)}
                            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all uppercase tracking-wide ${filterDay === d ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm' : 'text-slate-400'}`}
                        >
                            {t(`day_${d}`)}
                        </button>
                    ))}
                 </div>

                 <button 
                    onClick={() => setIsTimePickerOpen(true)}
                    className="relative flex items-center justify-between bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-xl px-3 h-[46px] transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
                 >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Clock size={16} className={`shrink-0 ${filterTime ? 'text-indigo-500' : 'text-slate-400'}`} />
                        <span className={`text-xs font-black truncate ${filterTime ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                            {filterTime || (activeTab === 'offer' ? t('filter_departure_time') : t('filter_pickup_time'))}
                        </span>
                    </div>
                     
                     {filterTime && (
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setFilterTime('');
                            }} 
                            className="p-1 -mr-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X size={14} />
                        </div>
                    )}
                 </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
            ) : filteredTrips.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4 animate-fade-in">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-indigo-50 dark:bg-indigo-900/10 text-indigo-200`}>
                        {activeTab === 'offer' ? <CarFront size={40} /> : <UserCheck size={40} />}
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">
                        {activeTab === 'offer' ? t('no_trips_title') : t('no_requests_title')}
                    </h3>
                    <p className="text-sm text-slate-500 mb-8 max-w-xs mx-auto font-medium">
                        {activeTab === 'offer' ? t('no_trips_subtitle') : t('no_requests_subtitle')}
                    </p>
                    <button 
                        onClick={() => onEditTrip({ type: activeTab } as any)} 
                        className={`px-8 py-4 text-white font-black rounded-2xl shadow-xl transition-all text-sm uppercase tracking-wider bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95`}
                    >
                        {activeTab === 'offer' ? t('be_the_first') : t('post_request_now')}
                    </button>
                </div>
            ) : (
                <div className="pb-32">
                    <DaySection title={t('day_today')} dayTrips={grouped.today} onEditTrip={onEditTrip} onPostTrip={onPostTrip} />
                    <DaySection title={t('day_tomorrow')} dayTrips={grouped.tomorrow} onEditTrip={onEditTrip} onPostTrip={onPostTrip} />
                    <DaySection title={t('day_upcoming')} dayTrips={grouped.upcoming} onEditTrip={onEditTrip} onPostTrip={onPostTrip} />
                </div>
            )}
        </div>
    );
};

export default TripList;
