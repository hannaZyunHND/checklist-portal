import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, bootstrapPdEmails, db, isFirebaseConfigured } from '../config/firebase';
import { isRegisteringAccount } from '../services/authService';
import type { UserProfile, UserRole } from '../types/user';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isConfigured: isFirebaseConfigured,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      unsubscribeProfile = onSnapshot(
        doc(db, 'users', user.uid),
        async (snap) => {
          if (snap.exists()) {
            setUserProfile({ uid: snap.id, ...(snap.data() as Omit<UserProfile, 'uid'>) });
            setLoading(false);
            return;
          }

          // Wait for registerAccount() to write users/{uid}; onSnapshot fires automatically once written
          if (isRegisteringAccount()) {
            return;
          }

          // Auto-heal profile only on login when Auth user exists without Firestore profile
          const email = (user.email || '').toLowerCase();
          let role: UserRole = bootstrapPdEmails.includes(email) ? 'PD' : 'OM';
          try {
            const cfgSnap = await getDoc(doc(db, 'config', 'app'));
            if (cfgSnap.exists()) {
              const list = (cfgSnap.data().bootstrapPdEmails || []) as string[];
              if (list.map((e) => String(e).trim().toLowerCase()).includes(email)) {
                role = 'PD';
              }
            }
          } catch {
            // ignore
          }

          const now = Date.now();
          const fallbackProfile: UserProfile = {
            uid: user.uid,
            email,
            displayName: user.displayName || email.split('@')[0] || 'Thành viên',
            avatarDataUrl: '',
            role,
            createdAt: now,
            updatedAt: now,
          };
          try {
            await setDoc(doc(db, 'users', user.uid), fallbackProfile);
            setUserProfile(fallbackProfile);
          } catch {
            if (role === 'PD') {
              const omProfile: UserProfile = { ...fallbackProfile, role: 'OM' };
              try {
                await setDoc(doc(db, 'users', user.uid), omProfile);
                setUserProfile(omProfile);
              } catch {
                setUserProfile(null);
              }
            } else {
              setUserProfile(null);
            }
          } finally {
            setLoading(false);
          }
        },
        () => {
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        loading,
        isConfigured: isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
