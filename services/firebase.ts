
import { initializeApp, getApp, getApps } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    onAuthStateChanged as firebaseOnAuthStateChanged,
    signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
    createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
    sendPasswordResetEmail as firebaseSendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
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

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const authInstance = getAuth(app);
export const dbInstance = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export const auth = {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return firebaseOnAuthStateChanged(authInstance, callback);
    },
    signOut: () => firebaseSignOut(authInstance),
    signInWithEmailAndPassword: (email: string, pass: string) => firebaseSignInWithEmailAndPassword(authInstance, email, pass),
    createUserWithEmailAndPassword: (email: string, pass: string) => firebaseCreateUserWithEmailAndPassword(authInstance, email, pass),
    sendPasswordResetEmail: (email: string) => firebaseSendPasswordResetEmail(authInstance, email),
    signInWithGoogle: () => signInWithPopup(authInstance, googleProvider),
    signInWithGoogleRedirect: () => signInWithRedirect(authInstance, googleProvider),
    getRedirectResult: () => getRedirectResult(authInstance),
    setPersistence: (persistenceType: 'local' | 'session' | 'none') => {
        let firebasePersistence;
        switch (persistenceType) {
            case 'local': firebasePersistence = browserLocalPersistence; break;
            case 'session': firebasePersistence = browserSessionPersistence; break;
            case 'none': firebasePersistence = inMemoryPersistence; break;
            default: firebasePersistence = browserSessionPersistence;
        }
        return setPersistence(authInstance, firebasePersistence);
    },
    get currentUser() { return authInstance.currentUser; }
};

export const db = {
    getUserProfile: async (uid: string): Promise<UserProfile | null> => {
        try {
            const docRef = doc(dbInstance, 'users', uid);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? ({ ...docSnap.data(), uid: docSnap.id } as UserProfile) : null;
        } catch (error) {
            console.error("Error fetching user profile:", error);
            return null;
        }
    },
    createUserProfile: async (userProfile: UserProfile): Promise<void> => {
        try {
            await setDoc(doc(dbInstance, 'users', userProfile.uid), {
                ...userProfile,
                createdAt: serverTimestamp(),
                privacySettings: { profileVisibility: 'public', notificationsEnabled: true },
                dismissedMatchIds: []
            }, { merge: true });
        } catch (error) {
            console.error("Error creating user profile:", error);
            throw error;
        }
    },
    updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
        try {
            const docRef = doc(dbInstance, 'users', uid);
            await updateDoc(docRef, data);
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
            return null;
        }
    },
    addTrip: async (tripData: Omit<Trip, 'id'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'trips'), {
                ...tripData,
                createdAt: serverTimestamp() 
            });
        } catch (error) {
            throw error;
        }
    },
    updateTrip: async (tripId: string, data: Partial<Trip>): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await updateDoc(tripRef, data as any);
        } catch (error) {
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
                const passengers = tripData.passengers || [];
                transaction.update(tripRef, { passengers: [...passengers, passenger] });
                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: tripData.driverId,
                    type: 'request',
                    title: 'notif_request_title',
                    message: `notif_join_msg|${passenger.name}`,
                    relatedTripId: tripId,
                    metadata: { passengerId: passenger.uid, direction: tripData.direction },
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });
        } catch (error) { throw error; }
    },
    approveJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                const data = tripDoc.data() as Trip;
                const passengers = [...data.passengers];
                const idx = passengers.findIndex(p => p.uid === passengerId && p.status === 'pending');
                if (idx === -1) return;
                
                passengers[idx] = { ...passengers[idx], status: 'approved' };
                transaction.update(tripRef, { passengers, availableSeats: increment(-1) });

                // AUTOMATICALLY CLOSE PASSENGER'S OWN REQUEST FOR THIS DAY/DIRECTION
                const tripsRef = collection(dbInstance, 'trips');
                const q = query(tripsRef, 
                    where('driverId', '==', passengerId), 
                    where('type', '==', 'request'),
                    where('direction', '==', data.direction)
                );
                
                const userRequestsSnap = await getDocs(q);
                userRequestsSnap.forEach(requestDoc => {
                    const reqData = requestDoc.data();
                    const reqDate = reqData.departureTime.toDate().toDateString();
                    const tripDate = data.departureTime.toDate().toDateString();
                    if (reqDate === tripDate) {
                        transaction.delete(doc(dbInstance, 'trips', requestDoc.id));
                    }
                });

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: passengerId,
                    type: 'approved',
                    title: 'notif_approved_title',
                    message: 'notif_approved_msg',
                    relatedTripId: tripId,
                    metadata: { direction: data.direction },
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });
        } catch (error) { throw error; }
    },
    rejectJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                const data = tripDoc.data() as Trip;
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
                    createdAt: serverTimestamp()
                });
            });
        } catch (error) { throw error; }
    },
    cancelTrip: async (tripId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            const tripSnap = await getDoc(tripRef);
            if (tripSnap.exists()) {
                const data = tripSnap.data() as Trip;
                const batch = writeBatch(dbInstance);
                if (data.passengers) {
                    data.passengers.forEach(p => {
                        if (p.status === 'approved') {
                            const notifRef = doc(collection(dbInstance, 'notifications'));
                            batch.set(notifRef, {
                                userId: p.uid,
                                type: 'cancel',
                                title: 'notif_trip_cancelled_title',
                                message: 'notif_trip_cancelled_msg',
                                relatedTripId: tripId,
                                isRead: false,
                                createdAt: serverTimestamp()
                            });
                        }
                    });
                }
                batch.delete(tripRef);
                await batch.commit();
            }
        } catch (error) { throw error; }
    },
    getAllUsers: async (): Promise<UserProfile[]> => {
        try {
            const snapshot = await getDocs(collection(dbInstance, 'users'));
            return snapshot.docs.map(doc => {
                const data = doc.data() as UserProfile;
                return { ...data, uid: doc.id };
            });
        } catch (error) {
            console.error("Error fetching users:", error);
            throw error;
        }
    },
    updateUserRole: async (uid: string, isAdmin: boolean): Promise<void> => {
        if (!uid) throw new Error("Missing user ID");
        const userRef = doc(dbInstance, 'users', uid);
        await setDoc(userRef, { 
            isAdmin: isAdmin,
            uid: uid 
        }, { merge: true });
    },
    deleteUserProfile: async (uid: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'users', uid));
    },
    broadcastNotification: async (title: string, message: string): Promise<void> => {
        try {
            const senderId = authInstance.currentUser?.uid;
            await addDoc(collection(dbInstance, 'system_announcements'), {
                title: title || 'עדכון מערכת',
                message: message,
                createdAt: serverTimestamp(),
                isActive: true,
                senderId: senderId || 'system'
            });
        } catch (error) {
            console.error("Failed to publish announcement:", error);
            throw error;
        }
    },
    getAllTripsForAdmin: async (): Promise<Trip[]> => {
        const snapshot = await getDocs(query(collection(dbInstance, 'trips'), orderBy('departureTime', 'desc'), limit(200)));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trip));
    },
    getReports: async (): Promise<Report[]> => {
        const q = query(collection(dbInstance, 'reports'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Report));
    },
    resolveReport: async (report: Report): Promise<void> => {
        const reportRef = doc(dbInstance, 'reports', report.id);
        await updateDoc(reportRef, { status: 'resolved', resolvedAt: serverTimestamp() });
    },
    deleteReport: async (reportId: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'reports', reportId));
    },
    markNotificationAsRead: async (id: string) => {
        await updateDoc(doc(dbInstance, 'notifications', id), { isRead: true });
    },
    markAllNotificationsAsRead: async (uid: string) => {
        const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid), where('isRead', '==', false));
        const snap = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
        await batch.commit();
    },
    deleteNotification: async (id: string) => {
        await deleteDoc(doc(dbInstance, 'notifications', id));
    },
    dismissMatch: async (uid: string, tripId: string) => {
        const userRef = doc(dbInstance, 'users', uid);
        await updateDoc(userRef, {
            dismissedMatchIds: arrayUnion(tripId)
        });
    },
    clearAllNotifications: async (uid: string) => {
        const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid));
        const snap = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    },
    createNotification: async (notif: any) => {
        await addDoc(collection(dbInstance, 'notifications'), notif);
    },
    getUserStats: async (uid: string) => {
        const qGiven = query(collection(dbInstance, 'trips'), where('driverId', '==', uid), where('type', '==', 'offer'));
        const snapGiven = await getDocs(qGiven);
        
        const qTaken = query(collection(dbInstance, 'trips'), where('type', '==', 'offer'));
        const snapAllOffers = await getDocs(qTaken);
        const taken = snapAllOffers.docs.filter(d => (d.data() as Trip).passengers?.some(p => p.uid === uid && p.status === 'approved')).length;
        
        const requests = (await getDocs(query(collection(dbInstance, 'trips'), where('driverId', '==', uid), where('type', '==', 'request')))).size;
        
        return { given: snapGiven.size, taken: taken + requests };
    },
    setTypingStatus: async (tripId: string, uid: string) => {
        await setDoc(doc(dbInstance, 'typing_status', tripId), { [uid]: serverTimestamp() }, { merge: true });
    },
    clearTypingStatus: async (tripId: string, uid: string) => {
        await setDoc(doc(dbInstance, 'typing_status', tripId), { [uid]: deleteField() }, { merge: true });
    },
    sendChatMessage: async (msg: any) => {
        await addDoc(collection(dbInstance, 'messages'), msg);
    },
    submitReport: async (report: any) => {
        await addDoc(collection(dbInstance, 'reports'), { ...report, status: 'open', createdAt: serverTimestamp() });
    },
    updatePassengerDetails: async (tripId: string, uid: string, data: any) => {
        const ref = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (t) => {
            const snap = await t.get(ref);
            const passengers = snap.data()?.passengers || [];
            const idx = passengers.findIndex((p: any) => p.uid === uid);
            if (idx !== -1) {
                passengers[idx] = { ...passengers[idx], ...data };
                t.update(ref, { passengers });
            }
        });
    },
    leaveTrip: async (tripId: string, uid: string) => {
        const ref = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (t) => {
            const snap = await t.get(ref);
            const data = snap.data();
            const pIdx = data?.passengers.findIndex((p: any) => p.uid === uid);
            if (pIdx === -1) return;
            const updated = data?.passengers.filter((p: any) => p.uid !== uid);
            t.update(ref, { passengers: updated, availableSeats: increment(data?.passengers[pIdx].status === 'approved' ? 1 : 0) });
            
            const notifRef = doc(collection(dbInstance, 'notifications'));
            t.set(notifRef, {
                userId: data?.driverId,
                type: 'cancel',
                title: 'notif_passenger_left_title',
                message: `notif_passenger_left_msg|${data?.passengers[pIdx].name}`,
                relatedTripId: tripId,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });
    },
    removePassenger: async (tripId: string, uid: string) => {
        const ref = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (t) => {
            const snap = await t.get(ref);
            const data = snap.data();
            const pIdx = data?.passengers.findIndex((p: any) => p.uid === uid);
            if (pIdx === -1) return;
            
            const updated = data?.passengers.filter((p: any) => p.uid !== uid);
            t.update(ref, { passengers: updated, availableSeats: increment(data?.passengers[pIdx].status === 'approved' ? 1 : 0) });
            
            const notifRef = doc(collection(dbInstance, 'notifications'));
            t.set(notifRef, {
                userId: uid,
                type: 'cancel', 
                title: 'notif_removed_title',
                message: 'notif_removed_msg',
                relatedTripId: tripId,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });
    },
    sendSpecificTripInvitation: async (dName: string, pId: string, trip: any) => {
        await addDoc(collection(dbInstance, 'notifications'), {
            userId: pId,
            type: 'invite',
            title: 'notif_invite_title',
            message: 'notif_invite_msg',
            relatedTripId: trip.id,
            metadata: { 
                driverName: dName, 
                time: trip.departureTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' }), 
                directionKey: trip.direction, 
                direction: trip.direction 
            },
            isRead: false,
            createdAt: serverTimestamp()
        });
    },
    getDriverActiveOffers: async (uid: string, dir: string) => {
        const q = query(
            collection(dbInstance, 'trips'), 
            where('driverId', '==', uid), 
            where('type', '==', 'offer')
        );
        
        try {
            const snap = await getDocs(q);
            const now = new Date();
            const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
            const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            const rides = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as Trip))
                .filter(ride => {
                    const depTime = ride.departureTime.toDate();
                    return (
                        ride.direction === dir &&
                        ride.isClosed !== true &&
                        ride.availableSeats > 0 &&
                        depTime >= thirtyMinsAgo &&
                        depTime <= sevenDaysLater
                    );
                });

            return rides.sort((a, b) => a.departureTime.toMillis() - b.departureTime.toMillis());
        } catch (error) {
            console.error("Firestore error in getDriverActiveOffers:", error);
            return [];
        }
    },
    acceptTripInvitation: async (tripId: string, passenger: any, nId: string) => {
        const ref = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists()) throw new Error("Trip not found");
            const data = snap.data() as Trip;
            if (data.availableSeats <= 0) throw new Error("Ride is full");
            
            transaction.update(ref, { 
                passengers: arrayUnion(passenger), 
                availableSeats: increment(-1) 
            });
            transaction.delete(doc(dbInstance, 'notifications', nId));

            const tripsRef = collection(dbInstance, 'trips');
            const q = query(tripsRef, 
                where('driverId', '==', passenger.uid), 
                where('type', '==', 'request'),
                where('direction', '==', data.direction)
            );
            
            const userRequestsSnap = await getDocs(q);
            userRequestsSnap.forEach(requestDoc => {
                const reqData = requestDoc.data();
                const reqDate = reqData.departureTime.toDate().toDateString();
                const tripDate = data.departureTime.toDate().toDateString();
                if (reqDate === tripDate) {
                    transaction.delete(doc(dbInstance, 'trips', requestDoc.id));
                }
            });
        });
    },
    rejectTripInvitation: async (tripId: string, name: string, nId: string) => {
        await deleteDoc(doc(dbInstance, 'notifications', nId));
    }
};
