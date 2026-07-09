import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth, type Persistence } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// `getReactNativePersistence` ships in Firebase's react-native build (which Metro
// resolves) but is intentionally absent from the default TypeScript entry.
const getReactNativePersistence = (firebaseAuth as any)
  .getReactNativePersistence as (storage: unknown) => Persistence;

// ─────────────────────────────────────────────────────────────
// PASTE YOUR FIREBASE CONFIG HERE
// Get this from Firebase Console → Project Settings → Your Apps → Web App.
// Create a Web App if you haven't already (it works for React Native too).
// See SETUP.md for the full walkthrough.
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'PASTE_YOUR_API_KEY',
  authDomain: 'PASTE_YOUR_AUTH_DOMAIN',
  projectId: 'PASTE_YOUR_PROJECT_ID',
  storageBucket: 'PASTE_YOUR_STORAGE_BUCKET',
  messagingSenderId: 'PASTE_YOUR_MESSAGING_SENDER_ID',
  appId: 'PASTE_YOUR_APP_ID',
};
// ─────────────────────────────────────────────────────────────

/** True until the developer replaces the placeholder credentials above. */
export const isFirebaseConfigured =
  !firebaseConfig.apiKey.startsWith('PASTE_') &&
  !firebaseConfig.projectId.startsWith('PASTE_');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Persist the signed-in session across app restarts using AsyncStorage.
// `initializeAuth` must only run once per app; on Fast Refresh it may already
// exist, so we fall back to `getAuth`.
let _auth: Auth;
try {
  _auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  _auth = getAuth(app);
}

export const auth = _auth;
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
