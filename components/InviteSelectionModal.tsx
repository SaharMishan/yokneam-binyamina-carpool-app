
import React, { useState, useEffect } from 'react';
import { Trip, Direction } from '../types';
import { db, dbInstance } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { X, Clock, Calendar, AlertCircle, Plus, Loader2, ArrowLeft, ArrowRight, User, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import Portal from './Portal';

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
    const [passengerApprovedDates, setPassengerApprovedDates] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [invitingId, setInvitingId] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsSuccess(false);
            setInvitingId(null);
        }
    }, [isOpen]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!isOpen || !user) return;
            setLoading(true);

            try {
                // 1. Fetch all trips where this passenger is already APPROVED (future ones)
                const now = new Date();
                const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
                
                const tripsRef = collection(dbInstance, 'trips');
                const qApproved = query(
                    tripsRef,
                    where('direction', '==', direction)
                );
                
                const approvedSnap = await getDocs(qApproved);
                const dates = new Set<string>();
                
                approvedSnap.docs.forEach(doc => {
                    const data = doc.data() as Trip;
                    const depTime = data.departureTime.toDate();
                    if (depTime >= thirtyMinsAgo) {
                        const isApproved = data.passengers?.some(p => p.uid === passengerId && p.status === 'approved');
                        if (isApproved) {
                            dates.add(depTime.toDateString());
                        }
                    }
                });
                setPassengerApprovedDates(dates);

                // 2. Load driver's active offers
                const fetchedRides = await db.getDriverActiveOffers(user.uid, direction);
                setRides(fetchedRides);
            } catch (err) {
                console.error("Error loading invite selection data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [isOpen, user, direction, passengerId]);

    const handleInvite = async (trip: Trip) => {
        if (!user || invitingId) return;
        setInvitingId(trip.id);
        try {
            await db.sendSpecificTripInvitation(user.displayName || 'Driver', passengerId, trip);
            setIsSuccess(true);
            onInviteSent();
            // Automatically close after 2 seconds on success
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error("Invite sending error:", error);
        } finally {
            setInvitingId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-white/20 flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                    
                    {isSuccess ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center animate-fade-in">
                            <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-xl animate-float">
                                <CheckCircle2 size={56} />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">ההזמנה נשלחה!</h3>
                            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                שלחנו הודעה ל{passengerName}.<br/>ברגע שהוא יאשר, תקבל על כך עדכון.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                                <div className="flex flex-col text-start">
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white leading-tight">{t('invite_to_ride')}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">מציע ל: {passengerName}</p>
                                </div>
                                <button onClick={onClose} className="p-2.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-400 shadow-sm transition-all active:scale-90 bg-white/50 dark:bg-slate-800">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 size={32} className="text-indigo-600 animate-spin" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">בודק נסיעות זמינות...</span>
                                    </div>
                                ) : rides.length === 0 ? (
                                    <div className="text-center py-12 px-4">
                                        <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-300 dark:text-indigo-500/50 border-4 border-white dark:border-slate-800 shadow-inner">
                                            <AlertCircle size={40} />
                                        </div>
                                        <h4 className="text-slate-800 dark:text-white font-black text-lg mb-2">{t('no_active_rides_to_invite')}</h4>
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 font-medium">לא מצאנו נסיעה פעילה שפורסמה לכיוון זה בשבוע הקרוב.</p>
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
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 text-start">{t('select_trip_to_invite')}</p>
                                        {rides.map(ride => {
                                            const dateObj = ride.departureTime.toDate();
                                            const dateStr = dateObj.toDateString();
                                            const isBusyOnThisDay = passengerApprovedDates.has(dateStr);
                                            
                                            const timeStr = dateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
                                            const displayDate = dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' });
                                            const dayName = dateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
                                            const isBeingInvited = invitingId === ride.id;

                                            return (
                                                <button 
                                                    key={ride.id}
                                                    onClick={() => !isBusyOnThisDay && handleInvite(ride)}
                                                    disabled={!!invitingId || isBusyOnThisDay}
                                                    className={`w-full p-5 rounded-[1.8rem] border-2 transition-all flex flex-col gap-4 group shadow-sm active:scale-[0.98] text-start ${
                                                        isBusyOnThisDay 
                                                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800 opacity-60 grayscale cursor-not-allowed' 
                                                        : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-indigo-500 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between w-full">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 w-14 h-14 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all ${!isBusyOnThisDay ? 'group-hover:bg-white group-hover:shadow-indigo-500/10' : ''}`}>
                                                                <span className={`text-[10px] font-black ${isBusyOnThisDay ? 'text-slate-400' : 'text-indigo-500'} uppercase leading-none mb-1`}>{dayName}</span>
                                                                <span className="text-xl font-black text-slate-800 dark:text-white leading-none">{timeStr}</span>
                                                            </div>
                                                            <div className="flex flex-col items-start min-w-0">
                                                                <div className="flex items-center gap-1.5 mb-1">
                                                                    <Calendar size={12} className="text-slate-400" />
                                                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{displayDate}</span>
                                                                </div>
                                                                {isBusyOnThisDay ? (
                                                                    <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800">
                                                                        <AlertCircle size={10} className="text-amber-500" />
                                                                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">{t('passenger_busy_error')}</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <User size={12} className="text-emerald-500" />
                                                                        <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">{ride.availableSeats} {t('available_seats')}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {!isBusyOnThisDay && (
                                                            <div className={`p-3 rounded-xl transition-all ${isBeingInvited ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 group-hover:translate-x-1 rtl:group-hover:-translate-x-1'}`}>
                                                                {isBeingInvited ? <Loader2 size={18} className="animate-spin text-indigo-600" /> : (dir === 'rtl' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Portal>
    );
};

export default InviteSelectionModal;
