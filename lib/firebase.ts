import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, type Auth, type Persistence } from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
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
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCIuEbVGcaBFd_qC8Ugoqj7VSu7BuIYaLg",
  authDomain: "locket-ddeff.firebaseapp.com",
  projectId: "locket-ddeff",
  storageBucket: "locket-ddeff.firebasestorage.app",
  messagingSenderId: "425239617252",
  appId: "1:425239617252:web:73d1915c1514868425d6f1",
  measurementId: "G-ZMP53RH5WG"
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
export default app;
