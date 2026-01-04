
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, dbInstance } from '../services/firebase';
import { useAuth } from './AuthContext';
import { AppNotification } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
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
    
    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        // Using consistent dbInstance from services/firebase
        const q = query(
            collection(dbInstance, 'notifications'),
            where('userId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newNotifs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AppNotification));
            
            // Sort in memory: Newest first
            newNotifs.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            
            setNotifications(newNotifs);
        }, (error) => {
            console.error("Notifications snapshot error:", error);
        });

        return () => unsubscribe();
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const markAsRead = async (id: string) => {
        await db.markNotificationAsRead(id);
    };

    const markAllAsRead = async () => {
        if(user) {
            await db.markAllNotificationsAsRead(user.uid);
        }
    };
    
    const createLocalNotification = async (notif: Omit<AppNotification, 'id'>) => {
        await db.createNotification(notif);
    };

    const deleteNotification = async (id: string) => {
        await db.deleteNotification(id);
    };

    const clearAllNotifications = async () => {
        if (user) {
            await db.clearAllNotifications(user.uid);
        }
    };

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, createLocalNotification, deleteNotification, clearAllNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
