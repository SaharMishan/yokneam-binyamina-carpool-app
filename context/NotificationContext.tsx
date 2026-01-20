
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

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            setActiveSystemMessage(null);
            dismissedIds.current = new Set();
            return;
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
            setNotifications(newNotifs);
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

    const markAsRead = async (id: string) => {
        try {
            await updateDoc(doc(dbInstance, 'notifications', id), { isRead: true });
        } catch (e) {
            console.error("Error marking read:", e);
        }
    };

    const confirmSystemMessage = () => {
        if (activeSystemMessage && user) {
            const msgId = activeSystemMessage.id;
            const storageKey = `broadcast_seen_${msgId}_${user.uid}`;
            localStorage.setItem(storageKey, 'true');
            dismissedIds.current.add(msgId);
            setActiveSystemMessage(null);
        }
    };

    const markAllAsRead = async () => {
        if(user) await db.markAllNotificationsAsRead(user.uid);
    };
    
    const createLocalNotification = async (notif: Omit<AppNotification, 'id'>) => {
        await db.createNotification(notif);
    };

    const deleteNotification = async (id: string) => {
        await db.deleteNotification(id);
    };

    const clearAllNotifications = async () => {
        if (user) await db.clearAllNotifications(user.uid);
    };

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
