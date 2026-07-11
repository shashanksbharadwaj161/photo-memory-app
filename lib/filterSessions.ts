import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

// A single well-known collaborative session per book — simple, and sufficient
// for two people building one filter together at a time.
const SESSION_DOC_ID = 'shared';

export interface FilterSessionState {
  warmth: number;
  brightness: number;
  contrast: number;
  fade: number;
  grain: number;
  tintStrength: number;
  tintId: string;
  draggingBy?: string | null;
  draggingByName?: string | null;
  draggingByColor?: string | null;
  draggingSlider?: string | null;
  updatedAt: Timestamp | null;
}

function sessionRef(bookId: string) {
  return doc(db, 'books', bookId, 'filter-sessions', SESSION_DOC_ID);
}

export function subscribeToFilterSession(
  bookId: string,
  cb: (state: FilterSessionState | null) => void
): () => void {
  return onSnapshot(
    sessionRef(bookId),
    (snap) => cb(snap.exists() ? (snap.data() as FilterSessionState) : null),
    () => cb(null)
  );
}

export async function pushFilterSession(
  bookId: string,
  patch: Partial<Omit<FilterSessionState, 'updatedAt'>>
): Promise<void> {
  await setDoc(sessionRef(bookId), { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

export async function clearFilterSessionDragging(bookId: string): Promise<void> {
  await setDoc(
    sessionRef(bookId),
    { draggingBy: null, draggingByName: null, draggingByColor: null, draggingSlider: null },
    { merge: true }
  );
}
