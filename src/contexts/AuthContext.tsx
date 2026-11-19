import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, bootstrapPdEmails, db, isFirebaseConfigured } from '../config/firebase';
import { isRegisteringAccount } from '../services/authService';
import {
  inferDefaultDepartment,
  normalizeUserRole,
  type UserProfile,
  type UserRole,
} from '../types/user';

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
            const raw = snap.data() as Omit<UserProfile, 'uid' | 'role'> & { role?: string };
            setUserProfile({
              ...raw,
              uid: snap.id,
              role: normalizeUserRole(raw.role),
              department: inferDefaultDepartment(raw.role, raw.department),
            });
            setLoading(false);
            return;
          }

          if (isRegisteringAccount()) {
            return;
          }

          const email = (user.email || '').toLowerCase();
          let role: UserRole = bootstrapPdEmails.includes(email) ? 'MANAGER' : 'STAFF';
          try {
            const cfgSnap = await getDoc(doc(db, 'config', 'app'));
            if (cfgSnap.exists()) {
              const list = (cfgSnap.data().bootstrapPdEmails || []) as string[];
              if (list.map((e) => String(e).trim().toLowerCase()).includes(email)) {
                role = 'MANAGER';
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
            department: 'OTHER',
            createdAt: now,
            updatedAt: now,
          };
          try {
            await setDoc(doc(db, 'users', user.uid), fallbackProfile);
            setUserProfile(fallbackProfile);
          } catch {
            if (role === 'MANAGER') {
              const staffProfile: UserProfile = { ...fallbackProfile, role: 'STAFF' };
              try {
                await setDoc(doc(db, 'users', user.uid), staffProfile);
                setUserProfile(staffProfile);
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
