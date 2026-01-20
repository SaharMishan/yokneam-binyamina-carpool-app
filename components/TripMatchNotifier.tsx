
import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { db } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { Trip, AppNotification } from '../types';
import { onSnapshot, collection, query, where, Timestamp, getFirestore, getDocs } from 'firebase/firestore';
import { Bell, X } from 'lucide-react';

const TripMatchNotifier: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const { createLocalNotification } = useNotifications();
    const [activeRequest, setActiveRequest] = useState<Trip | null>(null);
    const [notification, setNotification] = useState<{ show: boolean, tripId: string } | null>(null);
    
    const sessionStartTime = useRef(Date.now());
    const notifiedIds = useRef<Set<string>>(new Set());
    
    const dbInstance = getFirestore();

    useEffect(() => {
        if (!user) return;
        const q = query(collection(dbInstance, 'trips'), where('driverId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const validRequest = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Trip))
                .filter(trip => trip.type === 'request')
                .find(trip => trip.departureTime.toDate() > now);
            setActiveRequest(validRequest || null);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!activeRequest || !user) return;

        const q = query(collection(dbInstance, 'trips'), where('direction', '==', activeRequest.direction));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const newTrip = change.doc.data() as any;
                    const tripId = change.doc.id;
                    
                    // CRITICAL FIX: Check Firestore user profile for dismissed IDs
                    const isDismissed = (user as any).dismissedMatchIds?.includes(tripId);
                    if (notifiedIds.current.has(tripId) || isDismissed) continue;
                    
                    if (newTrip.type !== 'offer') continue;

                    const tripCreatedAt = newTrip.createdAt?.toMillis() || 0;
                    if (tripCreatedAt < sessionStartTime.current) continue;
                    
                    const requestTime = activeRequest.departureTime.toDate().getTime();
                    const offerTime = newTrip.departureTime.toDate().getTime();
                    const timeDiff = Math.abs(offerTime - requestTime);
                    const ONE_HOUR_MS = 60 * 60 * 1000;

                    if (timeDiff <= (ONE_HOUR_MS * 1.5)) {
                        const notifQ = query(
                            collection(dbInstance, 'notifications'),
                            where('userId', '==', user.uid),
                            where('relatedTripId', '==', tripId),
                            where('type', '==', 'match')
                        );
                        const existingNotifs = await getDocs(notifQ);
                        
                        if (existingNotifs.empty) {
                            notifiedIds.current.add(tripId);
                            setNotification({ show: true, tripId: tripId });
                            
                            createLocalNotification({
                                userId: user.uid,
                                type: 'match',
                                title: 'match_found_title',
                                message: 'match_found_desc',
                                relatedTripId: tripId,
                                isRead: false,
                                createdAt: Timestamp.now()
                            });

                            setTimeout(() => setNotification(null), 6000);
                        }
                    }
                }
            }
        });

        return () => unsubscribe();
    }, [activeRequest, user]);

    const handleDismiss = async () => {
        if (notification && user) {
            const tid = notification.tripId;
            setNotification(null);
            // Persistent dismiss in Firestore
            await db.dismissMatch(user.uid, tid);
        }
    };

    if (!notification || !notification.show) return null;

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-fade-in">
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-emerald-500/50 backdrop-blur-md">
                <div className="bg-white/20 p-2 rounded-full shrink-0"><Bell size={20} className="animate-pulse" /></div>
                <div className="flex-1">
                    <h4 className="font-bold text-sm">{t('match_found_title')}</h4>
                    <p className="text-xs text-emerald-100 mt-1">{t('match_found_desc')}</p>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={16} /></button>
            </div>
        </div>
    );
};

export default TripMatchNotifier;
