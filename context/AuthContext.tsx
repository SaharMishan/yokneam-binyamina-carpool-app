
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
    completeUserProfile: (phoneNumber: string, fullName?: string, fullNameEn?: string) => Promise<void>;
    updateProfile: (data: Partial<UserProfile>) => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    registerWithEmail: (name: string, phone: string, email: string, pass: string, nameEn?: string) => Promise<void>;
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
        const userDocRef = doc(dbInstance, 'users', loggedInUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        const isMaster = loggedInUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();

        if (!userDoc.exists()) {
            const newUserProfile: UserProfile = {
                uid: loggedInUser.uid,
                displayName: loggedInUser.displayName || 'Guest',
                displayNameEn: null,
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
    };

    useEffect(() => {
        let unsubscribeProfile: (() => void) | null = null;

        const unsubscribeAuth = auth.onAuthStateChanged(async (currentFirebaseUser) => {
            if (unsubscribeProfile) {
                unsubscribeProfile();
                unsubscribeProfile = null;
            }

            if (currentFirebaseUser) {
                setFirebaseUser(currentFirebaseUser);
                const isMaster = currentFirebaseUser.email?.toLowerCase() === MASTER_EMAIL.toLowerCase();
                
                const docRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
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
                });
            } else {
                setFirebaseUser(null);
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeProfile) unsubscribeProfile();
        };
    }, []);

    const signInWithGoogle = async () => {
        const result = await auth.signInWithGoogle() as any;
        if (result?.user) await syncUserProfile(result.user);
    };

    const signInWithEmail = async (email: string, pass: string) => {
        const cleanEmail = email.toLowerCase().trim();
        await auth.signInWithEmailAndPassword(cleanEmail, pass);
    };

    const registerWithEmail = async (name: string, phone: string, email: string, pass: string, nameEn?: string) => {
        const cleanEmail = email.toLowerCase().trim();
        const { user: newFirebaseUser } = await auth.createUserWithEmailAndPassword(cleanEmail, pass) as { user: any };
        if (newFirebaseUser) {
            const isMaster = cleanEmail === MASTER_EMAIL.toLowerCase();
            const newUserProfile: UserProfile = {
                uid: newFirebaseUser.uid,
                displayName: name,
                displayNameEn: nameEn || null,
                email: cleanEmail,
                phoneNumber: phone,
                isAdmin: isMaster,
                createdAt: serverTimestamp() as any,
                privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
            };
            await db.createUserProfile(newUserProfile);
        }
    };

    const completeUserProfile = async (phoneNumber: string, fullName?: string, fullNameEn?: string) => {
        if (!firebaseUser) return;
        const update: any = { phoneNumber };
        if (fullName) update.displayName = fullName;
        if (fullNameEn) update.displayNameEn = fullNameEn;
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
