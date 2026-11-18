import {
  createUserWithEmailAndPassword,
  deleteUser,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, bootstrapPdEmails, db } from '../config/firebase';
import type { UserProfile, UserRole } from '../types/user';
import { compressImageFileToDataUrl } from '../utils/imageCompression';

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  pdInviteCode?: string;
}

export const PRESET_AVATARS = [
  { id: 'teal', label: 'Teal', bg: '#0D9488', fg: '#FFFFFF' },
  { id: 'navy', label: 'Navy', bg: '#0F172A', fg: '#FFFFFF' },
  { id: 'orange', label: 'Orange', bg: '#EA580C', fg: '#FFFFFF' },
  { id: 'indigo', label: 'Indigo', bg: '#4F46E5', fg: '#FFFFFF' },
  { id: 'emerald', label: 'Emerald', bg: '#059669', fg: '#FFFFFF' },
];

let registeringFlag = false;
const registrationListeners = new Set<() => void>();

export function isRegisteringAccount(): boolean {
  return registeringFlag;
}

export function onRegisteringChange(listener: () => void): () => void {
  registrationListeners.add(listener);
  return () => registrationListeners.delete(listener);
}

function setRegisteringFlag(val: boolean) {
  registeringFlag = val;
  registrationListeners.forEach((fn) => fn());
}

export async function compressAvatarFile(file: File): Promise<string> {
  return compressImageFileToDataUrl(file, {
    maxDimension: 256,
    maxDataUrlLength: 105_000,
    initialQuality: 0.82,
    minQuality: 0.35,
  });
}

export async function registerAccount(input: RegisterInput): Promise<UserProfile> {
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanName = input.displayName.trim();
  const cleanInvite = (input.pdInviteCode || '').trim();

  setRegisteringFlag(true);
  let createdCredUser: Awaited<ReturnType<typeof createUserWithEmailAndPassword>>['user'] | null =
    null;

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, input.password);
    createdCredUser = cred.user;

    await updateProfile(cred.user, { displayName: cleanName });

    let role: UserRole = 'OM';
    let inviteCodeUsed = '';

    let configBootstrapEmails: string[] = [];
    let storedInviteCode = '';

    try {
      const cfgSnap = await getDoc(doc(db, 'config', 'app'));
      if (cfgSnap.exists()) {
        const cfg = cfgSnap.data() as {
          bootstrapPdEmails?: string[];
          pdInviteCode?: string;
        };
        configBootstrapEmails = (cfg.bootstrapPdEmails || []).map((e) =>
          String(e).trim().toLowerCase()
        );
        storedInviteCode = (cfg.pdInviteCode || '').trim();
      }
    } catch {
      // Config doc might not exist yet
    }

    const isBootstrapEmail =
      bootstrapPdEmails.includes(cleanEmail) || configBootstrapEmails.includes(cleanEmail);

    if (cleanInvite) {
      if (storedInviteCode && cleanInvite === storedInviteCode) {
        role = 'PD';
        inviteCodeUsed = cleanInvite;
      } else {
        try {
          await deleteUser(cred.user);
        } catch {
          // ignore
        }
        throw new Error(
          'Mã mời PD không chính xác. Vui lòng kiểm tra lại hoặc để trống để đăng ký vai trò OM.'
        );
      }
    } else if (isBootstrapEmail) {
      role = 'PD';
    }

    const now = Date.now();
    const profile: UserProfile = {
      uid: cred.user.uid,
      email: cleanEmail,
      displayName: cleanName,
      avatarDataUrl: '',
      role,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(doc(db, 'users', cred.user.uid), {
        ...profile,
        ...(inviteCodeUsed ? { inviteCodeUsed } : {}),
      });
    } catch (writeErr) {
      // If PD creation failed due to missing config/app in Firestore Rules, fall back to OM or throw clear error
      if (role === 'PD') {
        const fallbackOm: UserProfile = { ...profile, role: 'OM' };
        await setDoc(doc(db, 'users', cred.user.uid), fallbackOm);
        return fallbackOm;
      }
      throw writeErr;
    }

    return profile;
  } catch (err) {
    if (createdCredUser && err instanceof Error && err.message.includes('permission')) {
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
    }
    throw err;
  } finally {
    setRegisteringFlag(false);
  }
}

export async function loginAccount(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
}

export async function logoutAccount(): Promise<void> {
  await signOut(auth);
}

export async function updateUserProfileInfo(
  uid: string,
  updates: { displayName: string; avatarDataUrl: string }
): Promise<void> {
  const cleanName = updates.displayName.trim();
  if (!cleanName) {
    throw new Error('Tên hiển thị không được để trống.');
  }
  await updateDoc(doc(db, 'users', uid), {
    displayName: cleanName,
    avatarDataUrl: updates.avatarDataUrl,
    updatedAt: Date.now(),
  });
  if (auth.currentUser && auth.currentUser.uid === uid) {
    await updateProfile(auth.currentUser, { displayName: cleanName });
  }
}

export function mapAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký. Vui lòng đăng nhập.';
    case 'auth/invalid-email':
      return 'Địa chỉ email không hợp lệ.';
    case 'auth/weak-password':
      return 'Mật khẩu phải có ít nhất 6 ký tự.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu chưa đúng.';
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử thất bại. Vui lòng thử lại sau ít phút.';
    default:
      return err instanceof Error ? err.message : 'Đã xảy ra lỗi xác thực. Vui lòng thử lại.';
  }
}
