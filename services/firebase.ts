
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
 * 1. Ensure your production domain (e.g., yokneam-binyamina-carpool-app.vercel.app) is added to 
 *    "Authorized domains" in Firebase Console -> Authentication -> Settings.
 * 2. Ensure VITE_FIREBASE_AUTH_DOMAIN is set to your project's .firebaseapp.com domain
 *    unless you have specifically configured a custom domain for auth.
 */
// Determine the best authDomain
// We use the official firebaseapp.com domain as the primary authDomain.
// This is the most compatible way and prevents 'unauthorized-domain' errors.
const authDomain = cleanEnvValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) || "carpool-yokneam.firebaseapp.com";

const firebaseConfig = {
  apiKey: cleanEnvValue(import.meta.env.VITE_FIREBASE_API_KEY) || "AIzaSyDPMvgiA-BMTfjpns7CYsfNFrU5PWqnJGw",
  authDomain: authDomain,
  projectId: "carpool-yokneam",
  storageBucket: "carpool-yokneam.firebasestorage.app",
  messagingSenderId: "374315181940",
  appId: "1:374315181940:web:e322c995e8c3b25e3eee21",
  measurementId: "G-LB4XC4NRZQ"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const authInstance = getAuth(app);

// Set persistence once at the very beginning to avoid race conditions during login
setPersistence(authInstance, browserLocalPersistence).catch(err => {
    console.error("🚀 Firebase: Initial persistence error:", err);
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
    signInWithGoogle: async () => {
        const isStandalone = (window.matchMedia('(display-mode: standalone)').matches) || (navigator as any).standalone;
        console.log("🚀 Firebase: signInWithGoogle started. PWA Mode:", !!isStandalone, "Host:", window.location.host);
        
        try {
            // Try popup first as it's the best UX
            const result = await signInWithPopup(authInstance, googleProvider);
            console.log("🚀 Firebase: Popup success");
            return result;
        } catch (error: any) {
            console.warn("🚀 Firebase: Popup failed/blocked. Code:", error.code);
            
            // Fallback to redirect for environments that don't support popups
            if (
                error.code === 'auth/popup-blocked' || 
                error.code === 'auth/operation-not-supported-in-this-environment' ||
                error.code === 'auth/popup-closed-by-user' ||
                error.code === 'auth/unauthorized-domain' ||
                isStandalone
            ) {
                console.log("🚀 Firebase: Falling back to signInWithRedirect");
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

const NOTIF_TRANSLATIONS: Record<string, string> = {
    notif_request_title: 'הצטרפות לנסיעה',
    notif_join_msg: '{name} הצטרף/ה לנסיעה שלך',
    notif_approved_title: 'בקשתך אושרה!',
    notif_approved_msg: 'הנהג אישר את הצטרפותך לנסיעה. פרטי הקשר זמינים כעת.',
    notif_invite_title: 'קיבלת הצעה לנסיעה!',
    notif_invite_msg: '{name} הזמין אותך לנסיעה {direction} בשעה {time}',
    notif_invite_accepted_title: 'הזמנה התקבלה!',
    notif_invite_accepted_msg: '{name} אישר/ה את ההזמנה לנסיעה שלך',
    notif_rejected_title: 'בקשת ההצטרפות נדחתה',
    notif_rejected_msg: 'מצטערים, אך לא ניתן לצרף אותך לנסיעה זו כרגע.',
    notif_trip_cancelled_title: 'נסיעה בוטלה',
    notif_trip_cancelled_msg: 'נסיעה שהיית רשום/ה אליה בוטלה על ידי הנהג.',
    notif_removed_title: 'הוסרת מהנסיעה',
    notif_removed_msg: 'הנהג הסיר אותך מהנסיעה המתוכננת.',
    notif_passenger_left_title: 'נוסע עזב את הנסיעה',
    notif_passenger_left_msg: '{name} עזב/ה את הנסיעה שלך',
    notif_new_report_title: 'דיווח חדש התקבל',
    notif_new_report_msg: '{userName} שלח/ה דיווח חדש מסוג: {reportType}',
    invite_accepted: 'הזמנה התקבלה!',
    'Yokneam -> Binyamina': 'יקנעם ← בנימינה',
    'Binyamina -> Yokneam': 'בנימינה ← יקנעם',
    report_type_bug: 'תקלה',
    report_type_improvement: 'הצעה לשיפור',
    to_north: 'יקנעם',
    to_center: 'בנימינה',
};

export const getTranslatedText = (key: string, params: Record<string, string> = {}) => {
    let text = NOTIF_TRANSLATIONS[key] || key;
    Object.keys(params).forEach(p => {
        text = text.replace(`{${p}}`, params[p]);
    });
    return text;
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
        // Refactored to use only driverId in query to avoid composite index requirements
        const q = query(
            collection(dbInstance, 'trips'),
            where('driverId', '==', driverId)
        );
        const snap = await getDocs(q);
        const newTime = departureTime.toMillis();
        for (const doc of snap.docs) {
            if (excludeTripId && doc.id === excludeTripId) continue;
            const data = doc.data();
            // Filter by type, direction, and time in JavaScript
            if (data.type === type && data.direction === direction) {
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
    deleteTrip: async (tripId: string): Promise<void> => {
        await deleteDoc(doc(dbInstance, 'trips', tripId));
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
            
            // Set status to approved immediately
            const approvedPassenger = { ...passenger, status: 'approved' as const };
            transaction.update(tripRef, { 
                passengers: [...passengers, approvedPassenger],
                availableSeats: increment(-1)
            });

            // Delete matching requests from this passenger
            // Refactored to use only driverId in query to avoid composite index requirements
            const passengerRequestsQuery = query(
                collection(dbInstance, 'trips'),
                where('driverId', '==', passenger.uid)
            );
            const requestsSnap = await getDocs(passengerRequestsQuery);
            const tripDateStr = tripData.departureTime.toDate().toDateString();
            requestsSnap.forEach(requestDoc => {
                const reqData = requestDoc.data();
                // Filter by type, direction and time in JavaScript
                if (reqData.type === 'request' && reqData.direction === tripData.direction && reqData.departureTime?.toDate().toDateString() === tripDateStr) {
                    transaction.delete(requestDoc.ref);
                }
            });

            const notifRef = doc(collection(dbInstance, 'notifications'));
            const title = getTranslatedText('notif_request_title');
            const message = getTranslatedText('notif_join_msg', { name: passenger.name });
            transaction.set(notifRef, {
                userId: tripData.driverId,
                type: 'match',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_approved_title');
            const message = getTranslatedText('notif_approved_msg');
            transaction.set(notifRef, {
                userId: passengerId,
                type: 'approved',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_rejected_title');
            const message = getTranslatedText('notif_rejected_msg');
            transaction.set(notifRef, {
                userId: passengerId,
                type: 'cancel',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_removed_title');
            const message = getTranslatedText('notif_removed_msg');
            transaction.set(notifRef, {
                userId: passengerId,
                type: 'cancel',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_invite_accepted_title');
            const message = getTranslatedText('notif_invite_accepted_msg', { name: passenger.name });
            transaction.set(notifRef, {
                userId: data.driverId,
                type: 'invite_accepted',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_passenger_left_title');
            const message = getTranslatedText('notif_passenger_left_msg', { name: passenger.name });
            transaction.set(notifRef, {
                userId: data.driverId,
                type: 'cancel',
                title,
                message,
                notification: { title, body: message },
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
            const title = getTranslatedText('notif_trip_cancelled_title');
            const message = getTranslatedText('notif_trip_cancelled_msg');
            batch.set(notifRef, {
                userId: p.uid,
                type: 'cancel',
                title,
                message,
                notification: { title, body: message },
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
        // Refactored to use only userId in query to avoid composite index requirements
        const q = query(collection(dbInstance, 'notifications'), where('userId', '==', uid));
        const snap = await getDocs(q);
        const batch = writeBatch(dbInstance);
        snap.docs.forEach(d => {
            const data = d.data();
            if (data.isRead === false) {
                batch.update(d.ref, { isRead: true });
            }
        });
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
        // Refactored to use only driverId in query to avoid composite index requirements
        const q = query(
            collection(dbInstance, 'trips'),
            where('driverId', '==', uid)
        );
        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Trip))
            .filter(ride => 
                ride.type === 'offer' &&
                ride.direction === direction && 
                ride.departureTime.toDate() >= thirtyMinsAgo
            );
    },
    sendSpecificTripInvitation: async (driverName: string, passengerId: string, trip: Trip): Promise<void> => {
        const tripRef = doc(dbInstance, 'trips', trip.id);
        
        await runTransaction(dbInstance, async (transaction) => {
            const tripDoc = await transaction.get(tripRef);
            if (!tripDoc.exists()) throw new Error("Trip does not exist");
            const data = tripDoc.data() as Trip;
            
            // Get passenger details to add to trip
            const userRef = doc(dbInstance, 'users', passengerId);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) throw new Error("User does not exist");
            const userData = userDoc.data() as UserProfile;

            const passenger: Passenger = {
                uid: passengerId,
                name: userData.displayName || 'Passenger',
                photo: userData.photoURL || '',
                phoneNumber: userData.phoneNumber || '',
                status: 'approved'
            };

            const passengers = [...(data.passengers || []), passenger];
            transaction.update(tripRef, { 
                passengers, 
                availableSeats: increment(-1) 
            });

            // Delete matching requests from this passenger
            // Refactored to use only driverId in query to avoid composite index requirements
            const passengerRequestsQuery = query(
                collection(dbInstance, 'trips'),
                where('driverId', '==', passengerId)
            );
            const requestsSnap = await getDocs(passengerRequestsQuery);
            const tripDateStr = data.departureTime.toDate().toDateString();
            requestsSnap.forEach(requestDoc => {
                const reqData = requestDoc.data();
                // Filter by type, direction and date in JavaScript
                if (reqData.type === 'request' && reqData.direction === data.direction && reqData.departureTime?.toDate().toDateString() === tripDateStr) {
                    transaction.delete(requestDoc.ref);
                }
            });

            const notifRef = doc(collection(dbInstance, 'notifications'));
            const title = getTranslatedText('notif_invite_title');
            const timeStr = data.departureTime.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
            const directionText = getTranslatedText(data.direction === Direction.YOKNEAM_TO_BINYAMINA ? 'yokneam_to_binyamina' : 'binyamina_to_yokneam');
            const message = getTranslatedText('notif_invite_msg', { 
                name: driverName, 
                direction: directionText,
                time: timeStr
            });

            transaction.set(notifRef, {
                userId: passengerId,
                type: 'invite',
                title,
                message,
                notification: { title, body: message },
                relatedTripId: trip.id,
                metadata: {
                    driverName,
                    directionKey: data.direction === Direction.YOKNEAM_TO_BINYAMINA ? 'yokneam_to_binyamina' : 'binyamina_to_yokneam',
                    time: timeStr
                },
                isRead: false,
                createdAt: serverTimestamp()
            });
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
        const reportRef = await addDoc(collection(dbInstance, 'reports'), { ...reportData, status: 'open', createdAt: serverTimestamp() });
        
        // Notify all admins
        const adminsQuery = query(collection(dbInstance, 'users'), where('isAdmin', '==', true));
        const adminsSnap = await getDocs(adminsQuery);
        
        const masterQuery = query(collection(dbInstance, 'users'), where('email', '==', 'saharmish93@gmail.com'));
        const masterSnap = await getDocs(masterQuery);
        
        const adminIds = new Set<string>();
        adminsSnap.forEach(doc => adminIds.add(doc.id));
        masterSnap.forEach(doc => adminIds.add(doc.id));
        
        const batch = writeBatch(dbInstance);
        const title = getTranslatedText('notif_new_report_title');
        const message = getTranslatedText('notif_new_report_msg', { 
            userName: reportData.userName, 
            reportType: getTranslatedText(`report_type_${reportData.type}`) 
        });

        adminIds.forEach(adminId => {
            const notifRef = doc(collection(dbInstance, 'notifications'));
            batch.set(notifRef, {
                userId: adminId,
                type: 'info',
                title,
                message,
                notification: { title, body: message },
                metadata: {
                    reportId: reportRef.id,
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
        const msgRef = await addDoc(collection(dbInstance, 'messages'), { ...msg, createdAt: serverTimestamp() });
        
        // Notify other participants (driver or passengers)
        const tripRef = doc(dbInstance, 'trips', msg.tripId);
        const tripSnap = await getDoc(tripRef);
        
        if (tripSnap.exists()) {
            const tripData = tripSnap.data() as Trip;
            const participants = new Set<string>();
            if (tripData.driverId !== msg.senderId) participants.add(tripData.driverId);
            tripData.passengers?.forEach(p => {
                if (p.uid !== msg.senderId && p.status === 'approved') {
                    participants.add(p.uid);
                }
            });

            const batch = writeBatch(dbInstance);
            participants.forEach(pid => {
                const notifRef = doc(collection(dbInstance, 'notifications'));
                const title = `הודעה חדשה מ-${msg.senderName}`;
                batch.set(notifRef, {
                    userId: pid,
                    type: 'info',
                    title,
                    message: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : ''),
                    notification: { title, body: msg.text },
                    relatedTripId: msg.tripId,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
        }
    }
};
