
import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { 
    getAuth, 
    signInWithPopup, 
    signInWithRedirect,
    getRedirectResult,
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
export const cleanEnvValue = (val: any): string => {
    if (!val || typeof val !== 'string' || val === 'undefined' || val === 'null') return "";
    return val.replace(/["']/g, '').replace(/\s/g, '').trim();
};

/**
 * IMPORTANT FOR PRODUCTION (Netlify/Vercel):
 * 1. Ensure your production domain (e.g., my-app.netlify.app) is added to 
 *    "Authorized domains" in Firebase Console -> Authentication -> Settings.
 * 2. Ensure VITE_FIREBASE_AUTH_DOMAIN is set to your project's .firebaseapp.com domain
 *    unless you have specifically configured a custom domain for auth.
 */
const authDomain = cleanEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "carpool-yokneam.firebaseapp.com";

// Diagnostic warning for production
if (typeof window !== 'undefined' && (authDomain.includes('netlify.app') || authDomain.includes('vercel.app'))) {
    console.warn("⚠️ VITE_FIREBASE_AUTH_DOMAIN is set to a hosting domain. This often breaks Google Sign-In. It should usually be 'carpool-yokneam.firebaseapp.com'");
}

const firebaseConfig = {
  apiKey: cleanEnvValue(import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw",
  authDomain: authDomain,
  projectId: cleanEnvValue(import.meta.env.VITE_FIREBASE_PROJECT_ID) || "carpool-yokneam",
  storageBucket: cleanEnvValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) || "carpool-yokneam.firebasestorage.app",
  messagingSenderId: cleanEnvValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) || "374315181940",
  appId: cleanEnvValue(import.meta.env.VITE_FIREBASE_APP_ID) || "1:374315181940:web:e322c995e8c3b25e3eee21",
  measurementId: cleanEnvValue(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) || "G-LB4XC4NRZQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const authInstance = getAuth(app);

// Force local persistence immediately to help iOS/Safari/PWA
setPersistence(authInstance, browserLocalPersistence).catch(err => {
    console.error("Failed to set auth persistence:", err);
});

export const dbInstance = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
    prompt: 'select_account'
});

// Initialize Messaging conditionally (not supported in all browsers)
export let messagingInstance: any = null;

const initMessaging = async () => {
    // Messaging is only for browser environments with ServiceWorker support
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    try {
        // Check if messaging is supported in this browser
        const supported = await isSupported().catch(() => false);
        if (supported) {
            messagingInstance = getMessaging(app);
            // Only log in development or as a silent info
            if (import.meta.env.DEV) {
                console.log("Firebase Messaging initialized");
            }
        }
    } catch (err: any) {
        // Completely silent for expected "not available" errors in production/preview
        const msg = err?.message || "";
        const isExpectedError = msg.includes('messaging is not available') || 
                               msg.includes('Service messaging is not available') ||
                               err?.code === 'messaging/unsupported-browser';
        
        if (!isExpectedError) {
            console.error("Firebase Messaging initialization failed:", err);
        }
        messagingInstance = null;
    }
};

initMessaging();

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
    signInWithApple: async () => {
        const { OAuthProvider } = await import("firebase/auth");
        const appleProvider = new OAuthProvider('apple.com');
        appleProvider.addScope('email');
        appleProvider.addScope('name');
        
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        if (isPWA) {
            localStorage.setItem('pwa_auth_active', 'true');
            await setPersistence(authInstance, browserLocalPersistence);
            return signInWithRedirect(authInstance, appleProvider);
        }
        return signInWithPopup(authInstance, appleProvider);
    },
    signInWithGoogle: async () => {
        const isPWA = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        
        console.log("Initiating Google Sign-In, PWA mode:", isPWA);

        // Set persistence to local to ensure session survives redirect
        await setPersistence(authInstance, browserLocalPersistence);

        if (isPWA) {
            localStorage.setItem('pwa_auth_active', 'true');
            return signInWithRedirect(authInstance, googleProvider);
        }
        
        try {
            return await signInWithPopup(authInstance, googleProvider);
        } catch (error: any) {
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                console.log("Popup blocked, falling back to Redirect");
                localStorage.setItem('pwa_auth_active', 'true');
                return signInWithRedirect(authInstance, googleProvider);
            }
            throw error;
        }
    },
    getRedirectResult: () => getRedirectResult(authInstance),
    setPersistence: async (persistenceType: 'local' | 'session') => {
        const persistence = persistenceType === 'session' ? browserSessionPersistence : browserLocalPersistence;
        try {
            await setPersistence(authInstance, persistence);
        } catch (err) {
            console.error("Persistence error:", err);
        }
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
    saveDeviceToken: async (uid: string, token: string): Promise<void> => {
        await updateDoc(doc(dbInstance, 'users', uid), {
            fcmTokens: arrayUnion(token)
        });
    },
    deleteUserProfile: async (uid: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'users', uid));
    },
    getTrip: async (tripId: string): Promise<Trip | null> => {
        const docRef = doc(dbInstance, 'trips', tripId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? ({ id: docSnap.id, ...docSnap.data() } as Trip) : null;
    },
    checkDuplicateTrip: async (driverId: string, type: string, direction: Direction, departureTime: Timestamp, excludeTripId?: string): Promise<boolean> => {
        const q = query(
            collection(dbInstance, 'trips'),
            where('driverId', '==', driverId),
            where('type', '==', type)
        );
        const snap = await getDocs(q);
        const newTime = departureTime.toMillis();
        for (const doc of snap.docs) {
            if (excludeTripId && doc.id === excludeTripId) continue;
            const data = doc.data();
            if (data.direction === direction) {
                let existingTime = 0;
                if (data.departureTime) {
                    if (typeof data.departureTime.toMillis === 'function') {
                        existingTime = data.departureTime.toMillis();
                    } else if (typeof data.departureTime.getTime === 'function') {
                        existingTime = data.departureTime.getTime();
                    } else if (data.departureTime.seconds) {
                        existingTime = data.departureTime.seconds * 1000;
                    }
                }
                if (existingTime && Math.abs(existingTime - newTime) <= 3600000) {
                    return true;
                }
            }
        }
        return false;
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
                type: 'cancel',
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
                type: 'cancel',
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
                type: 'invite_accepted',
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
                type: 'cancel',
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
        
        // Notify all admins
        const adminsQuery = query(collection(dbInstance, 'users'), where('isAdmin', '==', true));
        const adminsSnap = await getDocs(adminsQuery);
        
        const masterQuery = query(collection(dbInstance, 'users'), where('email', '==', 'saharmish93@gmail.com'));
        const masterSnap = await getDocs(masterQuery);
        
        const adminIds = new Set<string>();
        adminsSnap.forEach(doc => adminIds.add(doc.id));
        masterSnap.forEach(doc => adminIds.add(doc.id));
        
        const batch = writeBatch(dbInstance);
        adminIds.forEach(adminId => {
            const notifRef = doc(collection(dbInstance, 'notifications'));
            batch.set(notifRef, {
                userId: adminId,
                type: 'info',
                title: 'notif_new_report_title',
                message: 'notif_new_report_msg',
                metadata: {
                    userName: reportData.userName,
                    reportType: reportData.type
                },
                isRead: false,
                createdAt: serverTimestamp()
            });
        });
        await batch.commit();
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
