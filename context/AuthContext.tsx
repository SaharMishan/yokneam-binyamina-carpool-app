
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
    const isMounted = React.useRef(true);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(auth.currentUser);
    const [isInitialized, setIsInitialized] = useState(!!auth.currentUser);
    
    // Safety timer: Always initialize after 3 seconds no matter what
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!isInitialized) {
                console.warn("🚀 AuthProvider: Force initializing after timeout");
                setIsInitialized(true);
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [isInitialized]);

    useEffect(() => {
        console.log("🚀 AuthProvider State: user:", firebaseUser?.email || 'NULL', "isInitialized:", isInitialized);
    }, [firebaseUser, isInitialized]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const syncUserProfile = async (loggedInUser: any) => {
        if (!loggedInUser || !isMounted.current) return;
        
        // Check if user profile already loaded via snapshot, skip sync
        if (user) return; 

        try {
            const userDocRef = doc(dbInstance, 'users', loggedInUser.uid);
            const userDoc = await getDoc(userDocRef);
            
            const isMaster = loggedInUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

            if (!userDoc.exists()) {
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
                const existingData = userDoc.data();
                if (existingData.photoURL !== loggedInUser.photoURL || 
                    existingData.email !== loggedInUser.email?.toLowerCase().trim() ||
                    existingData.isAdmin !== (isMaster || existingData.isAdmin)) {
                    
                    await setDoc(userDocRef, {
                        email: loggedInUser.email?.toLowerCase().trim(),
                        photoURL: loggedInUser.photoURL || existingData.photoURL || '',
                        isAdmin: isMaster || existingData.isAdmin
                    }, { merge: true });
                }
            }
        } catch (error) {
            console.error("Error syncing user profile:", error);
        }
    };

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;
        let firstAuthStateReceived = false;

        // 1. Handle Redirect Result in background
        console.log("🚀 AuthContext: checking getRedirectResult...");
        auth.getRedirectResult().then(result => {
            if (result?.user && isMounted.current) {
                console.log("🚀 AuthContext: Redirect success for:", result.user.email);
                setFirebaseUser(result.user);
                setIsInitialized(true);
                syncUserProfile(result.user);
            } else {
                console.log("🚀 AuthContext: No redirect result found or no user");
            }
        }).catch(err => {
            if (err.code !== 'auth/popup-closed-by-user') {
                console.error("🚀 AuthContext: Redirect result error", err.code, err.message);
            }
        });

        // 2. Listen for Auth State Changes
        const unsubscribeAuth = auth.onAuthStateChanged(async (currentFirebaseUser) => {
            console.log("🚀 AuthContext: onAuthStateChanged event:", currentFirebaseUser?.email || 'No user', "Mounted:", isMounted.current);
            
            // Always set initialized to true once we hear back from Firebase
            setIsInitialized(true); 

            if (isMounted.current) {
                setFirebaseUser(currentFirebaseUser);
            }

            if (currentFirebaseUser) {
                syncUserProfile(currentFirebaseUser);

                const docRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                if (unsubscribeProfile) unsubscribeProfile();
                
                unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists() && isMounted.current) {
                        setUser({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
                    } else if (isMounted.current) {
                        const isMaster = currentFirebaseUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();
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
                }, (error) => {
                    console.error("AuthContext: Profile Snapshot Error", error);
                });
            } else {
                setUser(null);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const signInWithGoogle = async () => {
        console.log("🚀 AuthContext: signInWithGoogle started");
        try {
            const result = await auth.signInWithGoogle() as any;
            console.log("🚀 AuthContext: signInWithGoogle success", result?.user?.email);
            
            if (result?.user && isMounted.current) {
                // FORCE immediate state update to bypass any listener delays
                setFirebaseUser(result.user);
                setIsInitialized(true);
                
                // Background sync
                syncUserProfile(result.user).catch(err => console.error("Sync error:", err));
            }
        } catch (error: any) {
            console.error("🚀 AuthContext: Google Sign-In Error:", error.code, error.message);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        console.log("🚀 AuthContext: signInWithEmail attempt for:", email);
        const cleanEmail = email.toLowerCase().trim();
        const result = await auth.signInWithEmailAndPassword(cleanEmail, pass) as any;
        console.log("🚀 AuthContext: signInWithEmail success", result?.user?.email);
        
        if (result?.user && isMounted.current) {
            // FORCE immediate state update to ensure UI re-renders right away
            setFirebaseUser(result.user);
            setIsInitialized(true);
            
            // Background sync
            syncUserProfile(result.user).catch(err => console.error("Sync error:", err));
        }
    };

    const registerWithEmail = async (name: string, phone: string, email: string, pass: string) => {
        const cleanEmail = email.toLowerCase().trim();
        const result = await auth.createUserWithEmailAndPassword(cleanEmail, pass) as any;
        const newFirebaseUser = result?.user;
        
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
            
            if (isMounted.current) {
                // FORCE immediate state update
                setFirebaseUser(newFirebaseUser);
                setIsInitialized(true);
            }
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
        setIsInitialized(false);
        await auth.signOut();
        setFirebaseUser(null);
        setUser(null);
        setIsInitialized(true);
    };

    const value = { 
        user, 
        firebaseUser, 
        loading: !isInitialized,
        signInWithGoogle, 
        signOut, 
        completeUserProfile, 
        updateProfile, 
        signInWithEmail, 
        registerWithEmail, 
        sendPasswordReset
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth error');
    return context;
};
