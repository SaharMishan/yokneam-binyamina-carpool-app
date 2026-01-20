
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, dbInstance } from '../services/firebase';
import { UserProfile } from '../types';
import { setDoc, doc, onSnapshot, getDoc } from 'firebase/firestore';

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

// מנהל העל הבלעדי של המערכת (Master Admin)
export const MASTER_EMAIL = 'saharmish93@gmail.com';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                
                // BOOTSTRAP: סנכרון מאולץ עבור מנהל העל
                if (isMaster) {
                    try {
                        const masterRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                        // אנחנו משתמשים ב-setDoc עם merge:true כדי לוודא ששדה ה-isAdmin תמיד יהיה true בשרת
                        await setDoc(masterRef, { 
                            isAdmin: true,
                            email: currentFirebaseUser.email,
                            uid: currentFirebaseUser.uid
                        }, { merge: true });
                    } catch (e) {
                        console.error("Master Admin bootstrap failed", e);
                    }
                }

                const docRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setUser({ ...docSnap.data(), uid: docSnap.id } as UserProfile);
                    } else {
                        const shell: UserProfile = {
                            uid: currentFirebaseUser.uid,
                            displayName: currentFirebaseUser.displayName || 'Guest',
                            email: currentFirebaseUser.email,
                            phoneNumber: '',
                            isAdmin: isMaster, 
                            privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
                        };
                        setUser(shell);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Profile Sync Error", error);
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
        await auth.signInWithGoogle();
    };
    
    const signInWithEmail = async (email: string, pass: string) => {
        await auth.signInWithEmailAndPassword(email, pass);
    };

    const registerWithEmail = async (name: string, phone: string, email: string, pass: string, nameEn?: string) => {
        const { user: newFirebaseUser } = await auth.createUserWithEmailAndPassword(email, pass) as { user: any };
        if (newFirebaseUser) {
            const isMaster = email.toLowerCase() === MASTER_EMAIL.toLowerCase();
            const newUserProfile: UserProfile = {
                uid: newFirebaseUser.uid,
                displayName: name,
                displayNameEn: nameEn || null,
                email: email,
                phoneNumber: phone,
                isAdmin: isMaster,
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
        await db.updateUserProfile(user.uid, data);
    };

    const sendPasswordReset = async (email: string) => {
        await auth.sendPasswordResetEmail(email);
    };

    const signOut = async () => {
        await auth.signOut();
        setFirebaseUser(null);
        setUser(null);
    };

    const value = { user, firebaseUser, loading, signInWithGoogle, signOut, completeUserProfile, updateProfile, signInWithEmail, registerWithEmail, sendPasswordReset };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
