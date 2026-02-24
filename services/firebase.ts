
import { initializeApp, getApps, getApp } from "firebase/app";
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
import { Trip, UserProfile, Direction, AppNotification, Passenger, Report, ChatMessage } from '../types';

/**
 * פונקציית עזר לניקוי ערכי env ממרכאות כפולות, רווחים או תווים נסתרים (\r, \n).
 */
const cleanEnvValue = (val: any): string => {
    if (!val || typeof val !== 'string' || val === 'undefined' || val === 'null') return "";
    return val.replace(/["']/g, '').replace(/\s/g, '').trim();
};

const getEnvVar = (key: string, hardcoded: string): string => {
    try {
        if (typeof process !== 'undefined' && (process as any).env?.[key]) {
            return cleanEnvValue((process as any).env[key]);
        }
        const wpEnv = (window as any).process?.env?.[key];
        if (wpEnv) return cleanEnvValue(wpEnv);
        const mEnv = (import.meta as any).env?.[key];
        if (mEnv) return cleanEnvValue(mEnv);
    } catch (e) {}
    return hardcoded;
};

const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY', "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw"),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN', "carpool-yokneam.firebaseapp.com"),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID', "carpool-yokneam"),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET', "carpool-yokneam.firebasestorage.app"),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID', "374315181940"),
  appId: getEnvVar('VITE_FIREBASE_APP_ID', "1:374315181940:web:e322c995e8c3b25e3eee21"),
  measurementId: getEnvVar('VITE_FIREBASE_MEASUREMENT_ID', "G-LB4XC4NRZQ")
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const authInstance = getAuth(app);
export const dbInstance = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const auth = {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        return firebaseOnAuthStateChanged(authInstance, callback);
    },
    signOut: () => firebaseSignOut(authInstance),
    signInWithEmailAndPassword: (email: string, pass: string) => 
        firebaseSignInWithEmailAndPassword(authInstance, normalizeEmail(email), pass),
    createUserWithEmailAndPassword: (email: string, pass: string) => 
        firebaseCreateUserWithEmailAndPassword(authInstance, normalizeEmail(email), pass),
    sendPasswordResetEmail: (email: string) => 
        firebaseSendPasswordResetEmail(authInstance, normalizeEmail(email)),
    signInWithGoogle: () => signInWithPopup(authInstance, googleProvider),
    setPersistence: async (persistenceType: 'local' | 'session') => {
        const persistence = persistenceType === 'session' ? browserSessionPersistence : browserLocalPersistence;
        return setPersistence(authInstance, persistence);
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
            return null;
        }
    },
    createUserProfile: async (userProfile: UserProfile): Promise<void> => {
        await setDoc(doc(dbInstance, 'users', userProfile.uid), {
            ...userProfile,
            createdAt: serverTimestamp(),
            privacySettings: { profileVisibility: 'public', notificationsEnabled: true },
            dismissedMatchIds: []
        }, { merge: true });
    },
    updateUserProfile: async (uid: string, data: Partial<UserProfile>): Promise<void> => {
        await updateDoc(doc(dbInstance, 'users', uid), data);
    },
    deleteUserProfile: async (uid: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'users', uid));
    },
    getTrip: async (tripId: string): Promise<Trip | null> => {
        const docRef = doc(dbInstance, 'trips', tripId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Trip) : null;
    },
    addTrip: async (tripData: Omit<Trip, 'id'>): Promise<void> => {
        await addDoc(collection(dbInstance, 'trips'), {
            ...tripData,
            createdAt: serverTimestamp() 
        });
    },
    updateTrip: async (tripId: string, data: Partial<Trip>): Promise<void> => {
        const tripRef = doc(dbInstance, 'trips', tripId);
        await updateDoc(tripRef, data as any);
    },
    requestToJoinTrip: async (tripId: string, passenger: Passenger): Promise<void> => {
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
    },
    approveJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
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
    },
    rejectJoinRequest: async (tripId: string, passengerId: string): Promise<void> => {
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
    },
    removePassenger: async (tripId: string, passengerId: string): Promise<void> => {
        const tripRef = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (transaction) => {
            const tripDoc = await transaction.get(tripRef);
            if (!tripDoc.exists()) throw new Error("Trip does not exist");
            const data = tripDoc.data() as Trip;
            const passenger = data.passengers.find(p => p.uid === passengerId);
            if (!passenger) return;
            const isApproved = passenger.status === 'approved';
            const newPassengers = data.passengers.filter(p => p.uid !== passengerId);
            const updates: any = { passengers: newPassengers };
            if (isApproved) updates.availableSeats = increment(1);
            transaction.update(tripRef, updates);
            const notifRef = doc(collection(dbInstance, 'notifications'));
            transaction.set(notifRef, {
                userId: passengerId,
                type: 'info',
                title: 'notif_removed_title',
                message: 'notif_removed_msg',
                relatedTripId: tripId,
                isRead: false,
                createdAt: serverTimestamp()
            });
        });
    },
    acceptTripInvitation: async (tripId: string, passenger: Passenger, notifId: string): Promise<void> => {
        const tripRef = doc(dbInstance, 'trips', tripId);
        await runTransaction(dbInstance, async (transaction) => {
            const tripDoc = await transaction.get(tripRef);
            if (!tripDoc.exists()) throw new Error("Trip does not exist");
            const data = tripDoc.data() as Trip;
            const passengers = [...(data.passengers || []), passenger];
            transaction.update(tripRef, { passengers, availableSeats: increment(-1) });
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
    },
    rejectTripInvitation: async (tripId: string, passengerName: string, notifId: string): Promise<void> => {
        await updateDoc(doc(dbInstance, 'notifications', notifId), { isRead: true });
    },
    leaveTrip: async (tripId: string, userId: string): Promise<void> => {
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
    },
    cancelTrip: async (tripId: string): Promise<void> => {
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
    },
    dismissMatch: async (uid: string, tripId: string): Promise<void> => {
        await updateDoc(doc(dbInstance, 'users', uid), { dismissedMatchIds: arrayUnion(tripId) });
    },
    markAllNotificationsAsRead: async (uid: string): Promise<void> => {
        const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid), where('isRead', '==', false));
        const snap = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snap.docs.forEach(d => batch.update(d.ref, { isRead: true }));
        await batch.commit();
    },
    createNotification: async (notif: Omit<AppNotification, 'id'>): Promise<void> => {
        await addDoc(collection(dbInstance, 'notifications'), { ...notif, createdAt: serverTimestamp() });
    },
    deleteNotification: async (id: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'notifications', id));
    },
    clearAllNotifications: async (uid: string): Promise<void> => {
        const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid));
        const snap = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snap.docs.forEach(d => batch.delete(d.ref));
        await batch.commit();
    },
    getDriverActiveOffers: async (uid: string, direction: Direction): Promise<Trip[]> => {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        const q = query(
            collection(dbInstance, 'trips'),
            where('driverId', '==', uid),
            where('type', '==', 'offer'),
            where('direction', '==', direction),
            where('departureTime', '>=', Timestamp.fromDate(thirtyMinsAgo))
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Trip));
    },
    sendSpecificTripInvitation: async (driverName: string, passengerId: string, trip: Trip): Promise<void> => {
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
    },
    broadcastNotification: async (title: string, message: string): Promise<void> => {
        await addDoc(collection(dbInstance, 'system_announcements'), { title, message, isActive: true, createdAt: serverTimestamp() });
    },
    resolveReport: async (report: Report): Promise<void> => {
        await updateDoc(doc(dbInstance, 'reports', report.id), { status: 'resolved', resolvedAt: serverTimestamp() });
    },
    deleteReport: async (id: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'reports', id));
    },
    submitReport: async (reportData: Omit<Report, 'id' | 'status' | 'createdAt'>): Promise<void> => {
        await addDoc(collection(dbInstance, 'reports'), { ...reportData, status: 'open', createdAt: serverTimestamp() });
    },
    getUserStats: async (uid: string): Promise<{ given: number, taken: number }> => {
        const q = query(collection(dbInstance, 'trips'));
        const snap = await getDocs(q);
        const trips = snap.docs.map(d => d.data() as Trip);
        const given = trips.filter(t => t.driverId === uid && t.type === 'offer').length;
        const taken = trips.filter(t => 
            (t.passengers?.some(p => p.uid === uid && p.status === 'approved')) || 
            (t.driverId === uid && t.type === 'request')
        ).length;
        return { given, taken };
    },
    setTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        const ref = doc(dbInstance, 'typing_status', tripId);
        await setDoc(ref, { [userId]: serverTimestamp() }, { merge: true });
    },
    clearTypingStatus: async (tripId: string, userId: string): Promise<void> => {
        const ref = doc(dbInstance, 'typing_status', tripId);
        await updateDoc(ref, { [userId]: deleteField() });
    },
    sendChatMessage: async (msg: Omit<ChatMessage, 'id'>): Promise<void> => {
        await addDoc(collection(dbInstance, 'messages'), { ...msg, createdAt: serverTimestamp() });
    }
};
