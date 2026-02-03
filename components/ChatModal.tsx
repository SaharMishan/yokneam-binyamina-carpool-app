
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, dbInstance } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { ChatMessage, Trip } from '../types';
import { collection, query, where, onSnapshot, Timestamp, doc, orderBy } from 'firebase/firestore';
import { X, Send, MessageCircle, MapPin, Camera, Image as ImageIcon, Loader2, Navigation, Map as MapIcon, AlertCircle, Lock, Info, Compass } from 'lucide-react';
import Portal from './Portal';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
}

// לוגו Waze המקורי
const WazeLogo = () => (
    <svg width="16" height="16" viewBox="0 0 122.71 122.88" xmlns="http://www.w3.org/2000/svg">
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
    <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06 C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88 C37.49,14.05,38,16.21,38,18.5C38,21.4,37.17,24.09,35.76,26.36z"></path>
        <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15 c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"></path>
        <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"></path>
        <path fill="#ed5748" d="M19.83,14.92L19.76,15l-8.32,9.88C10.52,22.95,10,20.79,10,18.5c0-3.54,1.23-6.79,3.27-9.3 L19.83,14.92z"></path>
        <path fill="#5695f6" d="M28.24,22c0.79-0.95,1.26-2.17,1.26-3.5c0-3.04-2.46-5.5-5.5-5.5c-1.71,0-3.24,0.78-4.24,2L28.4,4.74 c3.59,1.22,6.53,3.91,8.17,7.38L28.24,22z"></path>
    </svg>
);

const TypingIndicator: React.FC<{ trip: Trip }> = ({ trip }) => {
    const { user } = useAuth();
    const { t, language } = useLocalization();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(dbInstance, 'typing_status', trip.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const now = Date.now();
                const activeTypers: string[] = [];
                Object.keys(data).forEach(userId => {
                    if (userId !== user?.uid) {
                        const timestamp = data[userId]?.toMillis();
                        if (timestamp && now - timestamp < 4000) activeTypers.push(userId);
                    }
                });
                setTypingUsers(activeTypers);
            } else {
                setTypingUsers([]);
            }
        });
        return () => unsubscribe();
    }, [trip.id, user?.uid]);

    if (typingUsers.length === 0) return null;

    const getTyperName = (uid: string) => {
        if (uid === trip.driverId) return trip.driverName;
        const passenger = trip.passengers?.find(p => p.uid === uid);
        return passenger ? passenger.name : t('guest');
    };

    let text = "";
    if (typingUsers.length === 1) {
        const name = getTyperName(typingUsers[0]).split(' ')[0];
        text = t('is_typing').replace('{name}', name); 
    } else {
        const count = typingUsers.length;
        text = language === 'he' ? `${count} אנשים מקלידים...` : `${count} people are typing...`;
    }

    return (
        <div className="text-[10px] text-slate-400 font-black italic px-4 py-1 animate-pulse flex items-center gap-1 text-start">
            <span>{text}</span>
            <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </span>
        </div>
    );
};

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, trip }) => {
    const { user } = useAuth();
    const { t, dir, language } = useLocalization();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [sendingMedia, setSendingMedia] = useState(false);
    const [sendingLocation, setSendingLocation] = useState(false);
    const [showLocationBlockedModal, setShowLocationBlockedModal] = useState(false);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const lastTyped = useRef<number>(0);
    
    const approvedPassengers = trip.passengers?.filter(p => p.status === 'approved') || [];

    const updateReadStatus = (latestMsgs?: ChatMessage[]) => {
        if (!user || !trip.id) return;
        const storageKey = `lastRead_${trip.id}_${user.uid}`;
        
        // הגדרה של זמן קריאה עתידי משמעותי (3 דקות קדימה) כדי להבטיח איפוס מוחלט של המונה
        let timestamp = Date.now() + 180000; 
        
        if (latestMsgs && latestMsgs.length > 0) {
            const lastMsgTime = latestMsgs[latestMsgs.length - 1].createdAt?.toMillis();
            if (lastMsgTime) timestamp = Math.max(timestamp, lastMsgTime + 10000);
        }
        
        localStorage.setItem(storageKey, timestamp.toString());
        // שיגור אירוע גלובלי כדי לעדכן את המונה בכרטיסי הנסיעה באופן מיידי
        window.dispatchEvent(new CustomEvent('chatRead', { detail: { tripId: trip.id } }));
    };

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
        }, 150);
    };

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        const qWithOrder = query(
            collection(dbInstance, 'messages'), 
            where('tripId', '==', trip.id),
            orderBy('createdAt', 'asc')
        );

        const qSimple = query(
            collection(dbInstance, 'messages'),
            where('tripId', '==', trip.id)
        );
        
        const processSnapshot = (snapshot: any) => {
            let msgs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as ChatMessage));
            
            if (snapshot.query === qSimple) {
                msgs.sort((a: any, b: any) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            }

            setMessages(msgs);
            setLoading(false);
            updateReadStatus(msgs);
            scrollToBottom(messages.length === 0 ? 'auto' : 'smooth');
        };

        const unsubscribe = onSnapshot(qWithOrder, processSnapshot, (err) => {
            if (err.message.includes('requires an index') || err.message.includes('FAILED_PRECONDITION')) {
                onSnapshot(qSimple, processSnapshot);
            } else {
                setLoading(false);
            }
        });
        
        return () => {
            unsubscribe();
            if (user) db.clearTypingStatus(trip.id, user.uid);
        };
    }, [isOpen, trip.id, user?.uid]);

    useEffect(() => {
        if (isOpen && messages.length > 0) scrollToBottom();
    }, [messages.length]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewMessage(val);
        if (!user) return;
        if (val.trim() === '') {
            db.clearTypingStatus(trip.id, user.uid);
            lastTyped.current = 0;
        } else {
            const now = Date.now();
            if (now - lastTyped.current > 2000) {
                lastTyped.current = now;
                db.setTypingStatus(trip.id, user.uid);
            }
        }
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() || !user) return;
        const txt = newMessage.trim();
        setNewMessage('');
        db.clearTypingStatus(trip.id, user.uid);
        try {
            await db.sendChatMessage({ tripId: trip.id, senderId: user.uid, senderName: user.displayName || t('guest'), text: txt, type: 'text', createdAt: Timestamp.now() });
            updateReadStatus();
            scrollToBottom();
        } catch (error) { setNewMessage(txt); }
    };

    const handleSendLocation = () => {
        if (!user || sendingLocation || sendingMedia) return;
        
        if (!navigator.geolocation) {
            alert(language === 'he' ? 'הדפדפן שלך לא תומך בשיתוף מיקום' : 'Your browser does not support geolocation');
            return;
        }

        setSendingLocation(true);
        
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 8000, 
            maximumAge: 0
        };

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    await db.sendChatMessage({ 
                        tripId: trip.id, 
                        senderId: user.uid, 
                        senderName: user.displayName || t('guest'), 
                        location: { lat: latitude, lng: longitude }, 
                        type: 'location', 
                        createdAt: Timestamp.now() 
                    });
                    updateReadStatus();
                    scrollToBottom();
                } catch (dbErr: any) {
                    console.error("Firestore error:", dbErr.message);
                } finally {
                    setSendingLocation(false);
                }
            },
            (err) => {
                setSendingLocation(false);
                if (err.code === 1) { // PERMISSION_DENIED
                    setShowLocationBlockedModal(true);
                } else if (err.code === 3) { // TIMEOUT
                    alert(language === 'he' ? 'זמן ההמתנה למיקום הסתיים. נסה שוב במקום פתוח יותר.' : 'Location request timed out.');
                } else {
                    alert(language === 'he' ? 'לא ניתן לקבוע מיקום כרגע. וודא שה-GPS פועל.' : 'Unable to get location.');
                }
            },
            geoOptions
        );
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user || sendingMedia) return;
        setSendingMedia(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                await db.sendChatMessage({ tripId: trip.id, senderId: user.uid, senderName: user.displayName || t('guest'), imageUrl: reader.result as string, type: 'image', createdAt: Timestamp.now() });
                updateReadStatus();
            } finally { 
                setSendingMedia(false); 
                if (fileInputRef.current) fileInputRef.current.value = ''; 
                if (cameraInputRef.current) cameraInputRef.current.value = ''; 
            }
        };
        reader.readAsDataURL(file);
    };

    if (!isOpen) return null;

    return (
        <Portal>
            {showLocationBlockedModal && (
                <div className="fixed inset-0 z-[1001] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowLocationBlockedModal(false)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-sm rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10 animate-scale-in relative" onClick={e => e.stopPropagation()}>
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center text-amber-600 ring-8 ring-amber-50/50 dark:ring-amber-900/10">
                                    <Lock size={40} className="animate-pulse" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 p-1.5 rounded-full shadow-md border border-slate-100 dark:border-slate-700">
                                    <MapPin size={16} className="text-indigo-600" />
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-4 leading-tight">
                                {language === 'he' ? 'גישה למיקום חסומה' : 'Location Access Blocked'}
                            </h3>
                            
                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50 mb-8">
                                <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed text-start">
                                    {language === 'he' 
                                        ? 'הגישה למיקום חסומה. כדי לשתף מיקום, עליך ללחוץ על סמל המנעול (🔒) שליד כתובת האתר למעלה ולבחור "אפשר" (Allow) עבור מיקום.'
                                        : 'Location access is blocked. Please click the lock icon (🔒) near the URL and choose "Allow" for Location.'}
                                </p>
                            </div>
                            
                            <button 
                                onClick={() => setShowLocationBlockedModal(false)}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 shadow-indigo-500/20"
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {previewImage && (
                <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                    <button onClick={() => setPreviewImage(null)} className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white transition-all active:scale-90"><X size={24} /></button>
                    <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-3xl shadow-2xl object-contain animate-scale-in" onClick={e => e.stopPropagation()} />
                </div>
            )}

            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-[90dvh] sm:h-[650px] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20" onClick={e => e.stopPropagation()}>
                    <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-lg z-20">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner"><MessageCircle size={22} /></div>
                            <div>
                                <h3 className="font-black text-lg leading-tight tracking-tight">{t('chat_title')}</h3>
                                <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest mt-0.5">
                                    {t('chat_header_status')
                                        .replace('{driver}', t('driver_label'))
                                        .replace('{count}', approvedPassengers.length.toString())}
                                </p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"><X size={22} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-[#F8FAFC] dark:bg-slate-950 space-y-6 scrollbar-hide relative">
                        {sendingLocation && (
                            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-xl flex items-center gap-2 animate-bounce border border-white/20 whitespace-nowrap">
                                <Loader2 size={14} className="animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-tight">מנסה לקבל מיקום...</span>
                            </div>
                        )}
                        
                        {loading ? (<div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 size={32} className="animate-spin text-indigo-50" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">טוען הודעות...</span></div>) : messages.length === 0 ? (<div className="text-center py-20 flex flex-col items-center gap-4 animate-fade-in"><div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300"><MessageCircle size={32} /></div><p className="text-slate-400 text-sm font-black uppercase tracking-widest leading-relaxed">{t('no_messages')}</p></div>) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === user?.uid;
                                const isDriver = msg.senderId === trip.driverId;
                                const roleLabel = isDriver ? t('driver_label') : t('passenger_label');
                                const isRichContent = msg.type === 'location' || msg.type === 'image';

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-slide-up`}>
                                        <div className={`max-w-[245px] ${isRichContent ? 'p-0 bg-transparent shadow-none' : 'px-4 py-3'} rounded-[1.8rem] shadow-sm text-sm ${isMe && !isRichContent ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-600/10' : !isRichContent ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-100 dark:border-slate-700' : ''}`}>
                                            {!isMe && !isRichContent && (
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block truncate max-w-[120px]">{msg.senderName}</span>
                                                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-lg ${isDriver ? 'bg-amber-100 text-amber-600' : 'bg-indigo-50 text-indigo-500'}`}>{roleLabel}</span>
                                                </div>
                                            )}
                                            {msg.type === 'text' && <p className="leading-relaxed font-bold">{msg.text}</p>}
                                            {msg.type === 'image' && (
                                                <div className="relative group cursor-pointer rounded-[2rem] overflow-hidden border-2 border-white dark:border-slate-700 shadow-xl w-[170px] h-[170px] shrink-0" onClick={() => setPreviewImage(msg.imageUrl || null)}>
                                                    <img src={msg.imageUrl} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            )}
                                            {msg.type === 'location' && msg.location && (
                                                <div className="w-[170px] bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl border border-indigo-100 dark:border-indigo-900 overflow-hidden flex flex-col group transition-all duration-300">
                                                    <div className="h-16 w-full relative overflow-hidden flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40">
                                                        <div className="absolute inset-0 opacity-20" 
                                                             style={{ 
                                                                 backgroundImage: 'linear-gradient(#e0e7ff 1px, transparent 1px), linear-gradient(90deg, #e0e7ff 1px, transparent 1px)',
                                                                 backgroundSize: '15px 15px'
                                                             }}>
                                                        </div>
                                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/10 to-transparent h-full w-full animate-[scan_3s_linear_infinite]"></div>
                                                        
                                                        <div className="relative bg-white dark:bg-slate-700 p-1.5 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900 group-hover:scale-110 transition-transform duration-500 z-10">
                                                            <MapPin size={18} className="text-indigo-600 animate-bounce" fill="currentColor" fillOpacity={0.1} />
                                                        </div>
                                                    </div>

                                                    <div className="p-2.5 text-center bg-white dark:bg-slate-800 border-t border-indigo-50 dark:border-slate-700">
                                                        <h4 className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight truncate leading-tight">
                                                            {isMe ? 'המיקום שלי' : `המיקום של ${msg.senderName.split(' ')[0]}`}
                                                        </h4>
                                                    </div>
                                                    
                                                    <div className="px-2 pb-2.5 pt-0.5 bg-slate-50/50 dark:bg-slate-800/50 grid grid-cols-2 gap-2 h-10">
                                                        <a href={`https://waze.com/ul?ll=${msg.location.lat},${msg.location.lng}&navigate=yes`} target="_blank" rel="noreferrer" className="h-full bg-[#33CCFF] hover:bg-[#2BB8E6] text-white rounded-xl flex flex-row items-center justify-center gap-1 px-1 transition-all active:scale-95 shadow-sm group/btn overflow-hidden">
                                                            <div className="shrink-0 scale-75"><WazeLogo /></div>
                                                            <span className="text-[8px] font-black tracking-widest uppercase whitespace-nowrap">WAZE</span>
                                                        </a>
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${msg.location.lat},${msg.location.lng}`} target="_blank" rel="noreferrer" className="h-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-xl flex flex-row items-center justify-center gap-1 px-1 transition-all active:scale-95 shadow-sm group/btn overflow-hidden">
                                                            <div className="shrink-0 scale-75"><GoogleMapsLogo /></div>
                                                            <span className="text-[8px] font-black tracking-tight uppercase whitespace-nowrap">GOOGLE</span>
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {!isRichContent && (
                                                <span className={`text-[8px] block mt-1.5 ${isMe ? 'text-white/60 text-start' : 'text-slate-400 text-end'} font-black uppercase tracking-widest px-1`}>
                                                    {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>

                    <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-4 pb-safe shrink-0 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                        <TypingIndicator trip={trip} />
                        <div className="flex items-center gap-3 mb-3 px-1">
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
                            <button onClick={() => cameraInputRef.current?.click()} disabled={sendingMedia || sendingLocation} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all active:scale-90" title={t('take_photo')}><Camera size={22} /></button>
                            <button onClick={() => fileInputRef.current?.click()} disabled={sendingMedia || sendingLocation} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-indigo-600 transition-all active:scale-90"><ImageIcon size={22} /></button>
                            <button onClick={handleSendLocation} disabled={sendingLocation || sendingMedia} className={`p-2.5 rounded-xl transition-all active:scale-90 ${sendingLocation ? 'bg-indigo-600 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-indigo-600'}`}>
                                {sendingLocation ? <Loader2 size={22} className="animate-spin" /> : <MapPin size={22} />}
                            </button>
                        </div>
                        <form onSubmit={handleSend} className="flex gap-3"> 
                            <input type="text" value={newMessage} onChange={handleInputChange} placeholder={t('chat_placeholder')} className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-800 dark:text-white placeholder-slate-400 shadow-inner" />
                            <button type="submit" disabled={!newMessage.trim() || sendingMedia || sendingLocation} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-600/30 active:scale-90 transition-all"><Send size={24} className={dir === 'rtl' ? 'rotate-180' : ''} /></button>
                        </form>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    from { transform: translateY(-100%); }
                    to { transform: translateY(100%); }
                }
            `}</style>
        </Portal>
    );
};

export default ChatModal;
