import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserProfile, UserRole } from '../types/user';

export interface AppConfigDoc {
  bootstrapPdEmails: string[];
  pdInviteCode: string;
  gasWebhookUrl: string;
  gasSharedSecret: string;
}

export function subscribeTeamUsers(callback: (users: UserProfile[]) => void): () => void {
  const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() as Omit<UserProfile, 'uid'>;
        return { uid: d.id, ...data };
      });
      callback(items);
    },
    () => callback([])
  );
}

export async function updateMemberRole(uid: string, role: UserRole): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    role,
    updatedAt: Date.now(),
  });
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
