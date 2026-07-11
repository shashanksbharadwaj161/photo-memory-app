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
import { differenceInCalendarDays, differenceInCalendarMonths, addMonths } from 'date-fns';
import { db } from './firebase';
import { uploadImageAsync, photoFolder } from './storage';
import { FilterSnapshot } from './book';

export interface TimeLock {
  id: string;
  bookId: string;
  addedBy: string;
  addedByName: string;
  addedByColor: string;
  url: string;
  filterId: string;
  intensity: number;
  filterSnapshot?: FilterSnapshot;
  caption: string;
  lockedUntil: Timestamp;
  unlockedAt?: Timestamp;
  isUnlocked: boolean;
  message: string;
  createdAt: Timestamp | null;
}

// ─── Lock duration presets (shared with the "Letter to Future Us" flow) ──

export interface LockPreset {
  id: '6months' | '1year';
  label: string;
  date: Date;
  recommended?: boolean;
}

export function getLockPresets(): LockPreset[] {
  const now = new Date();
  const sixMonths = new Date(now);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  const oneYear = new Date(now);
  oneYear.setFullYear(oneYear.getFullYear() + 1);
  return [
    { id: '6months', label: '6 months', date: sixMonths },
    { id: '1year', label: '1 year', date: oneYear, recommended: true },
  ];
}

export function formatUnlockDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** "Opens in 3 months, 12 days" style countdown to a future date. */
export function formatCountdown(target: Date): string {
  const now = new Date();
  const months = Math.max(0, differenceInCalendarMonths(target, now));
  const remainder = addMonths(now, months);
  const days = Math.max(0, differenceInCalendarDays(target, remainder));
  if (months <= 0 && days <= 0) return 'Opening soon';
  const parts: string[] = [];
  if (months > 0) parts.push(`${months} month${months === 1 ? '' : 's'}`);
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  return `Opens in ${parts.join(', ')}`;
}

// ─── Time-lock CRUD ────────────────────────────────────────────

export interface CreateTimeLockInput {
  bookId: string;
  uid: string;
  displayName: string;
  avatarColor: string;
  /** A local file:// URI (freshly captured) or an already-hosted https:// URL (an existing book photo). */
  photoUri: string;
  filterId: string;
  intensity: number;
  filterSnapshot?: FilterSnapshot;
  caption: string;
  message: string;
  unlockDate: Date;
}

export async function createTimeLock(input: CreateTimeLockInput): Promise<string> {
  const {
    bookId,
    uid,
    displayName,
    avatarColor,
    photoUri,
    filterId,
    intensity,
    filterSnapshot,
    caption,
    message,
    unlockDate,
  } = input;

  // Reuse an already-hosted URL as-is; only upload fresh local captures. Either
  // way the result is a Cloudinary URL, so the capsule is visible on both
  // partners' devices once it unlocks, not just the creator's phone.
  const url = photoUri.startsWith('http')
    ? photoUri
    : await uploadImageAsync(photoUri, {
        folder: photoFolder(bookId),
        publicId: `timelock_${Date.now()}_${uid}`,
      });

  const data: Record<string, any> = {
    bookId,
    addedBy: uid,
    addedByName: displayName,
    addedByColor: avatarColor,
    url,
    filterId,
    intensity,
    caption,
    lockedUntil: Timestamp.fromDate(unlockDate),
    isUnlocked: false,
    message: message.trim(),
    createdAt: serverTimestamp(),
  };
  if (filterSnapshot) data.filterSnapshot = filterSnapshot;

  const ref = await addDoc(collection(db, 'books', bookId, 'timelocks'), data);
  return ref.id;
}

/** One-shot check: flips any due capsules to unlocked and returns the ones that just opened. */
export async function checkAndUnlockTimeLocks(bookId: string): Promise<TimeLock[]> {
  const now = new Date();
  const q = query(collection(db, 'books', bookId, 'timelocks'), where('isUnlocked', '==', false));
  const snap = await getDocs(q);
  const justUnlocked: TimeLock[] = [];
  for (const d of snap.docs) {
    const data = d.data() as Omit<TimeLock, 'id'>;
    if (now >= data.lockedUntil.toDate()) {
      await updateDoc(doc(db, 'books', bookId, 'timelocks', d.id), {
        isUnlocked: true,
        unlockedAt: serverTimestamp(),
      });
      justUnlocked.push({ ...data, id: d.id });
    }
  }
  return justUnlocked;
}

export function subscribeToTimeLocks(
  bookId: string,
  cb: (locks: TimeLock[]) => void
): () => void {
  const q = query(collection(db, 'books', bookId, 'timelocks'), orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimeLock, 'id'>) }))),
    () => cb([])
  );
}

export async function getTimeLocks(bookId: string): Promise<TimeLock[]> {
  const snap = await getDocs(collection(db, 'books', bookId, 'timelocks'));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<TimeLock, 'id'>) }));
}
