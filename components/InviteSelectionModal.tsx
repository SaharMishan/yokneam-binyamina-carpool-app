
import React, { useState, useEffect } from 'react';
import { Trip, Direction } from '../types';
import { db, dbInstance } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { X, Clock, Calendar, AlertCircle, Plus, Loader2, ArrowLeft, ArrowRight, User, MapPin, Navigation } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface InviteSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    passengerId: string;
    passengerName: string;
    direction: Direction;
    onInviteSent: () => void;
    onPostTripClick: () => void;
}

const InviteSelectionModal: React.FC<InviteSelectionModalProps> = ({ 
    isOpen, 
    onClose, 
    passengerId, 
    passengerName, 
    direction, 
    onInviteSent,
    onPostTripClick
}) => {
    const { t, language, dir } = useLocalization();
    const { user } = useAuth();
    const [rides, setRides] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [passengerIsBusy, setPassengerIsBusy] = useState(false);

    useEffect(() => {
        const checkAvailability = async () => {
            if (!isOpen || !user) return;
            setLoading(true);
            setPassengerIsBusy(false);

            try {
                // 1. Check if passenger is already approved for ANY trip in this direction on the SAME DAY
                const tripsRef = collection(dbInstance, 'trips');
                const qBusy = query(
                    tripsRef,
                    where('direction', '==', direction)
                );
                const busySnap = await getDocs(qBusy);
                const isBusy = busySnap.docs.some(doc => {
                    const data = doc.data() as Trip;
                    const isApproved = data.passengers?.some(p => p.uid === passengerId && p.status === 'approved');
                    return isApproved;
                });

                if (isBusy) {
                    setPassengerIsBusy(true);
                    setLoading(false);
                    return;
                }

                // 2. Load driver's active offers
                const fetchedRides = await db.getDriverActiveOffers(user.uid, direction);
                setRides(fetchedRides);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        checkAvailability();
    }, [isOpen, user, direction, passengerId]);

    const handleInvite = async (trip: Trip) => {
        if (!user || invitingId || passengerIsBusy) return;
        setInvitingId(trip.id);
        try {
            await db.sendSpecificTripInvitation(user.displayName || 'Driver', passengerId, trip);
            onInviteSent();
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setInvitingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-white/20" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex flex-col">
                        <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">{t('invite_to_ride')}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">{passengerName}</p>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-400 shadow-sm transition-all active:scale-90">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 max-h-[65vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 size={32} className="text-indigo-600 animate-spin" />
                            <span className="text-xs font-bold text-slate-400 animate-pulse uppercase tracking-widest">Searching...</span>
                        </div>
                    ) : passengerIsBusy ? (
                        <div className="text-center py-8 animate-fade-in">
                            <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 border-4 border-white dark:border-slate-800 shadow-inner">
                                <AlertCircle size={40} />
                            </div>
                            <h4 className="text-slate-800 dark:text-white font-black text-lg mb-2">{t('passenger_busy_error')}</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 font-medium px-4">הנוסע כבר שובץ לנסיעה אחרת באותו כיוון וזמן.</p>
                            <button 
                                onClick={onClose} 
                                className="w-full h-14 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all active:scale-95"
                            >
                                סגור
                            </button>
                        </div>
                    ) : rides.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300 dark:text-indigo-500/50 border-4 border-white dark:border-slate-800 shadow-inner">
                                <AlertCircle size={40} />
                            </div>
                            <h4 className="text-slate-800 dark:text-white font-black text-lg mb-2">{t('no_active_rides_to_invite')}</h4>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium px-4">{t('no_trips_subtitle')}</p>
                            <button 
                                onClick={() => { onPostTripClick(); onClose(); }} 
                                className="w-full h-14 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/30 active:scale-95"
                            >
                                <Plus size={20} />
                                {t('post_a_trip')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">{t('select_trip_to_invite')}</p>
                            {rides.map(ride => {
                                const dateObj = ride.departureTime.toDate();
                                const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                                const dateStr = dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' });
                                const dayName = dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
                                const isBeingInvited = invitingId === ride.id;
                                
                                const isYokneamToBinyamina = ride.direction === Direction.YOKNEAM_TO_BINYAMINA;
                                const fromCity = isYokneamToBinyamina ? t('city_yokneam') : t('city_binyamina');
                                const toCity = isYokneamToBinyamina ? t('city_binyamina') : t('city_yokneam');

                                return (
                                    <button 
                                        key={ride.id}
                                        onClick={() => handleInvite(ride)}
                                        disabled={!!invitingId}
                                        className="w-full p-5 rounded-[1.5rem] border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col gap-4 group shadow-sm active:scale-[0.98]"
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-4">
                                                <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-700 w-14 h-14 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 group-hover:shadow-indigo-500/10 transition-all">
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase leading-none mb-1">{dayName}</span>
                                                    <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{timeStr}</span>
                                                </div>
                                                <div className="flex flex-col items-start text-start">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <Calendar size={12} className="text-slate-400" />
                                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{dateStr}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={12} className="text-emerald-500" />
                                                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{ride.availableSeats} {t('available_seats')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`p-3 rounded-xl transition-all ${isBeingInvited ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:translate-x-1 rtl:group-hover:-translate-x-1'}`}>
                                                {isBeingInvited ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : (dir === 'rtl' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InviteSelectionModal;
