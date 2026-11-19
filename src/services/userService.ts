import { getApps, initializeApp } from 'firebase/app';
import { createUserWithEmailAndPassword, getAuth, signOut, updateProfile } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import {
  inferDefaultDepartment,
  normalizeUserRole,
  type DepartmentType,
  type UserProfile,
  type UserRole,
} from '../types/user';

export interface AppConfigDoc {
  bootstrapPdEmails: string[];
  pdInviteCode: string;
  gasWebhookUrl: string;
  gasSharedSecret: string;
}

export interface AdminCreateUserInput {
  displayName: string;
  email: string;
  password: string;
  role: UserRole;
  department?: DepartmentType;
}

export interface AdminUpdateUserInput {
  displayName: string;
  role: UserRole;
  department?: DepartmentType;
}

export function subscribeTeamUsers(callback: (users: UserProfile[]) => void): () => void {
  const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as Omit<UserProfile, 'uid' | 'role'> & { role?: string };
        return {
          ...data,
          uid: d.id,
          role: normalizeUserRole(data.role),
          department: inferDefaultDepartment(data.role, data.department),
        };
      });
      callback(items);
    },
    () => callback([])
  );
}

export async function adminCreateUserAccount(input: AdminCreateUserInput): Promise<UserProfile> {
  const cleanName = input.displayName.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  if (!cleanName) throw new Error('Vui lòng nhập tên hiển thị.');
  if (!cleanEmail) throw new Error('Vui lòng nhập email.');
  if (input.password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');

  const secondaryAppName = 'admin-user-creator';
  const secondaryApp =
    getApps().find((a) => a.name === secondaryAppName) ||
    initializeApp(auth.app.options, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  const cred = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, input.password);
  try {
    await updateProfile(cred.user, { displayName: cleanName });
  } finally {
    await signOut(secondaryAuth).catch(() => {});
  }

  const now = Date.now();
  const profile: UserProfile = {
    uid: cred.user.uid,
    email: cleanEmail,
    displayName: cleanName,
    avatarDataUrl: '',
    role: input.role,
    department: input.department || 'OTHER',
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, 'users', cred.user.uid), profile);
  return profile;
}

export async function adminUpdateUserAccount(
  uid: string,
  updates: AdminUpdateUserInput
): Promise<void> {
  const cleanName = updates.displayName.trim();
  if (!cleanName) {
    throw new Error('Tên hiển thị không được để trống.');
  }
  await updateDoc(doc(db, 'users', uid), {
    displayName: cleanName,
    role: updates.role,
    ...(updates.department ? { department: updates.department } : {}),
    updatedAt: Date.now(),
  });
}

export async function adminDeleteUserAccount(
  targetUser: UserProfile,
  actorUid: string
): Promise<void> {
  if (targetUser.uid === actorUid) {
    throw new Error('Không thể tự xóa tài khoản đang đăng nhập.');
  }
  const batch = writeBatch(db);
  batch.set(doc(db, 'deletedUsers', targetUser.uid), {
    uid: targetUser.uid,
    email: targetUser.email,
    displayName: targetUser.displayName,
    deletedBy: actorUid,
    deletedAt: Date.now(),
  });
  batch.delete(doc(db, 'users', targetUser.uid));
  await batch.commit();
}

export function subscribeAppConfig(callback: (cfg: AppConfigDoc) => void): () => void {
  return onSnapshot(
    doc(db, 'config', 'app'),
    (snap) => {
      if (!snap.exists()) {
        callback({
          bootstrapPdEmails: [],
          pdInviteCode: '',
          gasWebhookUrl: '',
          gasSharedSecret: '',
        });
        return;
      }
      const data = snap.data() as Partial<AppConfigDoc>;
      callback({
        bootstrapPdEmails: data.bootstrapPdEmails || [],
        pdInviteCode: data.pdInviteCode || '',
        gasWebhookUrl: data.gasWebhookUrl || '',
        gasSharedSecret: data.gasSharedSecret || '',
      });
    },
    () =>
      callback({
        bootstrapPdEmails: [],
        pdInviteCode: '',
        gasWebhookUrl: '',
        gasSharedSecret: '',
      })
  );
}

export async function saveAppConfig(cfg: Partial<AppConfigDoc>): Promise<void> {
  await setDoc(doc(db, 'config', 'app'), cfg, { merge: true });
}
