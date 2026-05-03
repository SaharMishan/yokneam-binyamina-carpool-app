
import React, { useState, memo, useEffect, useCallback } from 'react';
import { Trip, Passenger, Direction } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { useTripContact } from '../hooks/useTripContact';
import { useNotifications } from '../context/NotificationContext';
import { db, dbInstance } from '../services/firebase';
import { 
    Phone, MessageCircle, Trash2, Edit3, MapPin, Loader2, 
    User, LogOut, CarFront, Clock, UserPlus, 
    ShieldCheck, ChevronRight, UserCheck, Unlock, Lock, Navigation, AlertTriangle, Bell, Send, CheckCircle, Info, Share2, X, ExternalLink, AlertCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, getDocs, limit, Timestamp } from 'firebase/firestore';
import ChatModal from './ChatModal';
import JoinPickupModal from './JoinPickupModal';
import InviteSelectionModal from './InviteSelectionModal';
import Portal from './Portal';
import { motion, AnimatePresence } from 'motion/react';

// לוגו Waze המקורי
const WazeLogo = () => (
    <svg width="24" height="24" viewBox="0 0 122.71 122.88" xmlns="http://www.w3.org/2000/svg">
        <g>
            <path fill="#FFFFFF" d="M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07 C104.27,17.76,90.77,8.19,72.3,6.22c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44 c-0.09,3.28,0,6.66,0,9.94C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
            <path d="M54.95,110.49c-1.03,4.69-3.56,8.16-7.69,10.31c-5.25,2.72-10.6,2.63-15.57-0.56c-5.16-3.28-7.41-8.25-7.03-14.35 c0.09-1.03-0.19-1.41-1.03-1.88c-9.1-4.78-16.31-11.44-21.28-20.44c-0.94-1.78-1.69-3.66-2.16-5.63c-0.66-2.72,0.38-4.03,3.19-4.31 c3.38-0.38,6.38-1.69,7.88-4.88c0.66-1.41,1.03-3.09,1.03-4.69c0.19-4.03,0-8.06,0.19-12.1c1.03-15.57,7.5-28.5,19.32-38.63 C42.67,3.97,55.42-0.43,69.76,0.03c25.04,0.94,46.51,18.57,51.57,43.23c4.59,22.32-2.34,40.98-20.07,55.51 c-1.03,0.84-2.16,1.69-3.38,2.44c-0.66,0.47-0.84,0.84-0.56,1.59c2.34,7.13-0.94,15-7.5,18.38c-8.91,4.41-19.22-0.09-21.94-9.66 c-0.09-0.38-0.56-0.84-0.84-0.84C63.11,110.4,59.07,110.49,54.95,110.49L54.95,110.49z M55.14,104.21c4.22,0,8.44,0.19,12.66-0.09 c3.84-0.19,7.88-0.56,11.63-1.5c29.82-7.31,45.76-40.23,32.72-68.07C104.27,17.76,90.77,8.19,72.3,6.22 c-14.16-1.5-26.82,2.72-37.51,12.28c-10.5,9.47-15.94,21.28-16.31,35.44c-0.09,3.28,0,6.66,0,9.94 C18.38,71.02,14.35,76.55,7.5,78.7c-0.09,0-0.28,0.19-0.38,0.19c2.63,6.94,13.31,17.16,19.97,19.69 C35.45,87.14,52.32,91.18,55.14,104.21L55.14,104.21z"/>
            <path d="M74.92,79.74c-11.07-0.56-18.38-4.97-23.07-13.78c-1.13-2.16-0.09-4.31,2.06-4.78c1.31-0.28,2.53,0.66,3.47,2.16 c1.22,1.88,2.44,3.75,4.03,5.25c8.81,8.34,23.25,5.72,28.79-5.06c0.66-1.31,1.5-2.34,3.09-2.34c2.34,0.09,3.66,2.44,2.63,4.59 c-2.91,5.91-7.5,10.22-13.69,12.28C79.51,78.99,76.7,79.36,74.92,79.74L74.92,79.74z"/>
            <path d="M55.32,48.98c-3.38,0-6.09-2.72-6.09-6.09s2.72-6.09,6.09-6.09s6.09,2.72,6.09,6.09C61.42,46.17,58.7,48.98,55.32,48.98 L55.32,48.98z"/>
            <path d="M98.27,42.79c0,3.38-2.72,6.09-6,6.19c-3.38,0-6.09-2.63-6.09-6.09c0-3.38,2.63-6.09,6-6.19 C95.46,36.7,98.17,39.42,98.27,42.79L98.27,42.79z"/>
        </g>
    </svg>
);

// לוגו Google Maps המקורי
const GoogleMapsLogo = () => (
    <svg width="24" height="24" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06 C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88 C37.49,14.05,38,16.21,38,18.5C38,21.4,37.17,24.09,35.76,26.36z"></path>
        <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15 c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"></path>
        <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"></path>
        <path fill="#ed5748" d="M19.83,14.92L19.76,15l-8.32,9.88C10.52,22.95,10,20.79,10,18.5c0-3.54,1.23-6.79,3.27-9.3 L19.83,14.92z"></path>
        <path fill="#5695f6" d="M28.24,22c0.79-0.95,1.26-2.17,1.26-3.5c0-3.04-2.46-5.5-5.5-5.5c-1.71,0-3.24,0.78-4.24,2L28.4,4.74 c3.59,1.22,6.53,3.91,8.17,7.38L28.24,22z"></path>
    </svg>
);

const WhatsappIcon = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 448 512" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-5.5-2.8-23.2-8.5-44.2-27.1-16.4-14.6-27.4-32.7-30.6-38.2-3.2-5.6-.3-8.6 2.5-11.3 2.5-2.5 5.5-6.5 8.3-9.7 2.8-3.3 3.7-5.6 5.6-9.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 13.2 5.8 23.5 9.2 31.5 11.8 13.3 4.2 25.4 3.6 35 2.2 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z" />
    </svg>
);

const getWhatsappLink = (phone?: string) => {
    if (!phone) return '#';
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '972' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('9720')) {
        cleanPhone = '972' + cleanPhone.substring(4);
    }
    return `https://wa.me/${cleanPhone}`;
};


interface TripCardProps {
    trip: Trip;
    onEdit?: (trip: Trip) => void;
    onPostTripClick?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({ trip, onEdit, onPostTripClick }) => {
    const { user, firebaseUser } = useAuth();
    const { t, dir } = useLocalization();
    const { setActiveSystemMessage } = useNotifications();
    const { driverProfile, driverPhoneNumber } = useTripContact(trip);
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [isRemovingPassenger, setIsRemovingPassenger] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [showNavOptions, setShowNavOptions] = useState(false);
    const [passengerToRemove, setPassengerToRemove] = useState<Passenger | null>(null);
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

    const approvedPassengers = trip.passengers?.filter(p => p.status === 'approved' && p.uid !== trip.driverId) || [];
    const pendingPassengers = trip.passengers?.filter(p => p.status === 'pending') || [];
    const hasPendingRequests = false; // Always false now that joins are automatic

    useEffect(() => {
        if (isRequest && trip.driverId) {
            const checkAssigned = async () => {
                const tripsRef = collection(dbInstance, 'trips');
                const dateStr = trip.departureTime.toDate().toDateString();
                // Refactored to fetch only by type to avoid requiring a composite index on direction+type
                const q = query(tripsRef, 
                    where('type', '==', 'offer'),
                    limit(150)
                );
                const snap = await getDocs(q);
                const assigned = snap.docs.some(doc => {
                    const data = doc.data() as Trip;
                    const sameDay = data.departureTime.toDate().toDateString() === dateStr;
                    const sameDirection = data.direction === trip.direction;
                    const isPassengerApproved = data.passengers?.some(p => p.uid === trip.driverId && p.status === 'approved');
                    return sameDay && sameDirection && isPassengerApproved;
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
        const q = query(collection(dbInstance, 'messages'), where('tripId', '==', trip.id), limit(50));
        const unsubscribe = onSnapshot(q, (snap) => {
            const lastReadStr = localStorage.getItem(storageKey);
            const lastRead = lastReadStr ? parseInt(lastReadStr, 10) : 0;
            const msgs = snap.docs.map(d => d.data());
            setUnreadCount(msgs.filter(msg => msg.senderId !== currentUserId && (msg.createdAt?.toMillis() || 0) > lastRead).length);
        });
        const handleChatRead = (e: any) => { if (e.detail.tripId === trip.id) setUnreadCount(0); };
        window.addEventListener('chatRead', handleChatRead);
        return () => { unsubscribe(); window.removeEventListener('chatRead', handleChatRead); };
    }, [trip.id, canChat, currentUserId]);

    const isFull = trip.availableSeats <= 0;
    const isClosed = trip.isClosed || isFull;
    
    const themeClasses = isRequest 
        ? { accent: 'bg-violet-600', glow: 'shadow-violet-500/10', text: 'text-violet-600', gradient: 'from-violet-600 to-purple-500', light: 'bg-violet-50 dark:bg-violet-950/20' }
        : { accent: 'bg-indigo-600', glow: 'shadow-indigo-500/10', text: 'text-indigo-600', gradient: 'from-indigo-600 to-blue-600', light: 'bg-indigo-50 dark:bg-indigo-950/20' };
    
    const displayName = driverProfile?.displayName || trip.driverName;
    const displayPhoto = driverProfile?.photoURL || trip.driverPhoto;
    const departureTimeObj = trip.departureTime.toDate();
    const departureTimeStr = departureTimeObj.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dayAndMonthStr = `${departureTimeObj.getDate()}.${departureTimeObj.getMonth() + 1}`;
    const dayNameStr = departureTimeObj.toLocaleDateString('he-IL', { weekday: 'short' });
    const isYokneamToBinyamina = trip.direction === Direction.YOKNEAM_TO_BINYAMINA;
    const fromCity = isYokneamToBinyamina ? t('city_yokneam') : t('city_binyamina');
    const toCity = isYokneamToBinyamina ? t('city_binyamina') : t('city_yokneam');
    const displayLocation = trip.pickupLocation ? t(trip.pickupLocation) : t('error_location_required');

    const handleShare = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const prodUrl = `https://yokneam-binyamina-carpool-app.vercel.app/?tripId=${trip.id}`;
        const dirStr = isYokneamToBinyamina ? t('yokneam_to_binyamina') : t('binyamina_to_yokneam');
        const message = t(trip.type === 'offer' ? 'share_message_offer' : 'share_message_request').replace('{direction}', dirStr).replace('{time}', departureTimeStr).replace('{date}', `${dayNameStr} ${dayAndMonthStr}`).replace('{link}', prodUrl);
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }, [trip, t, isYokneamToBinyamina, departureTimeStr, dayNameStr, dayAndMonthStr]);

    const handleJoinRequestFromModal = async (pickupLoc: string) => {
        if (!user || isJoining || isPending || isApproved || isFull || trip.isClosed) return;
        setIsJoining(true);
        try { await db.requestToJoinTrip(trip.id, { uid: user.uid, name: user.displayName || t('guest'), photo: user.photoURL || '', phoneNumber: user.phoneNumber || '', status: 'pending', requestedPickupLocation: pickupLoc }); }
        catch (error) { alert(t('error_generic')); } finally { setIsJoining(false); }
    };

    const handleJoinClick = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user || isJoining || isPending || isApproved || isFull || trip.isClosed) return;
        setIsJoining(true);
        try {
            const tripsRef = collection(dbInstance, 'trips');
            // Refactored: Fetch only by driverId to avoid composite index with type/direction
            const q = query(tripsRef, 
                where('driverId', '==', user.uid)
            );
            const snap = await getDocs(q);
            const tripDayStr = trip.departureTime.toDate().toDateString();
            const existingReq = snap.docs.find(d => {
                const data = d.data() as Trip;
                return data.type === 'request' &&
                       data.direction === trip.direction && 
                       data.departureTime.toDate().toDateString() === tripDayStr;
            });
            if (existingReq) await handleJoinRequestFromModal(existingReq.data().pickupLocation);
            else setShowJoinModal(true);
        } catch (error) { console.error(error); } finally { setIsJoining(false); }
    };

    const handleRemovePassengerAction = async () => {
        if (!passengerToRemove || isRemovingPassenger) return;
        setIsRemovingPassenger(true);
        try { await db.removePassenger(trip.id, passengerToRemove.uid); setPassengerToRemove(null); }
        catch (error) { alert(t('error_generic')); } finally { setIsRemovingPassenger(false); }
    };

    const activePassenger = approvedPassengers.find(p => p.uid === selectedPassenger) || (approvedPassengers.length > 0 ? approvedPassengers[0] : null);

    const handleCommunicationClick = (e: React.MouseEvent, phoneNumber: string | undefined | null, type: 'driver' | 'passenger', action: 'tel' | 'whatsapp') => {
        e.preventDefault();
        e.stopPropagation();
        if (!phoneNumber || phoneNumber.trim() === '') {
            setActiveSystemMessage({
                id: 'error_phone_' + Date.now(),
                userId: currentUserId,
                type: 'info',
                title: t(type === 'driver' ? 'error_no_phone_driver' : 'error_no_phone_passenger'),
                message: '',
                isRead: false,
                createdAt: Timestamp.now(),
                metadata: { isError: true }
            });
            return;
        }
        
        if (action === 'tel') {
            window.location.href = `tel:${phoneNumber}`;
        } else {
            const link = getWhatsappLink(phoneNumber);
            window.open(link, '_blank');
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`group relative bg-white dark:bg-slate-900 rounded-[2.2rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 w-full max-w-[340px] mx-auto mb-4 flex ${themeClasses.glow}`}
        >
            <ChatModal isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} trip={trip} />
            <JoinPickupModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} onConfirm={handleJoinRequestFromModal} />
            <InviteSelectionModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} passengerId={trip.driverId} passengerName={trip.driverName} direction={trip.direction} onInviteSent={() => {}} onPostTripClick={() => onPostTripClick?.()} />

            <div className={`w-1.5 shrink-0 ${themeClasses.accent} opacity-80 group-hover:opacity-100 transition-all`}></div>

            <div className="flex-1 p-5 flex flex-col relative">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 min-w-0 text-start flex-1">
                        <div className="relative shrink-0">
                            <div className="w-12 h-12 rounded-[1.2rem] overflow-hidden border-2 border-white dark:border-slate-800 shadow-md bg-slate-50">{displayPhoto ? <img src={displayPhoto} className="w-full h-full object-cover" /> : <div className={`w-full h-full flex items-center justify-center font-black text-base ${themeClasses.text}`}>{displayName.charAt(0)}</div>}</div>
                            {isOwner && <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white p-1 rounded-lg shadow-lg border border-white dark:border-slate-900"><ShieldCheck size={10} strokeWidth={4} /></div>}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h4 className="text-[16px] font-black text-slate-900 dark:text-white truncate leading-tight mb-0.5">{displayName}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-widest ${themeClasses.text} opacity-80 shrink-0`}>{t(isRequest ? 'trip_type_request' : 'trip_type_offer')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={handleShare} className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm active:scale-90 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60"><Share2 size={18} /></button>
                        {isOwner && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit && onEdit(trip); }} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 dark:bg-slate-800 rounded-xl transition-all active:scale-90 shadow-sm border border-slate-100 dark:border-slate-700 shrink-0"><Edit3 size={18} /></button>}
                    </div>
                </div>

                {isClosed && !isRequest && (
                    <div className="mb-4 animate-scale-in">
                        <div className={`relative overflow-hidden w-full py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm border ${isFull && !trip.isClosed ? 'bg-amber-500/10 border-amber-200/50 text-amber-600' : 'bg-slate-900 border-slate-800 text-white'}`}>
                            <div className="relative z-10 flex items-center gap-2">
                                {isFull && !trip.isClosed ? <><div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-md animate-bounce"><Info size={12} strokeWidth={4} /></div><span className="text-[11px] font-black uppercase tracking-[0.1em]">{t('trip_full')}</span></> : <><div className="w-5 h-5 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-md"><Lock size={11} strokeWidth={4} /></div><span className="text-[11px] font-black uppercase tracking-[0.1em]">{t('ride_closed')}</span></>}
                            </div>
                        </div>
                    </div>
                )}

                <div className={`bg-slate-50/60 dark:bg-slate-800/40 rounded-[1.8rem] p-4 mb-4 border border-slate-100 dark:border-slate-700/50 transition-all`}>
                    <div className="flex items-center justify-between relative z-10">
                        <div className="flex flex-col items-center gap-1.5 flex-1"><span className="text-[12px] font-black text-slate-800 dark:text-white tracking-tight">{fromCity}</span><div className={`w-2.5 h-2.5 rounded-full border-2 ${isRequest ? 'border-violet-500' : 'border-indigo-500'} bg-white dark:bg-slate-900 shadow-sm`}></div></div>
                        <div className="flex-1 flex flex-col items-center relative px-2"><div className="w-full border-t-2 border-dashed border-slate-200 dark:border-slate-700 absolute top-[11px] z-0"></div><div className={`p-1.5 rounded-full ${themeClasses.accent} text-white shadow-lg relative z-10 mb-2 transform group-hover:scale-110 transition-transform`}>{isRequest ? <User size={10} strokeWidth={4} /> : <CarFront size={10} strokeWidth={4} />}</div><div className="relative z-10 bg-white dark:bg-slate-700 px-3 py-0.5 rounded-full border border-slate-100 dark:border-slate-600 shadow-sm"><span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tighter whitespace-nowrap">{dayNameStr} {dayAndMonthStr}</span></div></div>
                        <div className="flex flex-col items-center gap-1.5 flex-1"><span className="text-[12px] font-black text-slate-800 dark:text-white tracking-tight">{toCity}</span><div className="w-2.5 h-2.5 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-sm"></div></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 py-3.5 px-3 rounded-2xl flex items-center gap-3 shadow-sm"><div className={`shrink-0 p-2.5 rounded-xl ${themeClasses.light} ${themeClasses.text}`}><Clock size={16} strokeWidth={3} /></div><div className="flex flex-col min-w-0 text-start leading-tight"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('departure_time')}</span><span className="text-[16px] font-black text-slate-900 dark:text-white">{departureTimeStr}</span></div></div>
                    <div className={`bg-white dark:bg-slate-800 border py-3.5 px-3 rounded-2xl flex items-center gap-3 shadow-sm transition-colors ${isFull ? 'border-amber-100 dark:border-amber-900/30' : 'border-slate-100 dark:border-slate-700'}`}><div className={`shrink-0 p-2.5 rounded-xl ${isRequest ? 'bg-violet-50 text-violet-600' : (isFull ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600')}`}>{isRequest ? <UserPlus size={16} strokeWidth={3} /> : <UserCheck size={16} strokeWidth={3} />}</div><div className="flex flex-col min-w-0 text-start leading-tight overflow-visible"><span className="text-[9px] font-black text-slate-400 uppercase tracking-tight mb-0.5 leading-none whitespace-nowrap">{t(isRequest ? 'seats_full_label_request' : 'seats_full_label_offer')}</span><span className={`text-[16px] font-black ${isRequest ? 'text-violet-600' : (isFull ? 'text-amber-600' : 'text-emerald-600')} transition-transform`}>{trip.availableSeats}</span></div></div>
                </div>

                <div className="flex flex-col gap-0.5 px-1 mb-5 text-start"><span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">{t(isRequest ? 'departure_point_request' : 'departure_point_offer')}</span><div className="flex items-center gap-2"><div className="w-5 h-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"><MapPin size={11} className={isRequest ? 'text-violet-500' : 'text-indigo-500'} /></div><span className="text-[12px] font-bold text-slate-700 dark:text-slate-300 truncate leading-none">{displayLocation}</span></div></div>

                {isOwner && approvedPassengers.length > 0 && !isRequest && (
                    <div className="mt-1 mb-5 animate-fade-in">
                        <div className="flex items-center justify-between mb-2.5 px-1">
                             <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('passengers_title')}</h5>
                        </div>
                        <div className="flex flex-col gap-2">
                            {approvedPassengers.map((passenger) => (
                                <div key={passenger.uid} className="bg-indigo-50/20 dark:bg-indigo-900/10 p-1.5 rounded-2xl border border-indigo-100/30 dark:border-indigo-800/20 flex items-center gap-1.5 animate-fade-in shadow-sm min-h-[3.2rem] overflow-hidden">
                                    <div className="flex items-center gap-2 min-w-0 flex-1 h-full text-start">
                                        <div className="w-9 h-9 rounded-full border border-white dark:border-slate-800 overflow-hidden shrink-0 shadow-sm bg-white dark:bg-slate-700">{passenger.photo ? <img src={passenger.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs font-black text-indigo-500">{passenger.name.charAt(0)}</div>}</div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-center">
                                            <span className="text-[10px] font-black text-slate-800 dark:text-white truncate block leading-tight">{passenger.name}</span>
                                            <div className="flex items-center gap-1 opacity-70"><MapPin size={8} className="text-indigo-500 shrink-0" /><span className="text-[8px] font-bold text-slate-600 dark:text-slate-400 truncate">{passenger.requestedPickupLocation || t('loc_custom')}</span></div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0 bg-white/50 dark:bg-slate-800/50 p-0.5 rounded-lg border border-indigo-50 dark:border-slate-700">
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPassengerToRemove(null); setSelectedPassenger(passenger.uid); setTimeout(() => setShowNavOptions(true), 10); }} className="h-7 w-7 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 active:scale-90 transition-all border border-indigo-100"><Navigation size={11} /></button>
                                        <button onClick={(e) => handleCommunicationClick(e, passenger.phoneNumber, 'passenger', 'tel')} className="h-7 w-7 flex items-center justify-center bg-white dark:bg-slate-800 text-indigo-600 rounded-md hover:bg-indigo-50 active:scale-90 transition-all border border-slate-100 dark:border-slate-700"><Phone size={11} /></button>
                                        <button onClick={(e) => handleCommunicationClick(e, passenger.phoneNumber, 'passenger', 'whatsapp')} className="h-7 w-7 flex items-center justify-center bg-emerald-500 text-white rounded-md hover:bg-emerald-600 active:scale-90 transition-all border border-emerald-400">
                                            <WhatsappIcon size={12} />
                                        </button>
                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPassengerToRemove(passenger); }} className="h-7 w-7 flex items-center justify-center bg-rose-50 text-rose-500 rounded-md hover:bg-rose-100 active:scale-90 transition-all border border-rose-100"><Trash2 size={11} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-auto">
                    {isOwner ? (
                        <div className="flex flex-col gap-2.5">
                             <div className="flex gap-2.5 h-12">
                                {!isRequest && (<button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsChatOpen(true); }} className="flex-[4] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-widest relative active:scale-[0.98] transition-all"><div className="relative"><MessageCircle size={19} />{unreadCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg">{unreadCount}</span>}</div>{t('chat_title')}</button>)}
                                {isRequest && (
                                    <div className="flex-[4] h-12 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-xl flex flex-col items-center justify-center px-4 border border-violet-100 dark:border-violet-800 shadow-inner group/status">
                                        <span className="font-black text-[9px] uppercase tracking-widest opacity-60 leading-none mb-1">{t('request_status_title')}</span>
                                        <span className="font-black text-[11px] leading-none text-center">
                                            {!isAlreadyAssigned ? t('request_status_searching') : (isOwner ? t('request_status_success') : t('request_status_taken'))}
                                        </span>
                                    </div>
                                )}
                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDeleteConfirm(true); }} className="flex-1 h-12 bg-rose-50 dark:bg-rose-950/20 text-rose-500 border border-rose-100 dark:border-rose-900/30 rounded-xl flex items-center justify-center hover:bg-rose-100 active:scale-90 transition-all shadow-sm"><Trash2 size={20} /></button>
                             </div>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (isTogglingStatus) return; setIsTogglingStatus(true); db.updateTrip(trip.id, { isClosed: !trip.isClosed }).finally(() => setIsTogglingStatus(false)); }} className={`w-full h-11 rounded-xl flex items-center justify-center gap-2 border font-black uppercase tracking-widest text-[10px] transition-all active:scale-[0.98] ${trip.isClosed ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'}`}>{isTogglingStatus ? <Loader2 size={13} className="animate-spin" /> : (trip.isClosed ? <Unlock size={13} /> : <Lock size={13} />)}{t(trip.isClosed ? 'open_ride' : 'close_ride')}</button>
                        </div>
                    ) : (isApproved || isPending) ? (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex gap-2.5 h-12">{isApproved && !isRequest && (<><button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsChatOpen(true); }} className="flex-[3.5] h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 font-black text-[12px] uppercase tracking-widest relative active:scale-[0.98] transition-all"><div className="relative"><MessageCircle size={19} />{unreadCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 shadow-lg">{unreadCount}</span>}</div>{t('chat_title')}</button><button onClick={(e) => handleCommunicationClick(e, driverPhoneNumber, 'driver', 'tel')} className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"><Phone size={20} /></button><button onClick={(e) => handleCommunicationClick(e, driverPhoneNumber, 'driver', 'whatsapp')} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-md"><WhatsappIcon size={20} /></button></>)}{isPending && <div className="flex-1 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center bg-amber-50 text-amber-700 border border-amber-100 shadow-inner">{t('join_pending')}</div>}</div>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowLeaveConfirm(true); }} className="w-full h-10 bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:text-rose-500 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]"><LogOut size={15} />{t('cancel')}</button>
                        </div>
                    ) : (
                        <button onClick={isRequest ? (e) => { e.preventDefault(); e.stopPropagation(); setShowInviteModal(true); } : handleJoinClick} disabled={isClosed || isJoining || (isRequest && isAlreadyAssigned)} className={`w-full h-14 rounded-[1.4rem] font-black text-sm uppercase tracking-[0.15em] transition-all active:scale-[0.97] shadow-lg flex items-center justify-center gap-2 ${isClosed || (isRequest && isAlreadyAssigned) ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 shadow-none cursor-not-allowed border border-slate-300 dark:border-slate-700' : `bg-gradient-to-tr ${themeClasses.gradient} text-white shadow-indigo-500/20 hover:-translate-y-0.5`}`}>{isJoining ? <Loader2 size={18} className="animate-spin" /> : (isRequest && isAlreadyAssigned ? t('request_status_taken') : (isClosed ? (isFull ? t('trip_full') : t('ride_closed')) : (isRequest ? t('offer_to_join') : t('join'))))}{!isClosed && !isJoining && !(isRequest && isAlreadyAssigned) && (isRequest ? <Send size={18} /> : <ChevronRight size={18} strokeWidth={4} className={dir === 'rtl' ? 'rotate-180' : ''} />)}</button>
                    )}
                </div>
            </div>

            {showDeleteConfirm && (
                <Portal>
                    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
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
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 mx-auto"><AlertTriangle size={32} className="text-amber-500" /></div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('leave_ride_modal_title')}</h4>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{t('leave_ride_modal_confirm_msg')}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={async () => { if (isLeaving) return; setIsLeaving(true); try { await db.leaveTrip(trip.id, currentUserId); setShowLeaveConfirm(false); } catch (error) { alert(t('error_generic')); } finally { setIsLeaving(false); } }} className="w-full py-4 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-600/20 active:scale-95 transition-all">{isLeaving ? <Loader2 className="animate-spin" size={20} /> : t('confirm')}</button>
                                <button onClick={() => setShowLeaveConfirm(false)} disabled={isLeaving} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ביטול</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {showNavOptions && activePassenger && (
                <Portal>
                    <div className="fixed inset-0 z-[400] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowNavOptions(false)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-[320px] rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 mx-auto">
                                <Navigation size={32} className="text-indigo-600" />
                            </div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">איך תרצו לנווט?</h4>
                            <p className="text-xs font-bold text-slate-400 mb-8 leading-relaxed">נסיעה אל: {activePassenger.requestedPickupLocation || t('loc_custom')}</p>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <a 
                                    href={`https://waze.com/ul?q=${encodeURIComponent(activePassenger.requestedPickupLocation || '')}&navigate=yes`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    onClick={() => setShowNavOptions(false)}
                                    className="w-full py-4 bg-[#33CCFF] hover:bg-[#2BB8E6] text-white rounded-2xl font-black shadow-lg shadow-blue-400/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <WazeLogo />
                                    <span>WAZE</span>
                                </a>
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activePassenger.requestedPickupLocation || '')}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    onClick={() => setShowNavOptions(false)}
                                    className="w-full py-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-800 dark:text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
                                >
                                    <GoogleMapsLogo />
                                    <span>GOOGLE MAPS</span>
                                </a>
                                <button 
                                    onClick={() => setShowNavOptions(false)}
                                    className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                                >
                                    ביטול
                                </button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}

            {passengerToRemove && (
                <Portal>
                    <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => !isRemovingPassenger && setPassengerToRemove(null)}>
                        <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in p-8 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 mx-auto"><Trash2 size={32} className="text-rose-500" /></div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('remove_passenger_confirm_title')}</h4>
                            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed">{t('remove_passenger_confirm_msg').replace('{name}', passengerToRemove.name)}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleRemovePassengerAction} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">{isRemovingPassenger ? <Loader2 className="animate-spin" size={20} /> : t('confirm_remove')}</button>
                                <button onClick={() => setPassengerToRemove(null)} disabled={isRemovingPassenger} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors">ביטול</button>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </motion.div>
    );
};

const TripCardMemo = memo(TripCard);
export default TripCardMemo;
