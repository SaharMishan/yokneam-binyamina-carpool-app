
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, dbInstance } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { ChatMessage, Trip } from '../types';
import { collection, query, where, onSnapshot, Timestamp, doc } from 'firebase/firestore';
import { X, Send, User, MessageCircle } from 'lucide-react';
import Portal from './Portal';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
}

const TypingIndicator: React.FC<{ trip: Trip }> = ({ trip }) => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribe = onSnapshot(doc(dbInstance, 'typing_status', trip.id), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const now = new Date().getTime();
                const activeTypers: string[] = [];

                Object.keys(data).forEach(userId => {
                    if (userId !== user?.uid) {
                        const timestamp = data[userId]?.toMillis();
                        // Consider typing active if updated within last 3 seconds
                        if (timestamp && now - timestamp < 3000) {
                            activeTypers.push(userId);
                        }
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

    // Resolve Names
    const getTyperName = (uid: string) => {
        if (uid === trip.driverId) return trip.driverName; // Use driver name
        const passenger = trip.passengers?.find(p => p.uid === uid);
        return passenger ? passenger.name : t('guest');
    };

    let text = "";
    if (typingUsers.length === 1) {
        const name = getTyperName(typingUsers[0]).split(' ')[0]; // Show first name only
        text = t('is_typing').replace('{name}', name); 
    } else {
        // If 2 or 3 people typing, verify if we want to list them or use count
        if (typingUsers.length <= 2) {
            const names = typingUsers.map(uid => getTyperName(uid).split(' ')[0]).join(', ');
            text = t('is_typing').replace('{name}', names); // Reuse string logic: "Dana, Yossi is typing..."
        } else {
            text = t('is_typing_plural').replace('{count}', typingUsers.length.toString());
        }
    }

    return (
        <div className="text-[10px] text-slate-400 font-bold italic px-4 py-1 animate-pulse flex items-center gap-1 transition-all duration-300">
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
    const { t, dir } = useLocalization();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(true);
    
    // Typing debounce ref
    const lastTyped = useRef<number>(0);

    // Save last read time to localStorage and notify listeners specific to this trip
    const markAsRead = () => {
        if (!isOpen) return;
        localStorage.setItem(`lastRead_${trip.id}`, Date.now().toString());
        // Dispatch CustomEvent with tripId to ensure only the relevant TripCard updates
        const event = new CustomEvent('chat_read_update', { detail: { tripId: trip.id } });
        window.dispatchEvent(event);
    };

    useEffect(() => {
        if (!isOpen) return;
        markAsRead(); // Mark read on open

        setLoading(true);
        // Optimization: Fetch filtered by tripId only to avoid needing a composite index.
        // Sorting and limiting is done client-side.
        const q = query(
            collection(dbInstance, 'messages'),
            where('tripId', '==', trip.id)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatMessage));
            
            // Client-side sort: Oldest to Newest
            msgs.sort((a, b) => {
                const tA = a.createdAt ? a.createdAt.toMillis() : Date.now();
                const tB = b.createdAt ? b.createdAt.toMillis() : Date.now();
                return tA - tB;
            });

            // Keep last 50 messages
            setMessages(msgs.slice(-50));
            setLoading(false);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
            
            // Mark read when new messages arrive while open
            markAsRead();
        });

        return () => unsubscribe();
    }, [isOpen, trip.id]);

    useEffect(() => {
        // Also mark as read when closing (to be safe)
        if (!isOpen) {
            localStorage.setItem(`lastRead_${trip.id}`, Date.now().toString());
            const event = new CustomEvent('chat_read_update', { detail: { tripId: trip.id } });
            window.dispatchEvent(event);
        }
    }, [isOpen, trip.id]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);
        
        if (user) {
            const now = Date.now();
            // Throttle typing updates to once per 1.5 seconds
            if (now - lastTyped.current > 1500) {
                lastTyped.current = now;
                db.setTypingStatus(trip.id, user.uid);
            }
        }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;

        const textToSend = newMessage.trim();
        setNewMessage(''); // Optimistic clear

        try {
            await db.sendChatMessage({
                tripId: trip.id,
                senderId: user.uid,
                senderName: user.displayName || 'User',
                text: textToSend,
                createdAt: Timestamp.now()
            });
            
            // Clear typing status immediately
            await db.clearTypingStatus(trip.id, user.uid);
            
            // Mark my own message as read immediately
            markAsRead();
        } catch (error) {
            console.error(error);
            setNewMessage(textToSend); // Restore on error
        }
    };

    // Helper to get photo URL for a sender
    const getSenderPhoto = (uid: string) => {
        if (uid === trip.driverId) return trip.driverPhoto;
        const passenger = trip.passengers?.find(p => p.uid === uid);
        return passenger?.photo;
    };

    // Helper to get name
    const getSenderName = (uid: string, fallbackName: string) => {
        if (uid === trip.driverId) return trip.driverName;
        const passenger = trip.passengers?.find(p => p.uid === uid);
        return passenger ? passenger.name : fallbackName;
    };

    if (!isOpen) return null;

    // Use Portal to ensure it renders at document body level
    return (
        <Portal>
            <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={onClose}>
                <div 
                    className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-[85dvh] sm:h-[600px] sm:max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-white/20" 
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 bg-indigo-600 dark:bg-slate-800 text-white flex items-center justify-between shrink-0 shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                                <MessageCircle size={20} className="text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{t('chat_title')}</h3>
                                <p className="text-xs text-indigo-100 opacity-80">{trip.driverName} • {trip.passengers?.filter(p=>p.status==='approved').length + 1} People</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-100 dark:bg-slate-900/50 space-y-4">
                        {loading ? (
                             <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>
                        ) : messages.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 text-sm">{t('no_messages')}</div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.senderId === user?.uid;
                                const isDriver = msg.senderId === trip.driverId;
                                const photoUrl = getSenderPhoto(msg.senderId);
                                const displayName = getSenderName(msg.senderId, msg.senderName);
                                
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-2 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            {/* Avatar */}
                                            <div className="shrink-0 mb-1">
                                                {photoUrl ? (
                                                    <img src={photoUrl} alt="" className="w-8 h-8 rounded-full object-cover border border-white dark:border-slate-700 shadow-sm" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                                        {displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1 min-w-0">
                                                {!isMe && (
                                                    <div className="flex items-center gap-1.5 px-1">
                                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{displayName}</span>
                                                        {isDriver && <span className="text-[8px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 rounded-full font-black uppercase tracking-wider">{t('driver_label')}</span>}
                                                    </div>
                                                )}
                                                <div className={`px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words relative ${
                                                    isMe 
                                                    ? 'bg-indigo-600 text-white rounded-br-none' 
                                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none'
                                                }`}>
                                                    <p className="leading-relaxed">{msg.text}</p>
                                                    <span className={`text-[9px] block mt-1 opacity-70 text-right font-medium ${isMe ? 'text-indigo-100' : 'text-slate-400'}`}>
                                                        {msg.createdAt ? msg.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }) : '...'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Typing Indicator & Input */}
                    <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0 flex flex-col">
                        <TypingIndicator trip={trip} />
                        <form onSubmit={handleSend} className="p-3 flex gap-2 pb-safe-bottom"> 
                            <input 
                                type="text" 
                                value={newMessage}
                                onChange={handleInputChange}
                                placeholder={t('chat_placeholder')}
                                className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white transition-all text-sm sm:text-base"
                            />
                            <button 
                                type="submit" 
                                disabled={!newMessage.trim()}
                                className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md transition-all active:scale-95 shrink-0"
                            >
                                <Send size={20} className={dir === 'rtl' ? 'rotate-180' : ''} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default ChatModal;
