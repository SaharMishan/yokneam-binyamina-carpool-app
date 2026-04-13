
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, dbInstance } from '../services/firebase';
import { UserProfile } from '../types';
import { setDoc, doc, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
    user: UserProfile | null;
    firebaseUser: any | null; 
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    completeUserProfile: (phoneNumber: string, fullName?: string) => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (name: string, phone: string, email: string, pass: string) => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const MASTER_EMAIL = 'saharmish93@gmail.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const syncUserProfile = async (loggedInUser: any) => {
        if (!loggedInUser) return;
        try {
            const userDocRef = doc(dbInstance, 'users', loggedInUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            const isMaster = loggedInUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

            if (!userDoc.exists()) {
                console.log("Creating new user profile for:", loggedInUser.email);
                const newUserProfile: UserProfile = {
                    uid: loggedInUser.uid,
                    displayName: loggedInUser.displayName || 'Guest',
                    email: loggedInUser.email?.toLowerCase().trim() || null,
                    phoneNumber: '',
                    photoURL: loggedInUser.photoURL || '',
                    isAdmin: isMaster,
                    createdAt: serverTimestamp() as any,
                    privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
                };
                await setDoc(userDocRef, newUserProfile);
            } else {
                // Update existing profile with latest info from provider if needed, but don't overwrite custom data
                await setDoc(userDocRef, {
                    email: loggedInUser.email?.toLowerCase().trim(),
                    photoURL: loggedInUser.photoURL || userDoc.data().photoURL || '',
                    isAdmin: isMaster || userDoc.data().isAdmin
                }, { merge: true });
            }
        } catch (error) {
            console.error("Error syncing user profile:", error);
        }
    };

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;
        let isMounted = true;
        let redirectChecked = false;
        let authStateReceived = false;

        const maybeFinishLoading = () => {
            if (isMounted && redirectChecked && authStateReceived && !auth.currentUser) {
                setLoading(false);
            }
        };

        // Handle redirect result for mobile Google Sign-In
        const handleRedirect = async () => {
            const isPWAAuth = localStorage.getItem('pwa_auth_active') === 'true';
            if (isPWAAuth) {
                console.log("PWA Auth return detected, waiting for result...");
                setLoading(true);
            }

            try {
                // This is the core fix: catch the result of the redirect
                const result = await auth.getRedirectResult();
                if (result?.user && isMounted) {
                    console.log("Redirect Sign-In Success:", result.user.email);
                    await syncUserProfile(result.user);
                }
            } catch (error: any) {
                console.error("Redirect Sign-In Error:", error.code, error.message);
                // If ITP/Safari blocks the cookie, we might get an internal error
                if (error.code === 'auth/internal-error' && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                    console.warn("Detected iOS internal auth error - likely ITP related. Custom Auth Domain is required.");
                }
            } finally {
                localStorage.removeItem('pwa_auth_active');
                redirectChecked = true;
                maybeFinishLoading();
            }
        };

        const unsubscribeAuth = auth.onAuthStateChanged(async (currentFirebaseUser) => {
            if (!isMounted) return;
            console.log("Auth State Changed:", currentFirebaseUser ? `User: ${currentFirebaseUser.email}` : "No user");
            
            authStateReceived = true;

            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = null;
            }

            if (currentFirebaseUser) {
                setFirebaseUser(currentFirebaseUser);
                await syncUserProfile(currentFirebaseUser);

                const isMaster = currentFirebaseUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();
                const docRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                
                unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
                    if (!isMounted) return;
                    if (docSnap.exists()) {
                        setUser({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
                    } else {
                        const shell: UserProfile = {
                            uid: currentFirebaseUser.uid,
                            displayName: currentFirebaseUser.displayName || 'Guest',
                            email: currentFirebaseUser.email?.toLowerCase().trim() || null,
                            phoneNumber: '',
                            photoURL: currentFirebaseUser.photoURL || '',
                            isAdmin: isMaster, 
                            privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
                        };
                        setUser(shell);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Profile Snapshot Error:", error);
                    if (isMounted) setLoading(false);
                });
            } else {
                setFirebaseUser(null);
                setUser(null);
                maybeFinishLoading();
            }
        });

        handleRedirect();

        return () => {
            isMounted = false;
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const signInWithGoogle = async () => {
        try {
            const result = await auth.signInWithGoogle() as any;
            if (result?.user) await syncUserProfile(result.user);
        } catch (error: any) {
            console.error("Google Sign-In Error:", error.code, error.message);
            // Re-throw so the UI (LoginView) can catch it and display it in its own error section
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        const cleanEmail = email.toLowerCase().trim();
        await auth.signInWithEmailAndPassword(cleanEmail, pass);
    };

    const registerWithEmail = async (name: string, phone: string, email: string, pass: string) => {
        const cleanEmail = email.toLowerCase().trim();
        const { user: newFirebaseUser } = await auth.createUserWithEmailAndPassword(cleanEmail, pass) as { user: any };
        if (newFirebaseUser) {
            const isMaster = cleanEmail === MASTER_EMAIL.toLowerCase();
            const newUserProfile: UserProfile = {
                uid: newFirebaseUser.uid,
                displayName: name,
                email: cleanEmail,
                phoneNumber: phone,
                isAdmin: isMaster,
                createdAt: serverTimestamp() as any,
                privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
            };
            await db.createUserProfile(newUserProfile);
        }
    };

    const completeUserProfile = async (phoneNumber: string, fullName?: string) => {
        if (!firebaseUser) return;
        const update: any = { phoneNumber };
        if (fullName) update.displayName = fullName;
        await db.updateUserProfile(firebaseUser.uid, update);
    };

    const updateProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        if (data.email) data.email = data.email.toLowerCase().trim();
        await db.updateUserProfile(user.uid, data);
    };

    const sendPasswordReset = async (email: string) => {
        await auth.sendPasswordResetEmail(email.toLowerCase().trim());
    };

    const signOut = async () => {
        setLoading(true);
        await auth.signOut();
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
    };

    const value = { user, firebaseUser, loading, signInWithGoogle, signOut, completeUserProfile, updateProfile, signInWithEmail, registerWithEmail, sendPasswordReset };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth error');
    return context;
};
