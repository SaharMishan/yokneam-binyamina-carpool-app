
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { db, dbInstance } from '../services/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, limit } from 'firebase/firestore';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    activeSystemMessage: AppNotification | null;
    setActiveSystemMessage: (notif: AppNotification | null) => void;
    confirmSystemMessage: () => void;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    createLocalNotification: (notif: Omit<AppNotification, 'id'>) => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [activeSystemMessage, setActiveSystemMessage] = useState<AppNotification | null>(null);
    const dismissedIds = useRef<Set<string>>(new Set());
    const initialSyncDone = useRef(false);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setActiveSystemMessage(null);
            dismissedIds.current = new Set();
            return;
        }

        // Request notification permission
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        const q = query(
            collection(dbInstance, 'notifications'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AppNotification));
            
            newNotifs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            // Push Notification logic for new entries only after initial load
            if (initialSyncDone.current) {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const notif = change.doc.data() as AppNotification;
                        // Trigger native notification if browser supports it and it's not a read notif
                        if (!notif.isRead && 'Notification' in window && Notification.permission === 'granted') {
                            const reg = (navigator as any).serviceWorker?.ready;
                            const title = notif.title; // Translating on display
                            const options = {
                                body: notif.message.includes('|') ? notif.message.split('|')[1] : notif.message,
                                icon: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
                                badge: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
                                data: { url: notif.relatedTripId ? `/?tripId=${notif.relatedTripId}` : '/' }
                            };

                            if (reg) {
                                reg.then((r: any) => r.showNotification(title, options));
                            } else {
                                new Notification(title, options);
                            }
                        }
                    }
                });
            }

            setNotifications(newNotifs);
            initialSyncDone.current = true;
        }, (error) => {
            console.error("Notifications Sync Error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user || user.isAdmin) {
            setActiveSystemMessage(null);
            return;
        }

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const q = query(
            collection(dbInstance, 'system_announcements'),
            where('createdAt', '>', yesterday),
            orderBy('createdAt', 'desc'),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                setActiveSystemMessage(null);
                return;
            }
            const latestActiveDoc = snapshot.docs.find(doc => doc.data().isActive === true);
            if (!latestActiveDoc) {
                setActiveSystemMessage(null);
                return;
            }
            const data = latestActiveDoc.data();
            const msgId = latestActiveDoc.id;
            const storageKey = `broadcast_seen_${msgId}_${user.uid}`;
            const hasSeenGlobally = localStorage.getItem(storageKey) === 'true';
            const hasDismissedInSession = dismissedIds.current.has(msgId);
            if (data.senderId === user.uid || hasSeenGlobally || hasDismissedInSession) {
                setActiveSystemMessage(null);
                return;
            }
            setActiveSystemMessage({
                id: msgId,
                userId: user.uid,
                type: 'info',
                title: data.title || 'עדכון מערכת',
                message: data.message,
                isRead: false,
                createdAt: data.createdAt,
                metadata: { isBroadcast: true }
            });
        });
        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const markAsRead = async (id: string) => { try { await updateDoc(doc(dbInstance, 'notifications', id), { isRead: true }); } catch (e) { console.error("Error marking read:", e); } };
    const confirmSystemMessage = () => { if (activeSystemMessage && user) { const msgId = activeSystemMessage.id; const storageKey = `broadcast_seen_${msgId}_${user.uid}`; localStorage.setItem(storageKey, 'true'); dismissedIds.current.add(msgId); setActiveSystemMessage(null); } };
    const markAllAsRead = async () => { if(user) await db.markAllNotificationsAsRead(user.uid); };
    const createLocalNotification = async (notif: Omit<AppNotification, 'id'>) => { await db.createNotification(notif); };
    const deleteNotification = async (id: string) => { await db.deleteNotification(id); };
    const clearAllNotifications = async () => { if (user) await db.clearAllNotifications(user.uid); };

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            activeSystemMessage, 
            setActiveSystemMessage,
            confirmSystemMessage,
            markAsRead, 
            markAllAsRead, 
            createLocalNotification, 
            deleteNotification, 
            clearAllNotifications 
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) throw new Error('useNotifications error');
    return context;
};
