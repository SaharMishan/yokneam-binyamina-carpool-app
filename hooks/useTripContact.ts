
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { Trip } from '../types';

export const useTripContact = (trip: Trip) => {
    const { user } = useAuth();
    const [driverPhoneNumber, setDriverPhoneNumber] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Only consider the user a "passenger" if they are in the list AND approved.
    const isPassenger = user 
        ? trip.passengers?.some(p => p.uid === user.uid && p.status === 'approved') 
        : false;

    useEffect(() => {
        const fetchContact = async () => {
            if (isPassenger && user) {
                setIsLoading(true);
                // This check is crucial. The client only attempts to fetch the driver's
                // private data IF they are a confirmed approved passenger.
                const driverProfile = await db.getUserProfile(trip.driverId);
                setDriverPhoneNumber(driverProfile?.phoneNumber || 'Not Found');
                setIsLoading(false);
            } else {
                setDriverPhoneNumber(null);
            }
        };

        fetchContact();
    }, [isPassenger, trip.driverId, user]);

    return { driverPhoneNumber, isLoading, isPassenger };
};
