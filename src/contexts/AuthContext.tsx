import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
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
  revokedMessage: string;
  clearRevokedMessage: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isConfigured: isFirebaseConfigured,
  revokedMessage: '',
  clearRevokedMessage: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [revokedMessage, setRevokedMessage] = useState('');

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
            setRevokedMessage('');
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

          try {
            const deletedSnap = await getDoc(doc(db, 'deletedUsers', user.uid));
            if (deletedSnap.exists()) {
              setRevokedMessage(
                'Tài khoản này đã bị Quản lý xóa khỏi hệ thống. Vui lòng liên hệ Quản lý nếu cần hỗ trợ.'
              );
              setUserProfile(null);
              await signOut(auth);
              setLoading(false);
              return;
            }
          } catch {
            // ignore and continue fallback check
          }

          setRevokedMessage('');
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
        revokedMessage,
        clearRevokedMessage: () => setRevokedMessage(''),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
