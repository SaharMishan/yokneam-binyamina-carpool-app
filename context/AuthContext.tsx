
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';
import { setDoc, doc, getDoc } from 'firebase/firestore';
import { dbInstance } from '../services/firebase';

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

// Hardcoded list of admin emails for security/initialization
const ADMIN_EMAILS = ['saharmish93@gmail.com'];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentFirebaseUser) => {
            if (currentFirebaseUser) {
                setFirebaseUser(currentFirebaseUser);
                try {
                    const docRef = doc(dbInstance, 'users', currentFirebaseUser.uid);
                    const docSnap = await getDoc(docRef);
                    
                    const isSystemAdmin = ADMIN_EMAILS.includes(currentFirebaseUser.email || '');

                    if (docSnap.exists()) {
                        let profile = docSnap.data() as UserProfile;
                        
                        // Enforce Admin status if email matches, even if DB says false
                        if (isSystemAdmin && !profile.isAdmin) {
                            profile = { ...profile, isAdmin: true };
                            // Background update to DB
                            db.updateUserProfile(currentFirebaseUser.uid, { isAdmin: true }).catch(console.error);
                        }

                        setUser(profile);
                    } else {
                        // AUTO-CREATE PROFILE if missing
                        const newProfile: UserProfile = {
                            uid: currentFirebaseUser.uid,
                            displayName: currentFirebaseUser.displayName || 'Guest User',
                            displayNameEn: null,
                            email: currentFirebaseUser.email,
                            phoneNumber: '', // Default empty, user can update later
                            photoURL: currentFirebaseUser.photoURL || undefined,
                            isAdmin: isSystemAdmin,
                            privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
                        };
                        await setDoc(docRef, newProfile);
                        setUser(newProfile);
                    }
                } catch (e) {
                    console.error("Failed to fetch/create profile", e);
                } finally {
                    setLoading(false);
                }
            } else {
                setFirebaseUser(null);
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            await auth.signInWithGoogle();
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
    
    const signInWithEmail = async (email: string, pass: string) => {
        try {
            await auth.signInWithEmailAndPassword(email, pass);
        } catch (error) {
            console.error(error);
            throw error; 
        }
    };

    const completeUserProfile = async (phoneNumber: string, fullName?: string, fullNameEn?: string) => {
        if (!firebaseUser) return;
        const data: Partial<UserProfile> = { phoneNumber };
        if (fullName) data.displayName = fullName;
        if (fullNameEn) data.displayNameEn = fullNameEn;
        
        await db.updateUserProfile(firebaseUser.uid, data);
        setUser(prev => prev ? ({ ...prev, ...data }) : null);
    };

    const registerWithEmail = async (name: string, phone: string, email: string, pass: string, nameEn?: string) => {
        try {
            const { user: newFirebaseUser } = await auth.createUserWithEmailAndPassword(email, pass) as { user: any };
            if (newFirebaseUser) {
                const isSystemAdmin = ADMIN_EMAILS.includes(email);
                
                // Manually create profile immediately after registration
                const newUserProfile: UserProfile = {
                    uid: newFirebaseUser.uid,
                    displayName: name,
                    displayNameEn: nameEn || null,
                    email: newFirebaseUser.email,
                    phoneNumber: phone,
                    isAdmin: isSystemAdmin,
                    privacySettings: { profileVisibility: 'public', notificationsEnabled: true }
                };
                await db.createUserProfile(newUserProfile);
                setUser(newUserProfile);
            }
        } catch (error) {
            console.error(error);
            throw error; 
        }
    };

    const updateProfile = async (data: Partial<UserProfile>) => {
        if (!user) return;
        try {
            await db.updateUserProfile(user.uid, data);
            setUser(prev => prev ? ({ ...prev, ...data }) : null);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const sendPasswordReset = async (email: string) => {
        try {
            await auth.sendPasswordResetEmail(email);
        } catch (error) {
            console.error(error);
            throw error;
        }
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
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
