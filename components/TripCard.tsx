
import React, { useState, memo, useEffect } from 'react';
import { Trip, Passenger, Direction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTripContact } from '../hooks/useTripContact';
import { db, dbInstance } from '../services/firebase';
import { 
    Phone, MessageCircle, Trash2, Edit3, MapPin, Loader2, 
    User, LogOut, CarFront, Clock, UserPlus, 
    ShieldCheck, ChevronRight, UserCheck, Unlock, Lock, Navigation, AlertTriangle, Bell, Send, CheckCircle, Info
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import ChatModal from './ChatModal';
import JoinPickupModal from './JoinPickupModal';
import InviteSelectionModal from './InviteSelectionModal';
import Portal from './Portal';

interface TripCardProps {
    trip: Trip;
    onEdit?: (trip: Trip) => void;
    onPostTripClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onEdit, onPostTripClick }) => {
    const { user, firebaseUser } = useAuth();
    const { t, dir, language } = useLocalization();
    const { driverProfile, driverPhoneNumber } = useTripContact(trip);
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [isAlreadyAssigned, setIsAlreadyAssigned] = useState(false);
    
    const [selectedPassenger, setSelectedPassenger] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const currentUserId = user?.uid || firebaseUser?.uid || '';
    const isOwner = currentUserId === trip.driverId;
    const myPassengerData = trip.passengers?.find(p => p.uid === currentUserId);
    const isApproved = myPassengerData?.status === 'approved';
    const isPending = myPassengerData?.status === 'pending';
    
    const isRequest = trip.type === 'request';
    const canChat = (isOwner || isApproved) && !isRequest; 

    const approvedPassengers = trip.passengers?.filter(p => p.status === 'approved') || [];
    const pendingPassengers = trip.passengers?.filter(p => p.status === 'pending') || [];
    const hasPendingRequests = isOwner && pendingPassengers.length > 0;

    useEffect(() => {
        if (isRequest && trip.driverId) {
            const checkAssigned = async () => {
                const tripsRef = collection(dbInstance, 'trips');
                const dateStr = trip.departureTime.toDate().toDateString();
                const q = query(tripsRef, 
                    where('direction', '==', trip.direction),
                    where('type', '==', 'offer')
                );
                const snap = await getDocs(q);
                const assigned = snap.docs.some(doc => {
                    const data = doc.data() as Trip;
                    const sameDay = data.departureTime.toDate().toDateString() === dateStr;
                    const approved = data.passengers?.some(p => p.uid === trip.driverId && p.status === 'approved');
                    return sameDay && approved;
                });
                setIsAlreadyAssigned(assigned);
            };
            checkAssigned();
        }
    }, [isRequest, trip.driverId, trip.departureTime, trip.direction]);

    useEffect(() => {
        if (!canChat || !trip.id || !currentUserId) {
            setUnreadCount(0);
            return;
        }

        const storageKey = `lastRead_${trip.id}_${currentUserId}`;
        
        const calculateUnread = (msgs: any[]) => {
            const lastReadStr = localStorage.getItem(storageKey);
            const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
            return msgs.filter(msg => {
                const msgTime = msg.createdAt?.toMillis() || 0;
                return msg.senderId !== currentUserId && msgTime > lastRead;
            }).length;
        };

        const q = query(collection(dbInstance, 'messages'), where('tripId', '==', trip.id));
        const unsubscribe = onSnapshot(q, (snap) => {
            const msgs = snap.docs.map(d => d.data());
            setUnreadCount(calculateUnread(msgs));
        });

        const handleChatRead = (e: any) => {
            if (e.detail.tripId === trip.id) setUnreadCount(0);
        };

        window.addEventListener('chatRead', handleChatRead);
        return () => {
            unsubscribe();
            window.removeEventListener('chatRead', handleChatRead);
        };
    }, [trip.id, canChat, currentUserId]);

    const isFull = trip.availableSeats <= 0;
    const isClosed = trip.isClosed || isFull;
    
    const themeClasses = isRequest 
        ? { accent: 'bg-violet-600', glow: 'shadow-violet-500/10', text: 'text-violet-600', gradient: 'from-violet-600 to-purple-500', light: 'bg-violet-50 dark:bg-violet-950/20' }
        : { accent: 'bg-indigo-600', glow: 'shadow-indigo-500/10', text: 'text-indigo-600', gradient: 'from-indigo-600 to-blue-600', light: 'bg-indigo-50 dark:bg-indigo-950/20' };
    
    const displayName = language === 'en' 
        ? (driverProfile?.displayNameEn || driverProfile?.displayName || trip.driverName)
        : (driverProfile?.displayName || trip.driverName);
    const displayPhoto = driverProfile?.photoURL || trip.driverPhoto;
    const departureTimeObj = trip.departureTime.toDate();
    const departureTimeStr = departureTimeObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dayAndMonthStr = `${departureTimeObj.getDate()}.${departureTimeObj.getMonth() + 1}`;
    const dayNameStr = departureTimeObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'short' });
    const isYokneamToBinyamina = trip.direction === Direction.YOKNEAM_TO_BINYAMINA;
    const fromCity = isYokneamToBinyamina ? t('city_yokneam') : t('city_binyamina');
    const toCity = isYokneamToBinyamina ? t('city_binyamina') : t('city_yokneam');
    const displayLocation = trip.pickupLocation ? t(trip.pickupLocation) : t('error_location_required');

    const handleJoinRequestFromModal = async (pickupLoc: string) => {
        if (!user || isJoining || isPending || isApproved || isFull || trip.isClosed) return;
        setIsJoining(true);
        try { 
            await db.requestToJoinTrip(trip.id, { 
                uid: user.uid, 
                name: (language === 'en' && user.displayNameEn) ? user.displayNameEn : (user.displayName || t('guest')), 
                photo: user.photoURL || '', 
                phoneNumber: user.phoneNumber || '', 
                status: 'pending', 
                requestedPickupLocation: pickupLoc 
            }); 
        } catch (error) { 
            alert(t('error_generic')); 
        } finally { 
            setIsJoining(false); 
        }
    };

    const handleJoinClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || isJoining || isPending || isApproved || isFull || trip.isClosed) return;

        setIsJoining(true);
        try {
            const tripsRef = collection(dbInstance, 'trips');
            const tripDateStr = trip.departureTime.toDate().toDateString();
            const q = query(tripsRef, 
                where('driverId', '==', user.uid),
                where('type', '==', 'request'),
                where('direction', '==', trip.direction)
            );
            
            const snap = await getDocs(q);
            const existingReq = snap.docs.find(d => d.data().departureTime.toDate().toDateString() === tripDateStr);
            
            if (existingReq) {
                const loc = existingReq.data().pickupLocation;
                await db.requestToJoinTrip(trip.id, { 
                    uid: user.uid, 
                    name: (language === 'en' && user.displayNameEn) ? user.displayNameEn : (user.displayName || t('guest')), 
                    photo: user.photoURL || '', 
                    phoneNumber: user.phoneNumber || '', 
                    status: 'pending', 
                    requestedPickupLocation: loc 
                });
            } else {
                setShowJoinModal(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsJoining(false);
        }
    };

    const handleLeaveTripAction = async () => {
        if (isLeaving) return;
        setIsLeaving(true);
        try {
            await db.leaveTrip(trip.id, currentUserId);
            setShowLeaveConfirm(false);
        } catch (error) {
            alert(t('error_generic'));
        } finally {
            setIsLeaving(false);
        }
    };

    const activePassenger = approvedPassengers.find(p => p.uid === selectedPassenger) || (approvedPassengers.length > 0 ? approvedPassengers[0] : null);

    return (
        <div className={`group relative bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 w-full max-w-[340px] mx-auto mb-4 flex ${themeClasses.glow}`}>
            <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} trip={trip} />
            <JoinPickupModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onConfirm={handleJoinRequestFromModal} />
            <InviteSelectionModal 
                isOpen={showInviteModal} 
                onClose={() => setShowInviteModal(false)} 
                passengerId={trip.driverId} 
                passengerName={trip.driverName} 
                direction={trip.direction}
                onInviteSent={() => {}}
                onPostTripClick={() => onPostTripClick?.()}
            />

            {/* הפס הצבעוני הימני */}
            <div className={`w-1.5 shrink-0 ${themeClasses.accent} opacity-80 group-hover:opacity-100 transition-all`}></div>

            <div className="flex-1 p-5 flex flex-col relative">
                
                {/* תגית סטטוס צפה - הועברה לצד שמאל (Start) כדי לא להסתיר את כפתור העריכה שבימין */}
                {isClosed && !isRequest && (
                    <div className={`absolute top-4 ${dir === 'rtl' ? 'left-4' : 'right-4'} z-10 animate-fade-in`}>
                        <div className={`flex items-center gap-1.5 px-3 py-2 rounded-full border shadow-2xl backdrop-blur-xl font-black text-[10px] uppercase tracking-wider ${isFull && !trip.isClosed ? 'bg-amber-600 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-white'}`}>
                            {isFull && !trip.isClosed ? <Info size={11} strokeWidth={3} /> : <Lock size={11} strokeWidth={3} />}
                            {t(isFull && !trip.isClosed ? 'trip_full' : 'ride_closed')}
                        </div>
                    </div>
                )}

                {/* התראות לנהג */}
                {hasPendingRequests && (
                    <div className="mb-4 animate-pulse">
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-sm">
                            <div className="flex items-center gap-2">
                                <Bell size={13} className="text-amber-600" />
                                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-tight">בקשות ממתינות ({pendingPassengers.length})</span>
                            </div>
                            <span className="text-[9px] font-black text-amber-500">בדוק</span>
                        </div>
                    </div>
                )}

                {/* החלק העליון - פרטי נהג */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3 min-w-0 text-start flex-1">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-[1.2rem] overflow-hidden border-2 border-white dark:border-slate-800 shadow-md bg-slate-50">
                                {displayPhoto ? <img src={displayPhoto} className="w-full h-full object-cover" alt="" /> : <div className={`w-full h-full flex items-center justify-center font-black text-base ${themeClasses.text}`}>{displayName.charAt(0)}</div>}
                            </div>
                            {isOwner && (
                                <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white p-1 rounded-lg shadow-lg border border-white dark:border-slate-900">
                                    <ShieldCheck size={10} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[16px] font-black text-slate-900 dark:text-white truncate leading-tight mb-0.5">{displayName}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.text} opacity-80 shrink-0`}>{t(isRequest ? 'trip_type_request' : 'trip_type_offer')}</span>
                        </div>
                    </div>
                    
                    {/* כפתור עריכה - בימין (End) */}
                    {isOwner && (
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(trip); }} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><Edit3 size={18} /></button>
                    )}
                </div>

                {/* מסלול הנסיעה */}
                <div className={`bg-slate-50/60 dark:bg-slate-800/40 rounded-[1.8rem] p-4 mb-4 border border-slate-100 dark:border-slate-700/50 transition-all`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                            <span className="text-[12px] font-black text-slate-800 dark:text-white tracking-tight">{fromCity}</span>
                            <div className={`w-2.5 h-2.5 rounded-full border-2 ${isRequest ? 'border-violet-500' : 'border-indigo-500'} bg-white dark:bg-slate-900 shadow-sm`}></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center relative px-2">
                            <div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-700 absolute top-[11px] z-0"></div>
                            {/* תיקון צבע האייקון - תמיד בצבע הנושא */}
                            <div className={`p-1.5 rounded-full ${themeClasses.accent} text-white shadow-lg relative z-10 mb-2 transform group-hover:scale-110 transition-transform`}>{isRequest ? <User size={10} strokeWidth={4} /> : <CarFront size={10} strokeWidth={4} />}</div>
                            <div className="relative z-10 bg-white dark:bg-slate-700 px-3 py-0.5 rounded-full border border-slate-100 dark:border-slate-600 shadow-sm">
                                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter whitespace-nowrap">{dayNameStr} {dayAndMonthStr}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5 flex-1">
                            <span className="text-[12px] font-black text-slate-800 dark:text-white tracking-tight">{toCity}</span>
                            <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm"></div>
                        </div>
                    </div>
                </div>

                {/* פרטים טכניים (שעה ומקומות) */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-3.5 px-3 rounded-2xl flex items-center gap-3 shadow-sm">
                        <div className={`shrink-0 p-2.5 rounded-xl ${themeClasses.light} ${themeClasses.text}`}><Clock size={16} strokeWidth={3} /></div>
                        <div className="flex flex-col min-w-0 text-start leading-tight">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('departure_time')}</span>
                            <span className="text-[16px] font-black text-slate-900 dark:text-white">{departureTimeStr}</span>
                        </div>
                    </div>
                    <div className={`bg-white dark:bg-slate-800 border py-3.5 px-3 rounded-2xl flex items-center gap-3 shadow-sm transition-colors ${isFull ? 'border-amber-100 dark:border-amber-900/30' : 'border-slate-100 dark:border-slate-700'}`}>
                        <div className={`shrink-0 p-2.5 rounded-xl ${isRequest ? 'bg-violet-50 text-violet-600' : (isFull ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}`}>{isRequest ? <UserPlus size={16} strokeWidth={3} /> : <UserCheck size={16} strokeWidth={3} />}</div>
                        <div className="flex flex-col min-w-0 text-start leading-tight overflow-visible">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5 leading-none whitespace-nowrap">{t(isRequest ? 'seats_full_label_request' : 'seats_full_label_offer')}</span>
                            <span className={`text-[16px] font-black ${isRequest ? 'text-violet-600' : (isFull ? 'text-amber-600' : 'text-emerald-600')} transition-transform`}>{trip.availableSeats}</span>
                        </div>
                    </div>
                </div>

                {/* מיקום איסוף */}
                <div className="flex flex-col gap-0.5 px-1 mb-5 text-start">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{t(isRequest ? 'departure_point_request' : 'departure_point_offer')}</span>
                    <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"><MapPin size={11} className={isRequest ? 'text-violet-500' : 'text-indigo-500'} /></div>
                        <span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate leading-none">{displayLocation}</span>
                    </div>
                </div>

                {/* נוסעים מאושרים לנהג */}
                {isOwner && approvedPassengers.length > 0 && !isRequest && (
                    <div className="mt-1 mb-5 animate-fade-in">
                        <div className="flex items-center justify-between mb-2.5 px-1">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('passengers_title')}</h5>
                             <div className="flex -space-x-2.5 rtl:space-x-reverse overflow-visible">
                                {approvedPassengers.map((p) => (
                                    <button key={p.uid} onClick={() => setSelectedPassenger(p.uid)} className={`w-9 h-9 rounded-full border-2 transition-all overflow-hidden ${selectedPassenger === p.uid || (selectedPassenger === null && approvedPassengers[0].uid === p.uid) ? 'border-indigo-600 ring-4 ring-indigo-100 scale-110 z-10' : 'border-white dark:border-slate-800'}`}>
                                        {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-400">{p.name.charAt(0)}</div>}
                                    </button>
                                ))}
                             </div>
                        </div>
                        {activePassenger && (
                            <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-3 rounded-[1.5rem] border border-indigo-100/40 dark:border-indigo-800/20 flex items-center justify-between gap-3 animate-fade-in shadow-sm h-16">
                                <div className="flex items-center gap-3 min-w-0 flex-1 h-full text-start">
                                    <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden shrink-0 shadow-sm bg-white dark:bg-slate-700">
                                        {activePassenger.photo ? <img src={activePassenger.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-indigo-500">{activePassenger.name.charAt(0)}</div>}
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col justify-center">
                                        <span className="text-xs font-black text-slate-800 dark:text-white truncate block leading-tight mb-0.5">{activePassenger.name}</span>
                                        <div className="flex items-center gap-1 opacity-70">
                                            <MapPin size={10} className="text-indigo-500 shrink-0" />
                                            <span className="text-[9px] font-bold text-slate-600 dark:text-slate-400 truncate">{activePassenger.requestedPickupLocation || t('loc_custom')}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 h-full">
                                    <a href={`tel:${activePassenger.phoneNumber}`} className="h-10 w-10 flex items-center justify-center bg-white dark:bg-slate-800 text-indigo-600 rounded-xl shadow-sm hover:bg-indigo-50 active:scale-90 transition-all border border-slate-100 dark:border-slate-700"><Phone size={15} /></a>
                                    {activePassenger.requestedPickupLocation && (
                                        <a href={`https://waze.com/ul?q=${encodeURIComponent(activePassenger.requestedPickupLocation)}&navigate=yes`} target="_blank" rel="noreferrer" className="h-10 w-10 flex items-center justify-center bg-[#33CCFF] text-white rounded-xl shadow-md active:scale-90 transition-all"><Navigation size={15} fill="currentColor" /></a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* כפתורי פעולה */}
                <div className="mt-auto">
                    {isOwner ? (
                        <div className="flex flex-col gap-2.5">
                             <div className="flex gap-2.5 h-12">
                                {!isRequest && (
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsChatOpen(true); }} className="flex-[4] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-widest relative active:scale-[0.98] transition-all">
                                        <div className="relative">
                                            <MessageCircle size={19} /> 
                                            {unreadCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg">{unreadCount}</span>}
                                        </div>
                                        {t('chat_title')}
                                    </button>
                                )}
                                {isRequest && (
                                    <div className="flex-[4] h-12 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-xl flex items-center justify-center px-4 font-black text-[11px] uppercase tracking-widest border border-violet-100 dark:border-violet-800 shadow-inner">
                                        {t('request_status_title')}
                                    </div>
                                )}
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(true); }} className="flex-1 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center justify-center hover:bg-rose-100 active:scale-90 transition-all shadow-sm"><Trash2 size={20} /></button>
                             </div>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isTogglingStatus) return; setIsTogglingStatus(true); db.updateTrip(trip.id, { isClosed: !trip.isClosed }).finally(() => setIsTogglingStatus(false)); }} className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 border font-black uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] ${trip.isClosed ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'}`}>
                                {isTogglingStatus ? <Loader2 size={13} className="animate-spin" /> : (trip.isClosed ? <Unlock size={13} /> : <Lock size={13} />)}
                                {t(trip.isClosed ? 'open_ride' : 'close_ride')}
                            </button>
                        </div>
                    ) : (isApproved || isPending) ? (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex gap-2.5 h-12">
                                {isApproved && !isRequest && (
                                    <>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsChatOpen(true); }} className="flex-[3.5] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-widest relative active:scale-[0.98] transition-all">
                                            <div className="relative">
                                                <MessageCircle size={19} />
                                                {unreadCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg">{unreadCount}</span>}
                                            </div>
                                            {t('chat_title')}
                                        </button>
                                        <a href={`tel:${driverPhoneNumber}`} className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"><Phone size={20} /></a>
                                    </>
                                )}
                                {isPending && <div className="flex-1 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-100 shadow-inner">{t('join_pending')}</div>}
                            </div>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLeaveConfirm(true); }} className="w-full h-10 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]">
                                <LogOut size={15} />
                                {t('cancel')}
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={isRequest ? (e) => { e.preventDefault(); e.stopPropagation(); setShowInviteModal(true); } : handleJoinClick} 
                            disabled={isClosed || isJoining || (isRequest && isAlreadyAssigned)} 
                            className={`w-full h-14 rounded-[1.4rem] font-black text-sm uppercase tracking-[0.15em] transition-all active:scale-[0.97] shadow-lg flex items-center justify-center gap-2 ${isClosed || (isRequest && isAlreadyAssigned) ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-none cursor-not-allowed border border-slate-300 dark:border-slate-700' : `bg-gradient-to-tr ${themeClasses.gradient} text-white shadow-indigo-500/20 hover:-translate-y-0.5`}`}
                        >
                            {isJoining ? <Loader2 size={18} className="animate-spin" /> : (isRequest && isAlreadyAssigned ? "משובץ לנסיעה" : (isClosed ? (isFull ? t('trip_full') : t('ride_closed')) : (isRequest ? t('offer_to_join') : t('join'))))}
                            {!isClosed && !isJoining && !(isRequest && isAlreadyAssigned) && (isRequest ? <Send size={18} /> : <ChevronRight size={18} strokeWidth={4} className={dir === 'rtl' ? 'rotate-180' : ''} />)}
                        </button>
                    )}
                </div>
            </div>

            {/* מודלים של אישור מחיקה ועזיבה */}
            {showDeleteConfirm && (
                <Portal>
                    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 mx-auto"><Trash2 size={32} className="text-rose-500" /></div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">מחיקת {isRequest ? 'בקשה' : 'נסיעה'}</h4>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{t('cancel_trip_confirm')}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={async () => { if (isDeleting) return; setIsDeleting(true); try { await db.cancelTrip(trip.id); } finally { setIsDeleting(false); setShowDeleteConfirm(false); } }} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-600/20 active:scale-95 transition-all">{isDeleting ? <Loader2 className="animate-spin" size={20} /> : t('delete')}</button>
                                <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600">ביטול</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {showLeaveConfirm && (
                <Portal>
                    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => !isLeaving && setShowLeaveConfirm(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} className="text-amber-500" /></div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('leave_ride_modal_title')}</h4>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{t('leave_ride_modal_confirm_msg')}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleLeaveTripAction} className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-lg shadow-amber-600/20 active:scale-95 transition-all">{isLeaving ? <Loader2 className="animate-spin" size={20} /> : t('confirm')}</button>
                                <button onClick={() => setShowLeaveConfirm(false)} disabled={isLeaving} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ביטול</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

const TripCardMemo = memo(TripCard);
export default TripCardMemo;
