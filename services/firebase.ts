
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
    createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    User
} from "firebase/auth";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    arrayUnion, 
    query, 
    where, 
    runTransaction,
    increment,
    orderBy,
    onSnapshot,
    Timestamp,
    writeBatch,
    limit,
    serverTimestamp,
    deleteField
} from "firebase/firestore";
import { Trip, UserProfile, Direction, AppNotification, NotificationType, Passenger, Report, ChatMessage } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw",
  authDomain: "carpool-yokneam.firebaseapp.com",
  projectId: "carpool-yokneam",
  storageBucket: "carpool-yokneam.firebasestorage.app",
  messagingSenderId: "374315181940",
  appId: "1:374315181940:web:e322c995e8c3b25e3eee21",
  measurementId: "G-LB4XC4NRZQ"
};

const app = initializeApp(firebaseConfig);
export const authInstance = getAuth(app);
export const dbInstance = getFirestore(app);

export const auth = {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return firebaseOnAuthStateChanged(authInstance, callback);
    },
    signOut: () => firebaseSignOut(authInstance),
    signInWithEmailAndPassword: (email: string, pass: string) => firebaseSignInWithEmailAndPassword(authInstance, email, pass),
    createUserWithEmailAndPassword: (email: string, pass: string) => firebaseCreateUserWithEmailAndPassword(authInstance, email, pass),
    sendPasswordResetEmail: (email: string) => firebaseSendPasswordResetEmail(authInstance, email),
    signInWithGoogle: () => signInWithPopup(authInstance, new GoogleAuthProvider()),
    setPersistence: (persistenceType: 'local' | 'session') => 
        setPersistence(authInstance, persistenceType === 'local' ? browserLocalPersistence : browserSessionPersistence),
    currentUser: authInstance.currentUser
};

// Helper function to find and update passenger's matching requests
const updatePassengerRequestsStatus = async (transaction: any, passengerId: string, direction: Direction, departureTime: Timestamp, shouldClose: boolean) => {
    const tripsRef = collection(dbInstance, 'trips');
    const dayStart = new Date(departureTime.toDate());
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(departureTime.toDate());
    dayEnd.setHours(23,59,59,999);

    const q = query(
        tripsRef, 
        where('driverId', '==', passengerId),
        where('type', '==', 'request'),
        where('direction', '==', direction)
    );
    
    const snap = await getDocs(q);
    snap.docs.forEach(d => {
        const tripData = d.data() as Trip;
        const tripDate = tripData.departureTime.toDate();
        if (tripDate >= dayStart && tripDate <= dayEnd) {
            transaction.update(d.ref, { isClosed: shouldClose });
        }
    });
};

// Helper to clean up specific request notifications to avoid duplicates/stale state
const deleteRequestNotification = async (tripId: string, passengerId: string) => {
    try {
        const q = query(
            collection(dbInstance, 'notifications'),
            where('type', '==', 'request'),
            where('relatedTripId', '==', tripId),
            where('metadata.passengerId', '==', passengerId)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        if (!snapshot.empty) await batch.commit();
    } catch (e) {
        console.error("Error cleaning up request notifications", e);
    }
};

export const db = {
    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        try {
            const docRef = doc(dbInstance, 'users', uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? (docSnap.data() as UserProfile) : null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },
    createUserProfile: async (userProfile: UserProfile): Promise<void> => {
        try {
            await setDoc(doc(dbInstance, 'users', userProfile.uid), {
                ...userProfile,
                createdAt: Timestamp.now(), // Store creation time
                privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
            }, { merge: true });
        } catch (error) {
            console.error("Error creating user profile:", error);
            throw error;
        }
    },
    updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
        try {
            const docRef = doc(dbInstance, 'users', uid);
            await setDoc(docRef, data, { merge: true });
        } catch (error) {
            console.error("Error updating user profile:", error);
            throw error;
        }
    },
    getTrip: async (tripId: string): Promise<Trip | null> => {
        try {
            const docRef = doc(dbInstance, 'trips', tripId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Trip) : null;
        } catch (error) {
            console.error("Error fetching trip:", error);
            return null;
        }
    },
    getTrips: async (direction?: Direction): Promise<Trip[]> => {
        try {
            let q;
            if (direction) {
                q = query(collection(dbInstance, 'trips'), where('direction', '==', direction));
            } else {
                q = query(collection(dbInstance, 'trips'));
            }
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        } catch (error) {
            console.error("Error fetching trips:", error);
            return [];
        }
    },
    addTrip: async (tripData: Omit<Trip, 'id'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'trips'), tripData);
        } catch (error) {
            console.error("Error adding trip:", error);
            throw error;
        }
    },
    updateTrip: async (tripId: string, data: Partial<Trip>): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            const oldTripSnap = await getDoc(tripRef);
            
            if (oldTripSnap.exists()) {
                const oldTrip = oldTripSnap.data() as Trip;
                const timeChanged = data.departureTime && data.departureTime.toMillis() !== oldTrip.departureTime.toMillis();
                const locationChanged = data.pickupLocation && data.pickupLocation !== oldTrip.pickupLocation;

                if (timeChanged || locationChanged) {
                    const batch = writeBatch(dbInstance);
                    const passengers = (oldTrip.passengers || []).filter(p => p.status === 'approved');
                    
                    passengers.forEach(p => {
                        const notifRef = doc(collection(dbInstance, 'notifications'));
                        batch.set(notifRef, {
                            userId: p.uid,
                            type: 'info',
                            title: 'notif_trip_updated_title',
                            message: 'notif_trip_updated_msg',
                            relatedTripId: tripId,
                            isRead: false,
                            createdAt: Timestamp.now()
                        });
                    });
                    
                    batch.update(tripRef, data as any);
                    await batch.commit();
                } else {
                    await updateDoc(tripRef, data as any);
                }
            }
        } catch (error) {
            console.error("Error updating trip:", error);
            throw error;
        }
    },
    
    // New function to update a passenger's specific details (e.g. pickup location)
    updatePassengerDetails: async (tripId: string, passengerId: string, updates: Partial<Passenger>): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const data = tripDoc.data() as Trip;
                const passengers = [...data.passengers];
                const index = passengers.findIndex(p => p.uid === passengerId);
                
                if (index !== -1) {
                    passengers[index] = { ...passengers[index], ...updates };
                    transaction.update(tripRef, { passengers });
                }
            });
        } catch (error) {
            console.error("Error updating passenger details:", error);
            throw error;
        }
    },

    requestToJoinTrip: async (tripId: string, passenger: Passenger): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const tripData = tripDoc.data() as Trip;
                
                if (tripData.isClosed) throw new Error("Trip is closed");

                const now = new Date().getTime();
                const departureTime = tripData.departureTime.toDate().getTime();
                const thirtyMinutesInMs = 30 * 60 * 1000;

                if (now > departureTime + thirtyMinutesInMs) {
                    throw new Error("Trip has already departed");
                }

                const passengers = tripData.passengers || [];
                const existing = passengers.find(p => p.uid === passenger.uid);
                if (existing && (existing.status === 'pending' || existing.status === 'approved')) {
                    return;
                }

                const filteredPassengers = passengers.filter(p => p.uid !== passenger.uid);
                
                transaction.update(tripRef, { 
                    passengers: [...filteredPassengers, passenger] 
                });

                if (tripData.driverId !== passenger.uid) {
                    const notifRef = doc(collection(dbInstance, 'notifications'));
                    transaction.set(notifRef, {
                        userId: tripData.driverId,
                        type: 'request',
                        title: 'notif_request_title',
                        message: `notif_join_msg|${passenger.name}`,
                        relatedTripId: tripId,
                        metadata: {
                            passengerId: passenger.uid,
                            direction: tripData.direction
                        },
                        isRead: false,
                        createdAt: Timestamp.now()
                    });
                }
            });
        } catch (error) {
            throw error;
        }
    },

    approveJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const data = tripDoc.data() as Trip;
                if (data.availableSeats <= 0) throw new Error("No seats available");

                const passengerIndex = (data.passengers || []).findIndex(p => p.uid === passengerId && p.status === 'pending');
                
                // If passenger is already approved, treat as success/idempotent to clear notification
                const alreadyApproved = (data.passengers || []).find(p => p.uid === passengerId && p.status === 'approved');
                if (alreadyApproved) {
                    throw new Error("Passenger is already approved");
                }

                if (passengerIndex === -1) {
                    throw new Error("Request no longer valid");
                }

                const passengers = [...data.passengers];
                passengers[passengerIndex] = { ...passengers[passengerIndex], status: 'approved' };

                transaction.update(tripRef, {
                    passengers: passengers,
                    availableSeats: increment(-1)
                });

                await updatePassengerRequestsStatus(transaction, passengerId, data.direction, data.departureTime, true);

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: passengerId,
                    type: 'approved',
                    title: 'notif_approved_title',
                    message: 'notif_approved_msg',
                    relatedTripId: tripId,
                    metadata: {
                        direction: data.direction
                    },
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            });

            // Clean up the request notification from the driver's list to avoid duplicates
            await deleteRequestNotification(tripId, passengerId);

        } catch (error) {
            throw error;
        }
    },

    rejectJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const data = tripDoc.data() as Trip;
                
                // CRITICAL FIX: Check if passenger is already approved
                const existingPassenger = (data.passengers || []).find(p => p.uid === passengerId);
                if (existingPassenger && existingPassenger.status === 'approved') {
                    throw new Error("Passenger is already approved");
                }

                const updatedPassengers = (data.passengers || []).filter(p => p.uid !== passengerId);
                transaction.update(tripRef, { passengers: updatedPassengers });

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: passengerId,
                    type: 'cancel',
                    title: 'notif_rejected_title',
                    message: 'notif_rejected_msg',
                    relatedTripId: tripId,
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            });

            // Clean up the request notification from the driver's list
            await deleteRequestNotification(tripId, passengerId);

        } catch (error) {
            console.error("Error rejecting request:", error);
            throw error;
        }
    },

    removePassenger: async (tripId: string, passengerId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const data = tripDoc.data() as Trip;
                const passenger = (data.passengers || []).find(p => p.uid === passengerId);
                
                if (!passenger) return; 

                const updatedPassengers = (data.passengers || []).filter(p => p.uid !== passengerId);
                const seatIncrement = passenger.status === 'approved' ? 1 : 0;

                transaction.update(tripRef, {
                    passengers: updatedPassengers,
                    availableSeats: increment(seatIncrement)
                });

                if (passenger.status === 'approved') {
                    await updatePassengerRequestsStatus(transaction, passengerId, data.direction, data.departureTime, false);
                }

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: passengerId,
                    type: 'cancel',
                    title: 'notif_removed_title',
                    message: 'notif_removed_msg',
                    relatedTripId: tripId,
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            });
        } catch (error) {
            console.error("Error removing passenger:", error);
            throw error;
        }
    },

    leaveTrip: async (tripId: string, userId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                
                const data = tripDoc.data() as Trip;
                const passenger = (data.passengers || []).find(p => p.uid === userId);

                if (!passenger) return; 

                const updatedPassengers = (data.passengers || []).filter(p => p.uid !== userId);
                const seatIncrement = passenger.status === 'approved' ? 1 : 0;

                transaction.update(tripRef, {
                    passengers: updatedPassengers,
                    availableSeats: increment(seatIncrement)
                });

                if (passenger.status === 'approved') {
                    await updatePassengerRequestsStatus(transaction, userId, data.direction, data.departureTime, false);
                }

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: data.driverId,
                    type: 'cancel',
                    title: 'notif_passenger_left_title',
                    message: `notif_passenger_left_msg|${passenger.name}`,
                    relatedTripId: tripId,
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            });
        } catch (error) {
            console.error("Error leaving trip:", error);
            throw error;
        }
    },

    cancelTrip: async (tripId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);

            if (tripSnap.exists()) {
                const tripData = tripSnap.data() as Trip;
                const passengers = tripData.passengers || [];

                const batch = writeBatch(dbInstance);
                
                for (const p of passengers) {
                    const notifRef = doc(collection(dbInstance, 'notifications'));
                    batch.set(notifRef, {
                        userId: p.uid,
                        type: 'cancel',
                        title: 'notif_trip_cancelled_title',
                        message: 'notif_trip_cancelled_msg',
                        relatedTripId: tripId,
                        isRead: false,
                        createdAt: Timestamp.now()
                    });
                }
                
                batch.delete(tripRef);
                await batch.commit();
                
                for (const p of passengers) {
                    if (p.status === 'approved') {
                        await runTransaction(dbInstance, async (t) => {
                             await updatePassengerRequestsStatus(t, p.uid, tripData.direction, tripData.departureTime, false);
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error canceling trip:", error);
            throw error;
        }
    },

    getDriverActiveOffers: async (driverId: string, direction: Direction): Promise<Trip[]> => {
        try {
            const q = query(
                collection(dbInstance, 'trips'),
                where('driverId', '==', driverId),
                where('type', '==', 'offer'),
                where('direction', '==', direction)
            );
            const snapshot = await getDocs(q);
            const now = new Date().getTime();
            
            return snapshot.docs
                .map(d => ({ id: d.id, ...d.data() } as Trip))
                .filter(t => !t.isClosed && t.availableSeats > 0 && t.departureTime.toMillis() > now)
                .sort((a,b) => a.departureTime.toMillis() - b.departureTime.toMillis());
        } catch (error) {
            console.error(error);
            return [];
        }
    },

    sendSpecificTripInvitation: async (driverName: string, passengerId: string, trip: Trip): Promise<void> => {
        try {
            const timeStr = trip.departureTime.toDate().toLocaleTimeString('he-IL', {hour: '2-digit', minute:'2-digit'});
            const dateStr = trip.departureTime.toDate().toLocaleDateString('he-IL', {day: '2-digit', month: '2-digit'});
            const dayName = trip.departureTime.toDate().toLocaleDateString('he-IL', {weekday: 'long'});
            const directionKey = trip.direction === Direction.YOKNEAM_TO_BINYAMINA ? 'yokneam_to_binyamina' : 'binyamina_to_yokneam';

            await addDoc(collection(dbInstance, 'notifications'), {
                userId: passengerId,
                senderId: authInstance.currentUser?.uid,
                type: 'invite',
                title: 'notif_invite_title',
                message: 'notif_invite_msg', 
                relatedTripId: trip.id,
                metadata: {
                    driverName: driverName,
                    directionKey: directionKey,
                    time: timeStr,
                    date: dateStr,
                    dayName: dayName,
                    direction: trip.direction,
                    departureTimestamp: trip.departureTime.toMillis() 
                },
                isRead: false,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            console.error("Error sending invitation:", error);
            throw error;
        }
    },

    acceptTripInvitation: async (tripId: string, passenger: Passenger, notifId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip no longer exists");
                
                const data = tripDoc.data() as Trip;
                
                // CRITICAL FIX: Check if passenger already exists in the trip
                if (data.passengers.some(p => p.uid === passenger.uid)) {
                    throw new Error("Already Joined");
                }

                if (data.isClosed) throw new Error("Trip is closed");
                if (data.availableSeats <= 0) throw new Error("Ride is full");
                
                transaction.update(tripRef, {
                    passengers: arrayUnion({ ...passenger, status: 'approved' }),
                    availableSeats: increment(-1)
                });

                await updatePassengerRequestsStatus(transaction, passenger.uid, data.direction, data.departureTime, true);

                // Clean up specific notification
                transaction.delete(doc(dbInstance, 'notifications', notifId));

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: data.driverId,
                    type: 'invite_accepted',
                    title: 'notif_invite_accepted_title',
                    message: `notif_invite_accepted_msg|${passenger.name}`,
                    relatedTripId: tripId,
                    metadata: {
                        direction: data.direction
                    },
                    isRead: false,
                    createdAt: Timestamp.now()
                });
            });
            
            // Clean up any other potential invite notifications for this trip to avoid clutter
            const q = query(
                collection(dbInstance, 'notifications'), 
                where('type', '==', 'invite'),
                where('relatedTripId', '==', tripId),
                where('userId', '==', passenger.uid)
            );
            const snaps = await getDocs(q);
            const batch = writeBatch(dbInstance);
            snaps.docs.forEach(d => {
                if (d.id !== notifId) batch.delete(d.ref);
            });
            if (!snaps.empty) await batch.commit();

        } catch (error) {
            throw error;
        }
    },

    rejectTripInvitation: async (tripId: string, passengerName: string, notifId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);
            
            const batch = writeBatch(dbInstance);
            
            // Fix: Check if trip exists AND if user is NOT already in it
            if (tripSnap.exists()) {
                const data = tripSnap.data() as Trip;
                const userId = authInstance.currentUser?.uid;
                const alreadyInTrip = data.passengers?.some(p => p.uid === userId);

                // Only send rejection to driver if user is NOT already in the trip
                if (!alreadyInTrip) {
                    const notifRef = doc(collection(dbInstance, 'notifications'));
                    batch.set(notifRef, {
                        userId: data.driverId,
                        type: 'invite_rejected',
                        title: 'notif_invite_rejected_title',
                        message: `notif_invite_rejected_msg|${passengerName}`,
                        relatedTripId: tripId,
                        isRead: false,
                        createdAt: Timestamp.now()
                    });
                } else {
                    // If user is already in trip, we treat this rejection as invalid/stale notification cleanup
                    console.log("User already in trip, skipping rejection notification.");
                    throw new Error("Already Joined"); 
                }
            }
            batch.delete(doc(dbInstance, 'notifications', notifId));
            await batch.commit();
        } catch (error) {
            console.error("Error rejecting invitation:", error);
            throw error;
        }
    },

    createNotification: async (notif: Omit<AppNotification, 'id'>) => {
        try { await addDoc(collection(dbInstance, 'notifications'), notif); } catch (e) { console.error(e); }
    },
    markNotificationAsRead: async (notifId: string) => {
        try { await updateDoc(doc(dbInstance, 'notifications', notifId), { isRead: true }); } catch(e) { console.error(e) }
    },
    markAllNotificationsAsRead: async (userId: string) => {
        try {
            const q = query(collection(dbInstance, 'notifications'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            const batch = writeBatch(dbInstance);
            snapshot.docs.filter(d => !d.data().isRead).forEach(d => batch.update(d.ref, { isRead: true }));
            await batch.commit();
        } catch(e) { console.error(e) }
    },
    deleteNotification: async (notifId: string) => {
        try {
            await deleteDoc(doc(dbInstance, 'notifications', notifId));
        } catch (e) { console.error("Error deleting notification", e); }
    },
    clearAllNotifications: async (userId: string) => {
        try {
            const q = query(collection(dbInstance, 'notifications'), where('userId', '==', userId));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return;
            
            const batch = writeBatch(dbInstance);
            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        } catch (e) { console.error("Error clearing notifications", e); }
    },

    // --- Report System Functions ---
    
    submitReport: async (reportData: Omit<Report, 'id' | 'createdAt' | 'status'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'reports'), {
                ...reportData,
                status: 'open',
                createdAt: Timestamp.now()
            });

            const usersRef = collection(dbInstance, 'users');
            const q = query(usersRef, where('isAdmin', '==', true));
            const adminSnaps = await getDocs(q);
            
            const batch = writeBatch(dbInstance);
            
            adminSnaps.docs.forEach(adminDoc => {
                const notifRef = doc(collection(dbInstance, 'notifications'));
                batch.set(notifRef, {
                    userId: adminDoc.id,
                    type: 'info',
                    title: 'notif_new_report_title',
                    message: 'notif_new_report_msg',
                    isRead: false,
                    createdAt: Timestamp.now(),
                    metadata: { type: 'report_alert' } 
                });
            });
            
            if (!adminSnaps.empty) {
                await batch.commit();
            }

        } catch (e) {
            console.error("Error submitting report", e);
            throw e;
        }
    },

    getReports: async (): Promise<Report[]> => {
        try {
            const q = query(collection(dbInstance, 'reports'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    resolveReport: async (report: Report): Promise<void> => {
        try {
            const batch = writeBatch(dbInstance);
            
            const reportRef = doc(dbInstance, 'reports', report.id);
            batch.update(reportRef, { 
                status: 'resolved',
                resolvedAt: Timestamp.now()
            });

            const notifRef = doc(collection(dbInstance, 'notifications'));
            batch.set(notifRef, {
                userId: report.userId,
                type: 'report_status',
                title: 'notif_report_resolved_title',
                message: 'notif_report_resolved_msg',
                isRead: false,
                createdAt: Timestamp.now()
            });

            await batch.commit();
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    deleteReport: async (reportId: string): Promise<void> => {
        try {
            await deleteDoc(doc(dbInstance, 'reports', reportId));
        } catch (e) {
            console.error(e);
            throw e;
        }
    },

    // --- Chat System ---
    sendChatMessage: async (messageData: Omit<ChatMessage, 'id'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'messages'), messageData);
        } catch(e) {
            console.error("Error sending message", e);
            throw e;
        }
    },

    setTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        try {
            await setDoc(doc(dbInstance, 'typing_status', tripId), {
                [userId]: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error("Error updating typing status", e);
        }
    },

    clearTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        try {
            await updateDoc(doc(dbInstance, 'typing_status', tripId), {
                [userId]: deleteField()
            });
        } catch (e) {
            // Ignore if doc doesn't exist
        }
    },

    // --- Stats / Badges Helpers ---
    getUserStats: async (uid: string): Promise<{ given: number, taken: number }> => {
        try {
            // This is a "heavy" read for a client-side aggregation, but fine for small user base.
            // Ideally, update counters on user profile when trips close.
            const tripsRef = collection(dbInstance, 'trips');
            const q = query(tripsRef); // Getting all trips to filter in memory for efficiency on one scan? No, too big.
            // Let's optimize: query trips where driverId == uid (given)
            
            // Rides Given
            const qGiven = query(tripsRef, where('driverId', '==', uid), where('type', '==', 'offer'));
            const givenSnap = await getDocs(qGiven);
            const given = givenSnap.size; // Only count offers

            // Rides Taken (More complex: need to query all trips and check passengers array)
            // Firestore doesn't support array-contains-object. 
            // We have to rely on client-side calculation if we don't have a counter.
            // For now, return -1 for taken or implement a counter later.
            // Or query all trips and filter (expensive).
            // Compromise: We will query the last 100 trips and count.
            const qRecent = query(tripsRef, orderBy('departureTime', 'desc'), limit(100));
            const recentSnap = await getDocs(qRecent);
            const taken = recentSnap.docs.filter(d => {
                const data = d.data() as Trip;
                return data.passengers?.some(p => p.uid === uid && p.status === 'approved');
            }).length;

            return { given, taken };
        } catch(e) {
            console.error("Error getting user stats", e);
            return { given: 0, taken: 0 };
        }
    },

    // --- Admin Services ---
    getAllUsers: async (): Promise<UserProfile[]> => {
        try {
            const q = query(collection(dbInstance, 'users'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => doc.data() as UserProfile);
        } catch (e) {
            console.error("Error getting all users", e);
            throw e;
        }
    },
    updateUserRole: async (uid: string, isAdmin: boolean): Promise<void> => {
        try {
            await updateDoc(doc(dbInstance, 'users', uid), { isAdmin });
        } catch (e) {
            console.error("Error updating role", e);
            throw e;
        }
    },
    deleteUserProfile: async (uid: string): Promise<void> => {
        try {
            await deleteDoc(doc(dbInstance, 'users', uid));
        } catch (e) {
            console.error("Error deleting user profile", e);
            throw e;
        }
    },
    broadcastNotification: async (titleKey: string, message: string, type: NotificationType = 'info'): Promise<void> => {
        try {
            const usersSnap = await getDocs(collection(dbInstance, 'users'));
            const users = usersSnap.docs;
            
            if (users.length === 0) return;

            const CHUNK_SIZE = 400; 
            for (let i = 0; i < users.length; i += CHUNK_SIZE) {
                const chunk = users.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(dbInstance);
                
                chunk.forEach(userDoc => {
                    const notifRef = doc(collection(dbInstance, 'notifications'));
                    batch.set(notifRef, {
                        userId: userDoc.id,
                        type,
                        title: titleKey,
                        message,
                        isRead: false,
                        createdAt: Timestamp.now()
                    });
                });
                
                await batch.commit();
            }
        } catch (e) {
            console.error("Error broadcasting", e);
            throw e;
        }
    },
    getAllTripsForAdmin: async (): Promise<Trip[]> => {
        try {
            const q = query(
                collection(dbInstance, 'trips'),
                orderBy('departureTime', 'desc'),
                limit(100) 
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
        } catch (e) {
            console.error("Error fetching all trips", e);
            throw e;
        }
    }
};
