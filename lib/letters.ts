import {
  collection,
  addDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface FutureLetter {
  id: string;
  bookId: string;
  addedBy: string;
  addedByName: string;
  content: string;
  lockedUntil: Timestamp;
  unlockedAt?: Timestamp;
  isUnlocked: boolean;
  createdAt: Timestamp | null;
}

export async function createFutureLetter(
  bookId: string,
  uid: string,
  displayName: string,
  content: string,
  unlockDate: Date
): Promise<string> {
  const ref = await addDoc(collection(db, 'books', bookId, 'letters'), {
    bookId,
    addedBy: uid,
    addedByName: displayName,
    content: content.trim(),
    lockedUntil: Timestamp.fromDate(unlockDate),
    isUnlocked: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function checkAndUnlockLetters(bookId: string): Promise<FutureLetter[]> {
  const now = new Date();
  const q = query(collection(db, 'books', bookId, 'letters'), where('isUnlocked', '==', false));
  const snap = await getDocs(q);
  const justUnlocked: FutureLetter[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Omit<FutureLetter, 'id'>;
    if (now >= data.lockedUntil.toDate()) {
      await updateDoc(doc(db, 'books', bookId, 'letters', d.id), {
        isUnlocked: true,
        unlockedAt: serverTimestamp(),
      });
      justUnlocked.push({ ...data, id: d.id });
    }
  }
  return justUnlocked;
}

export function subscribeToLetters(
  bookId: string,
  cb: (letters: FutureLetter[]) => void
): () => void {
  const q = query(collection(db, 'books', bookId, 'letters'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FutureLetter, 'id'>) }))),
    () => cb([])
  );
}

export async function getLetters(bookId: string): Promise<FutureLetter[]> {
  const snap = await getDocs(collection(db, 'books', bookId, 'letters'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FutureLetter, 'id'>) }));
}
