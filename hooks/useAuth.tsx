import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { getUserBookId, touchPresence } from '@/lib/book';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  bookId: string | null;
  bookResolved: boolean;
  configured: boolean;
  refreshBookId: () => Promise<string | null>;
  setBookId: (id: string | null) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Translate Firebase auth error codes into warm, human sentences. */
export function authErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return "That email doesn't look right.";
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return "We couldn't find an account with that email.";
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return "That email and password don't match.";
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.';
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network hiccup — check your connection and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [bookId, setBookId] = useState<string | null>(null);
  const [bookResolved, setBookResolved] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitializing(false);
      setBookResolved(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setBookResolved(false);
      if (nextUser) {
        try {
          const id = await getUserBookId(nextUser.uid);
          setBookId(id);
          if (id) void touchPresence(nextUser.uid);
        } catch {
          setBookId(null);
        }
      } else {
        setBookId(null);
      }
      setBookResolved(true);
      setInitializing(false);
    });
    return unsub;
  }, []);

  const refreshBookId = useCallback(async () => {
    if (!user) return null;
    const id = await getUserBookId(user.uid);
    setBookId(id);
    setBookResolved(true);
    return id;
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName.trim() || 'Me';
      await updateProfile(cred.user, { displayName: name });
    },
    []
  );

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      initializing,
      bookId,
      bookResolved,
      configured: isFirebaseConfigured,
      refreshBookId,
      setBookId,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [user, initializing, bookId, bookResolved, refreshBookId, signIn, signUp, signOut, resetPassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
