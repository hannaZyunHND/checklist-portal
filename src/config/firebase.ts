import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.startsWith('your-')
);

export const bootstrapPdEmails: string[] = (import.meta.env.VITE_BOOTSTRAP_PD_EMAILS || '')
  .split(',')
  .map((s: string) => s.trim().toLowerCase())
  .filter(Boolean);

export const gasConfig = {
  webhookUrl: (import.meta.env.VITE_GAS_WEBHOOK_URL || '').trim(),
  secret: (import.meta.env.VITE_GAS_SECRET || '').trim(),
};

export const r2Config = {
  workerUrl: (import.meta.env.VITE_R2_WORKER_URL || '').trim().replace(/\/+$/, ''),
  workerSecret: (import.meta.env.VITE_R2_WORKER_SECRET || '').trim(),
  endpoint: (import.meta.env.VITE_R2_ENDPOINT || '').trim().replace(/\/+$/, ''),
  bucket: (import.meta.env.VITE_R2_BUCKET || '').trim(),
  accessKey: (import.meta.env.VITE_R2_ACCESS_KEY || '').trim(),
  secretKey: (import.meta.env.VITE_R2_SECRET_KEY || '').trim(),
  publicUrl: (import.meta.env.VITE_R2_PUBLIC_URL || '').trim().replace(/\/+$/, ''),
};

const app = getApps().length ? getApps()[0] : initializeApp(
  isFirebaseConfigured
    ? firebaseConfig
    : {
        apiKey: 'demo-api-key',
        authDomain: 'demo.firebaseapp.com',
        projectId: 'demo-project',
        appId: '1:000:web:demo',
      }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
