
import React, { useState, memo, useEffect, useRef } from 'react';
import { Trip, Passenger, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTripContact } from '../hooks/useTripContact';
import { db, dbInstance } from '../services/firebase';
import { Phone, MessageCircle, Trash2, Edit3, MapPin, Loader2, ArrowLeft, ArrowRight, User, LogOut, Check, X, Lock, Unlock, Send, Share2, Navigation, Settings2 } from 'lucide-react';
import { Direction } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import InviteSelectionModal from './InviteSelectionModal';
import ChatModal from './ChatModal';
import BadgeDisplay from './BadgeDisplay';

interface TripCardProps {
    trip: Trip;
    onEdit?: (trip: Trip) => void;
    onPostTripClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onEdit, onPostTripClick }) => {
    const { user, firebaseUser } = useAuth();
    const { t, dir, language } = useLocalization();
    const { driverPhoneNumber, isPassenger } = useTripContact(trip);
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isTogglingStatus, setIsTogglingStatus] = useState(false);
    const [isOwnerAssignedElsewhere, setIsOwnerAssignedElsewhere] = useState(false);
    
    const [passengerToRemove, setPassengerToRemove] = useState<Passenger | null>(null);
    const [isRemovingPassenger, setIsRemovingPassenger] = useState(false);
    const [processingPassengerId, setProcessingPassengerId] = useState<string | null>(null);

    const [hasSentInvite, setHasSentInvite] = useState(false);
    const [inviteNotifId, setInviteNotifId] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const latestMessagesRef = useRef<ChatMessage[]>([]);

    const currentUserId = firebaseUser?.uid || user?.uid;
    const isOwner = currentUserId === trip.driverId;
    const isRequest = trip.type === 'request';
    const isFull = trip.availableSeats <= 0;
    
    const isClosed = trip.isClosed || isOwnerAssignedElsewhere;

    const myPassengerData = trip.passengers?.find(p => p.uid === currentUserId);
    const isPending = myPassengerData?.status === 'pending';
    const isApproved = myPassengerData?.status === 'approved';
    const canChat = isOwner || isApproved;

    const calculateUnread = (msgs: ChatMessage[]) => {
        if (!msgs) return 0;
        const lastReadStr = localStorage.getItem(`lastRead_${trip.id}`);
        const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
        let count = 0;
        msgs.forEach(data => {
            const msgTime = data.createdAt ? data.createdAt.toMillis() : Date.now();
            if (data.senderId !== currentUserId && msgTime > lastRead) { count++; }
        });
        return count;
    };

    useEffect(() => {
        if (!canChat) return;
        const q = query(collection(dbInstance, 'messages'), where('tripId', '==', trip.id));
        const unsubscribe = onSnapshot(q, (snap) => {
            if (snap.empty) { 
                latestMessagesRef.current = [];
                setUnreadCount(0); 
                return; 
            }
            const msgs = snap.docs.map(doc => doc.data() as ChatMessage);
            latestMessagesRef.current = msgs;
            setUnreadCount(calculateUnread(msgs));
        });

        // Event listener for when chat is read in modal
        const handleReadUpdate = (e: Event) => {
            const customEvent = e as CustomEvent;
            // Only update if the event is for THIS trip
            if (customEvent.detail?.tripId === trip.id) {
                // Recalculate using the LATEST messages we have in the ref
                setUnreadCount(calculateUnread(latestMessagesRef.current));
            }
        };

        window.addEventListener('chat_read_update', handleReadUpdate);
        return () => { 
            unsubscribe(); 
            window.removeEventListener('chat_read_update', handleReadUpdate); 
        };
    }, [trip.id, canChat, currentUserId]);

    useEffect(() => {
        if (isRequest && user && !isOwner) {
             const q = query(collection(dbInstance, 'notifications'), where('userId', '==', trip.driverId), where('type', '==', 'invite'));
             const unsubscribe = onSnapshot(q, (snap) => {
                 const myInvite = snap.docs.find(d => {
                     const data = d.data();
                     return data.senderId === user.uid && data.metadata?.direction === trip.direction;
                 });
                 setHasSentInvite(!!myInvite);
                 setInviteNotifId(myInvite ? myInvite.id : null);
             });
             return () => unsubscribe();
        }
    }, [isRequest, user, trip.driverId, trip.direction, isOwner]);

    useEffect(() => {
        if (isRequest) {
            const q = query(collection(dbInstance, 'trips'), where('direction', '==', trip.direction));
            const unsubscribe = onSnapshot(q, (snap) => {
                const assigned = snap.docs.some(doc => {
                    const data = doc.data() as Trip;
                    if (data.type === 'request') return false; 
                    const isApproved = data.passengers?.some(p => p.uid === trip.driverId && p.status === 'approved');
                    const tripDate = data.departureTime.toDate().toDateString();
                    const myRequestDate = trip.departureTime.toDate().toDateString();
                    return isApproved && tripDate === myRequestDate;
                });
                setIsOwnerAssignedElsewhere(assigned);
            });
            return () => unsubscribe();
        }
    }, [isRequest, trip.driverId, trip.direction, trip.departureTime]);

    const isNotSharable = isClosed || (trip.type === 'offer' && isFull);
    const departureDateObj = trip.departureTime.toDate();
    const departureTimeStr = departureDateObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const departureDateStr = departureDateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'numeric' });

    // Check if trip is today
    const now = new Date();
    const isToday = departureDateObj.getDate() === now.getDate() &&
                    departureDateObj.getMonth() === now.getMonth() &&
                    departureDateObj.getFullYear() === now.getFullYear();

    const isYokneamToBinyamina = trip.direction === Direction.YOKNEAM_TO_BINYAMINA;
    const fromCity = isYokneamToBinyamina ? t('city_yokneam') : t('city_binyamina');
    const toCity = isYokneamToBinyamina ? t('city_binyamina') : t('city_yokneam');
    const directionText = t(isYokneamToBinyamina ? 'yokneam_to_binyamina' : 'binyamina_to_yokneam');
    const displayLocation = trip.pickupLocation ? t(trip.pickupLocation) : t('error_location_required');
    const displayName = (language === 'en' && trip.driverNameEn) ? trip.driverNameEn : trip.driverName;
    const locationLabel = isRequest ? t('departure_point_request') : t('departure_point_offer');
    const approvedPassengers = trip.passengers?.filter(p => p.status === 'approved') || [];
    const remainingSeats = trip.availableSeats;

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const origin = window.location.origin;
        const shareLink = `${origin}/?tripId=${trip.id}`;
        const msgKey = isRequest ? 'share_message_request' : 'share_message_offer';
        const content = t(msgKey).replace('{driver}', displayName).replace('{direction}', directionText).replace('{time}', departureTimeStr).replace('{date}', departureDateStr).replace('{location}', displayLocation).replace('{seats}', trip.availableSeats.toString()).replace('{link}', shareLink);
        window.open(`https://wa.me/?text=${encodeURIComponent(content)}`, '_blank');
    };

    const handleJoinRequest = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user || isJoining || isPending || isApproved) return;
        setIsJoining(true);
        try { await db.requestToJoinTrip(trip.id, { uid: user.uid, name: user.displayName || t('guest'), photo: user.photoURL || '', phoneNumber: user.phoneNumber || '', status: 'pending', requestedPickupLocation: trip.pickupLocation || '' }); }
        catch (error) { console.error(error); alert(t('error_generic')); } finally { setIsJoining(false); }
    };

    const handleApprove = async (e: React.MouseEvent, passengerId: string) => {
        e.preventDefault(); e.stopPropagation();
        if (processingPassengerId) return;
        setProcessingPassengerId(passengerId);
        try { await db.approveJoinRequest(trip.id, passengerId); } catch (error) { alert(t('error_generic')); } finally { setProcessingPassengerId(null); }
    };

    const handleReject = async (e: React.MouseEvent, passengerId: string) => {
        e.preventDefault(); e.stopPropagation();
        if (processingPassengerId) return;
        setProcessingPassengerId(passengerId);
        try { await db.rejectJoinRequest(trip.id, passengerId); } catch (error) { console.error(error); } finally { setProcessingPassengerId(null); }
    };

    const handleRemoveClick = (e: React.MouseEvent, passenger: Passenger) => { e.preventDefault(); e.stopPropagation(); setPassengerToRemove(passenger); };
    const confirmRemovePassenger = async () => {
        if (!passengerToRemove || isRemovingPassenger) return;
        setIsRemovingPassenger(true);
        try { await db.removePassenger(trip.id, passengerToRemove.uid); setPassengerToRemove(null); } 
        catch (error) { alert(t('error_generic')); } finally { setIsRemovingPassenger(false); }
    };

    const handleLeaveClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowLeaveConfirm(true); };
    const confirmLeave = async () => {
        if (!user || isLeaving) return;
        setIsLeaving(true);
        try { await db.leaveTrip(trip.id, user.uid); setShowLeaveConfirm(false); } 
        catch (error) { alert(t('error_generic')); } finally { setIsLeaving(false); }
    };
    
    const handleDeleteClick = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(true); };
    const confirmDelete = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (isDeleting) return;
        setIsDeleting(true);
        try { await db.cancelTrip(trip.id); } catch (err: any) { alert(err.message); } finally { setIsDeleting(false); setShowDeleteConfirm(false); }
    };

    const toggleTripStatus = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (isTogglingStatus) return;
        setIsTogglingStatus(true);
        try { await db.updateTrip(trip.id, { isClosed: !isClosed }); } catch (error) { console.error(error); } finally { setIsTogglingStatus(false); }
    };

    const handleEditPassengerDetails = async () => {
        if (!user || !isApproved || !myPassengerData) return;
        const currentLoc = myPassengerData.requestedPickupLocation || '';
        const newLoc = window.prompt(t('pickup_location'), currentLoc);
        
        if (newLoc !== null && newLoc.trim() !== currentLoc) {
            try {
                await db.updatePassengerDetails(trip.id, user.uid, { requestedPickupLocation: newLoc.trim() });
            } catch (error) {
                alert(t('error_generic'));
            }
        }
    };

    const pendingPassengers = trip.passengers?.filter(p => p.status === 'pending') || [];

    return (
        <div className="group relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden transition-all hover:shadow-lg w-full md:max-w-lg mx-auto mb-3">
            <InviteSelectionModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} passengerId={trip.driverId} passengerName={trip.driverName} direction={trip.direction} onInviteSent={() => {}} onPostTripClick={() => onPostTripClick && onPostTripClick()} />
            <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} trip={trip} />

            {showDeleteConfirm && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                    <p className="text-white font-bold text-base mb-6 px-4">{isRequest ? t('cancel_request_confirm') : t('cancel_trip_confirm')}</p>
                    <div className="flex gap-2 w-full max-w-[220px]">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(false); }} disabled={isDeleting} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300 font-bold text-sm">ביטול</button>
                        <button onClick={confirmDelete} disabled={isDeleting} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm flex justify-center items-center">{isDeleting ? <Loader2 size={16} className="animate-spin"/> : t('delete')}</button>
                    </div>
                </div>
            )}

            {showLeaveConfirm && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center animate-fade-in">
                    <p className="text-white font-bold text-base mb-1">{t('leave_ride_modal_title')}</p>
                    <p className="text-slate-300 text-xs mb-6 px-4">{t('leave_ride_modal_content')}</p>
                    <div className="flex gap-2 w-full max-w-[220px]">
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLeaveConfirm(false); }} disabled={isLeaving} className="flex-1 py-3 bg-slate-700 rounded-xl text-slate-300 font-bold text-sm">חזור</button>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); confirmLeave(); }} disabled={isLeaving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2">{isLeaving ? <Loader2 size={16} className="animate-spin"/> : <LogOut size={16} />} אישור</button>
                    </div>
                </div>
            )}

            <div className={`absolute top-0 left-0 right-0 h-1 sm:h-1.5 ${isRequest ? 'bg-orange-500' : 'bg-indigo-600'}`}></div>
            
            <div className="p-3 sm:p-4">
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                     <div className="flex items-center gap-2 min-w-0">
                         <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border border-slate-200 dark:border-slate-600 shadow-sm overflow-hidden shrink-0">
                            {trip.driverPhoto ? <img src={trip.driverPhoto} alt="" className="w-full h-full object-cover"/> : <span className="font-bold text-slate-500 text-sm sm:text-lg">{displayName.charAt(0).toUpperCase()}</span>}
                         </div>
                         <div className="flex flex-col min-w-0">
                             <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate max-w-[100px] sm:max-w-none">{displayName}</span>
                                <BadgeDisplay userId={trip.driverId} size="sm" />
                             </div>
                             <span className={`text-[10px] sm:text-xs font-medium uppercase tracking-tight ${isRequest ? 'text-orange-500' : 'text-indigo-500'}`}>
                                 {isRequest ? t('trip_type_request') : t('trip_type_offer')}
                             </span>
                         </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                        {/* Display date if trip is not today */}
                        {!isToday && (
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">
                                {departureDateObj.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                             </span>
                        )}
                        <div className="flex items-center gap-1.5">
                            {canChat && (
                                <button onClick={() => setIsChatOpen(true)} className={`relative p-1.5 rounded-full transition-all ${isChatOpen ? 'bg-indigo-100 text-indigo-700' : 'text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}>
                                    <MessageCircle size={18} />
                                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white dark:border-slate-800 shadow-sm">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                                </button>
                            )}
                            {!isNotSharable && (
                                <button onClick={handleShare} className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full transition-all"><Share2 size={18} /></button>
                            )}
                            <span className="text-xl sm:text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tight">{departureTimeStr}</span>
                        </div>
                        {isClosed ? (
                            <span className={`text-[8px] sm:text-[10px] font-black px-1.5 py-0.5 rounded-full mt-1 border uppercase ${isRequest ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'text-amber-500 bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800'}`}>
                                {isRequest ? t('request_fulfilled') : t('ride_closed')}
                            </span>
                        ) : isFull && !isOwner && !isApproved ? (
                             <span className="text-[8px] sm:text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full mt-1 border border-red-100 dark:border-red-800 uppercase">{t('trip_full')}</span>
                        ) : null}
                    </div>
                </div>

                <div className="flex items-center gap-2 mb-3 sm:mb-4 px-1 opacity-90">
                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 truncate">{fromCity}</span>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700 relative min-w-[30px]">
                         <div className={`absolute top-1/2 -translate-y-1/2 ${dir === 'rtl' ? 'left-0' : 'right-0'} text-slate-300`}>
                             {dir === 'rtl' ? <ArrowLeft size={12} /> : <ArrowRight size={12} />}
                         </div>
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 truncate">{toCity}</span>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2 mb-3 sm:mb-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 sm:p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-indigo-500 shrink-0 shadow-sm"><MapPin size={20} /></div>
                        <div className="flex flex-col min-w-0 justify-center">
                            <span className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest leading-tight mb-0.5 truncate">{locationLabel}</span>
                            <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-white truncate leading-tight">{displayLocation}</span>
                        </div>
                    </div>
                    
                    {/* Compact Seats Container - Enlarged */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-2 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center min-w-[80px] sm:min-w-[90px] shrink-0">
                        <User size={20} className={`mb-0.5 ${isRequest ? "text-orange-500" : "text-indigo-500"}`} />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">{isRequest ? t('seats_needed') : t('seats_left')}</span>
                        <span className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-none">{remainingSeats}</span>
                    </div>
                </div>

                {isOwner && pendingPassengers.length > 0 && !isClosed && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2 animate-fade-in">
                        <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>{t('pending_requests')}</p>
                        {pendingPassengers.map((p) => (
                            <div key={p.uid} className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-amber-500 shadow-sm border border-amber-100 dark:border-amber-900">{p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <User size={14} />}</div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{p.name}</span>
                                        <span className="text-[9px] text-slate-500 truncate">{p.requestedPickupLocation ? t(p.requestedPickupLocation) : t('no_location')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={(e) => handleReject(e, p.uid)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 shadow-sm border border-slate-200 dark:border-slate-700">{processingPassengerId === p.uid ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}</button>
                                    <button onClick={(e) => handleApprove(e, p.uid)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white shadow-md shadow-emerald-500/20">{processingPassengerId === p.uid ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {(isOwner || isApproved) && approvedPassengers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
                        <div className="flex justify-between items-center"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('passengers_title')}</p>{isApproved && <span className="text-[8px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded-full font-black uppercase">{t('join_approved')}</span>}</div>
                        {approvedPassengers.map((p, i) => (
                            <div key={i} className={`flex items-center justify-between p-2 rounded-xl border gap-2 ${p.uid === user?.uid ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-900/50 dark:border-slate-700'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden shadow-sm border border-slate-200 dark:border-slate-600">{p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-[10px] font-black text-slate-400">{p.name.charAt(0)}</span>}</div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] font-bold text-slate-800 dark:text-white truncate">{p.name} {p.uid === user?.uid && '(Me)'}</span>
                                        <span className="text-[9px] text-slate-500 truncate">{p.requestedPickupLocation ? t(p.requestedPickupLocation) : t('no_location')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {isOwner && p.requestedPickupLocation && (<a href={`https://waze.com/ul?q=${encodeURIComponent(t(p.requestedPickupLocation))}&navigate=yes`} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#33CCFF] text-white flex items-center justify-center"><Navigation size={12} className="fill-current" /></a>)}
                                    {isOwner && p.uid !== user?.uid && p.phoneNumber && (<a href={`https://wa.me/${p.phoneNumber?.replace(/\D/g, '').replace(/^0/, '972')}`} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[#25D366] text-white flex items-center justify-center"><MessageCircle size={12} /></a>)}
                                    {isOwner && p.uid !== user?.uid && (<button onClick={(e) => handleRemoveClick(e, p)} className="w-7 h-7 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><Trash2 size={12} /></button>)}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="w-full mt-4 space-y-2">
                    {isOwner ? (
                        <div className="flex items-center gap-2">
                            {isRequest ? (
                                <>
                                    {isClosed && <div className="flex-1 py-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800 rounded-xl text-center text-amber-700 dark:text-amber-400 font-bold text-xs">{t('request_fulfilled')}</div>}
                                    <button onClick={handleDeleteClick} className="flex-1 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center justify-center gap-2 font-bold text-xs border border-red-100 dark:border-red-900/40"><Trash2 size={16} />{t('cancel_request')}</button>
                                </>
                            ) : (
                                <button onClick={toggleTripStatus} disabled={isTogglingStatus} className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-2 text-xs font-black uppercase transition-all shadow-sm ${isClosed ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 text-slate-500'}`}>{isTogglingStatus ? <Loader2 size={16} className="animate-spin" /> : (isClosed ? <Unlock size={16} /> : <Lock size={16} />)}{isClosed ? t('open_ride') : t('close_ride')}</button>
                            )}
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(trip); }} className="w-auto px-4 h-10 bg-white dark:bg-slate-800 border border-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center gap-2 text-xs shadow-sm"><Edit3 size={16} />{t('edit')}</button>
                            {!isRequest && (<button onClick={handleDeleteClick} className="w-10 h-10 bg-red-50 dark:bg-red-900/20 border border-red-100 text-red-500 rounded-xl flex items-center justify-center shadow-sm shrink-0"><Trash2 size={18} /></button>)}
                        </div>
                    ) : (isApproved || isPending) ? (
                        <div className="flex flex-col gap-2">
                             {isApproved && (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        <a href={`tel:${driverPhoneNumber}`} className="h-10 bg-indigo-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"><Phone size={16} />{t('call')}</a>
                                        <a href={`https://wa.me/${driverPhoneNumber?.replace(/\D/g, '').replace(/^0/, '972')}`} target="_blank" rel="noreferrer" className="h-10 bg-[#25D366] text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md"><MessageCircle size={16} />וואטסאפ</a>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Edit Details for Approved Passenger */}
                                        <button onClick={handleEditPassengerDetails} className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl flex items-center justify-center gap-2 text-xs"><Edit3 size={16} /> עריכת בקשה</button>
                                        <button onClick={handleLeaveClick} disabled={isLeaving} className="flex-1 h-10 bg-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md">{isLeaving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} {t('leave_ride')}</button>
                                    </div>
                                </>
                             )}
                             {isPending && (
                                <>
                                    <div className="w-full h-10 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-700 font-black rounded-xl flex items-center justify-center gap-2 text-xs">{t('join_pending')}</div>
                                    <button onClick={handleLeaveClick} disabled={isLeaving} className="w-full h-10 bg-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-xs shadow-md">{isLeaving ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} ביטול בקשה</button>
                                </>
                             )}
                        </div>
                    ) : (
                        <button onClick={handleJoinRequest} disabled={isFull || isClosed || isJoining} className={`w-full h-12 rounded-xl font-black text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 ${isFull || isClosed ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}>{isJoining ? <Loader2 size={18} className="animate-spin" /> : (isClosed ? t('ride_closed') : (isFull ? t('trip_full') : t('join')))}</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default memo(TripCard);
