
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { db } from '../services/firebase';
import { useLocalization } from '../context/LocalizationContext';
import { Trip } from '../types';
import { onSnapshot, collection, query, where, Timestamp, getFirestore } from 'firebase/firestore';
import { Bell, X } from 'lucide-react';

const TripMatchNotifier: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLocalization();
    const { createLocalNotification } = useNotifications();
    const [activeRequest, setActiveRequest] = useState<Trip | null>(null);
    const [notification, setNotification] = useState<{ show: boolean, tripId: string } | null>(null);
    
    const dbInstance = getFirestore();

    // 1. Check if the current user has an active request (Seeking Ride)
    useEffect(() => {
        if (!user) return;

        // Simplified query to avoid composite index
        const q = query(
            collection(dbInstance, 'trips'),
            where('driverId', '==', user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const validRequest = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Trip))
                // Filter type and date in memory
                .filter(trip => trip.type === 'request')
                .find(trip => trip.departureTime.toDate() > now);

            setActiveRequest(validRequest || null);
        });

        return () => unsubscribe();
    }, [user]);

    // 2. If user has a request, listen for NEW offers matching that request
    useEffect(() => {
        if (!activeRequest || !user) return;

        // Simplified query: filter by direction only
        const q = query(
            collection(dbInstance, 'trips'),
            where('direction', '==', activeRequest.direction)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const newTrip = change.doc.data() as Trip;
                    
                    // Filter type 'offer' in memory
                    if (newTrip.type !== 'offer') return;
                    
                    const requestTime = activeRequest.departureTime.toDate().getTime();
                    const offerTime = newTrip.departureTime.toDate().getTime();
                    const timeDiff = Math.abs(offerTime - requestTime);
                    const ONE_HOUR_MS = 60 * 60 * 1000;

                    // If offer is within +/- 1.5 hours of request
                    if (timeDiff <= (ONE_HOUR_MS * 1.5)) {
                        // Show visual toast
                        setNotification({ show: true, tripId: change.doc.id });
                        
                        // PERSIST NOTIFICATION to DB
                        createLocalNotification({
                            userId: user.uid,
                            type: 'match',
                            title: 'notif_match_title',
                            message: 'notif_match_msg',
                            relatedTripId: change.doc.id,
                            isRead: false,
                            createdAt: Timestamp.now()
                        });

                        // Auto hide toast after 6 seconds
                        setTimeout(() => setNotification(null), 6000);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [activeRequest, user]);

    if (!notification || !notification.show) return null;

    return (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-fade-in">
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-start gap-3 border border-emerald-500/50 backdrop-blur-md">
                <div className="bg-white/20 p-2 rounded-full shrink-0">
                    <Bell size={20} className="animate-pulse" />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-sm">{t('match_found_title')}</h4>
                    <p className="text-xs text-emerald-100 mt-1">{t('match_found_desc')}</p>
                </div>
                <button 
                    onClick={() => setNotification(null)}
                    className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default TripMatchNotifier;
