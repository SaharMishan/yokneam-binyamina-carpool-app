
// Fix: Use namespace import for firebase/app to resolve missing named exports error
import * as firebaseApp from "firebase/app";
const { initializeApp, getApp, getApps } = firebaseApp;
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
import { Trip, UserProfile, Direction, AppNotification, Passenger, Report, ChatMessage } from '../types';

/**
 * הגדרות Firebase.
 * שימוש ב-process.env עם ערכי Fallback מהנתונים שסיפקת כדי להבטיח פעולה תקינה בכל סביבה.
 */
const firebaseConfig = {
  apiKey: (process.env as any).VITE_FIREBASE_API_KEY || "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw",
  authDomain: (process.env as any).VITE_FIREBASE_AUTH_DOMAIN || "carpool-yokneam.firebaseapp.com",
  projectId: (process.env as any).VITE_FIREBASE_PROJECT_ID || "carpool-yokneam",
  storageBucket: (process.env as any).VITE_FIREBASE_STORAGE_BUCKET || "carpool-yokneam.firebasestorage.app",
  messagingSenderId: (process.env as any).VITE_FIREBASE_MESSAGING_SENDER_ID || "374315181940",
  appId: (process.env as any).VITE_FIREBASE_APP_ID || "1:374315181940:web:e322c995e8c3b25e3eee21",
  measurementId: (process.env as any).VITE_FIREBASE_MEASUREMENT_ID || "G-LB4XC4NRZQ"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const authInstance = getAuth(app);
export const dbInstance = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

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
    deleteUserProfile: async (uid: string): Promise<void> => {
        try {
            await deleteDoc(doc(dbInstance, 'users', uid));
        } catch (error) {
            console.error("Error deleting user profile:", error);
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

                // Notify passenger
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
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                const data = tripDoc.data() as Trip;
                const passengers = data.passengers.filter(p => p.uid !== passengerId);
                transaction.update(tripRef, { passengers });

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: passengerId,
                    type: 'info',
                    title: 'notif_rejected_title',
                    message: 'notif_rejected_msg',
                    relatedTripId: tripId,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });
        } catch (error) { throw error; }
    },
    acceptTripInvitation: async (tripId: string, passenger: Passenger, notifId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                const data = tripDoc.data() as Trip;
                if (data.availableSeats <= 0) throw new Error("Trip is full");
                
                const passengers = [...(data.passengers || []), passenger];
                transaction.update(tripRef, { 
                    passengers, 
                    availableSeats: increment(-1) 
                });
                
                transaction.update(doc(dbInstance, 'notifications', notifId), { isRead: true });

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: data.driverId,
                    type: 'info',
                    title: 'invite_accepted',
                    message: `notif_invite_accepted|${passenger.name}`,
                    relatedTripId: tripId,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });
        } catch (error) { throw error; }
    },
    rejectTripInvitation: async (tripId: string, passengerName: string, notifId: string): Promise<void> => {
        try {
            await updateDoc(doc(dbInstance, 'notifications', notifId), { isRead: true });
        } catch (error) { throw error; }
    },
    leaveTrip: async (tripId: string, userId: string): Promise<void> => {
        try {
            const tripRef = doc(dbInstance, 'trips', tripId);
            await runTransaction(dbInstance, async (transaction) => {
                const tripDoc = await transaction.get(tripRef);
                if (!tripDoc.exists()) throw new Error("Trip does not exist");
                const data = tripDoc.data() as Trip;
                
                const passenger = data.passengers.find(p => p.uid === userId);
                if (!passenger) return;

                const isApproved = passenger.status === 'approved';
                const newPassengers = data.passengers.filter(p => p.uid !== userId);
                
                const updates: any = { passengers: newPassengers };
                if (isApproved) updates.availableSeats = increment(1);
                
                transaction.update(tripRef, updates);

                const notifRef = doc(collection(dbInstance, 'notifications'));
                transaction.set(notifRef, {
                    userId: data.driverId,
                    type: 'info',
                    title: 'notif_passenger_left_title',
                    message: `notif_passenger_left_msg|${passenger.name}`,
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
            const tripDoc = await getDoc(tripRef);
            if (!tripDoc.exists()) return;
            const tripData = tripDoc.data() as Trip;

            const batch = writeBatch(dbInstance);
            batch.delete(tripRef);

            tripData.passengers?.forEach(p => {
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
            });

            await batch.commit();
        } catch (error) { throw error; }
    },
    dismissMatch: async (uid: string, tripId: string): Promise<void> => {
        try {
            const userRef = doc(dbInstance, 'users', uid);
            await updateDoc(userRef, {
                dismissedMatchIds: arrayUnion(tripId)
            });
        } catch (error) { throw error; }
    },
    markAllNotificationsAsRead: async (uid: string): Promise<void> => {
        try {
            const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid), where('isRead', '==', false));
            const snap = await getDocs(q);
            const batch = writeBatch(dbInstance);
            snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
            await batch.commit();
        } catch (error) { throw error; }
    },
    createNotification: async (notif: Omit<AppNotification, 'id'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'notifications'), {
                ...notif,
                createdAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    },
    deleteNotification: async (id: string): Promise<void> => {
        try {
            await deleteDoc(doc(dbInstance, 'notifications', id));
        } catch (error) { throw error; }
    },
    clearAllNotifications: async (uid: string): Promise<void> => {
        try {
            const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid));
            const snap = await getDocs(q);
            const batch = writeBatch(dbInstance);
            snap.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
        } catch (error) { throw error; }
    },
    getDriverActiveOffers: async (uid: string, direction: Direction): Promise<Trip[]> => {
        try {
            const now = new Date();
            const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
            const q = query(
                collection(dbInstance, 'trips'),
                where('driverId', '==', uid),
                where('type', '==', 'offer'),
                where('direction', '==', direction),
                where('departureTime', '>=', Timestamp.fromDate(thirtyMinsAgo))
            );
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
        } catch (error) { return []; }
    },
    sendSpecificTripInvitation: async (driverName: string, passengerId: string, trip: Trip): Promise<void> => {
        try {
            const notifRef = doc(collection(dbInstance, 'notifications'));
            await setDoc(notifRef, {
                userId: passengerId,
                type: 'invite',
                title: 'notif_invite_title',
                message: 'notif_invite_msg',
                relatedTripId: trip.id,
                metadata: {
                    driverName,
                    directionKey: trip.direction,
                    time: trip.departureTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    direction: trip.direction
                },
                isRead: false,
                createdAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    },
    broadcastNotification: async (title: string, message: string): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'system_announcements'), {
                title,
                message,
                isActive: true,
                createdAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    },
    resolveReport: async (report: Report): Promise<void> => {
        try {
            await updateDoc(doc(dbInstance, 'reports', report.id), {
                status: 'resolved',
                resolvedAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    },
    deleteReport: async (id: string): Promise<void> => {
        try {
            await deleteDoc(doc(dbInstance, 'reports', id));
        } catch (error) { throw error; }
    },
    submitReport: async (reportData: Omit<Report, 'id' | 'status' | 'createdAt'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'reports'), {
                ...reportData,
                status: 'open',
                createdAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    },
    getUserStats: async (uid: string): Promise<{ given: number, taken: number }> => {
        try {
            const q = query(collection(dbInstance, 'trips'));
            const snap = await getDocs(q);
            const trips = snap.docs.map(d => d.data() as Trip);
            const given = trips.filter(t => t.driverId === uid && t.type === 'offer').length;
            const taken = trips.filter(t => 
                (t.passengers?.some(p => p.uid === uid && p.status === 'approved')) || 
                (t.driverId === uid && t.type === 'request')
            ).length;
            return { given, taken };
        } catch (error) { return { given: 0, taken: 0 }; }
    },
    setTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        try {
            const ref = doc(dbInstance, 'typing_status', tripId);
            await setDoc(ref, { [userId]: serverTimestamp() }, { merge: true });
        } catch (error) {}
    },
    clearTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        try {
            const ref = doc(dbInstance, 'typing_status', tripId);
            await updateDoc(ref, { [userId]: deleteField() });
        } catch (error) {}
    },
    sendChatMessage: async (msg: Omit<ChatMessage, 'id'>): Promise<void> => {
        try {
            await addDoc(collection(dbInstance, 'messages'), {
                ...msg,
                createdAt: serverTimestamp()
            });
        } catch (error) { throw error; }
    }
};
