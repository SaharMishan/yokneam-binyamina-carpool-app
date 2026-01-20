
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { Trip, UserProfile } from '../types';

export const useTripContact = (trip: Trip) => {
    const { user } = useAuth();
    const [driverProfile, setDriverProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // תמיד נמשוך את הפרופיל העדכני של בעל הנסיעה כדי לסנכרן שמות ותמונות
    useEffect(() => {
        let isMounted = true;
        const fetchProfile = async () => {
            setIsLoading(true);
            try {
                const profile = await db.getUserProfile(trip.driverId);
                if (isMounted) {
                    setDriverProfile(profile);
                }
            } catch (error) {
                console.error("Error fetching driver profile:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchProfile();
        return () => { isMounted = false; };
    }, [trip.driverId]);

    // בדיקה האם המשתמש הנוכחי הוא נוסע מאושר (לחשיפת טלפון למשל)
    const isApprovedPassenger = user 
        ? trip.passengers?.some(p => p.uid === user.uid && p.status === 'approved') 
        : false;

    return { 
        driverProfile, 
        driverPhoneNumber: (isApprovedPassenger || user?.uid === trip.driverId) ? driverProfile?.phoneNumber : null,
        isLoading, 
        isApprovedPassenger 
    };
};
