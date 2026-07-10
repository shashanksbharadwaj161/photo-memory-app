import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDoc,
  setDoc,
  where,
  getDocs,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { uploadImageAsync, photoFolder, photoPublicId, deleteImageByUrl } from './storage';

// ─── Types ───────────────────────────────────────────────────

export interface BookPhoto {
  id: string;
  url: string;
  thumbnailUrl: string;
  filterId: string;
  intensity: number; // 0..1 filter strength applied at capture
  caption: string;
  addedBy: string; // user uid
  addedByName: string; // display name
  addedByColor: string; // avatar color hex
  createdAt: Timestamp | null; // null for a moment while serverTimestamp resolves
  bookId: string;
  isPostcard: boolean;
  postcardMessage?: string;
  isFavorite: boolean;
  width: number;
  height: number;
}

export interface SharedBook {
  id: string;
  name: string;
  createdAt: Timestamp | null;
  members: string[]; // [uid1, uid2]
  memberNames: Record<string, string>;
  memberColors: Record<string, string>;
  photoCount: number;
  coverUrl?: string | null;
  inviteCode: string; // 6-char code partner uses to join
}

export interface UserProfile {
  bookId?: string | null;
  displayName?: string;
  color?: string;
  pushToken?: string | null;
  lastActive?: Timestamp | null;
  notifyMemories?: boolean;
  notifyPostcards?: boolean;
}

// ─── Partner Colors ──────────────────────────────────────────

export const PARTNER_COLORS = ['#C9A96E', '#E8735A', '#7CB8B0', '#A87CB8', '#7CB87C'];
export const PARTNER_COLOR_NAMES = ['Gold', 'Coral', 'Teal', 'Lavender', 'Sage'];

function pickUnusedColor(used: string[]): string {
  return PARTNER_COLORS.find((c) => !used.includes(c)) ?? PARTNER_COLORS[1];
}

function makeInviteCode(): string {
  // Avoid ambiguous characters (0/O, 1/I) for something people will type by hand.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

// ─── Book Operations ─────────────────────────────────────────

export async function createBook(
  uid: string,
  displayName: string
): Promise<{ bookId: string; inviteCode: string }> {
  const inviteCode = makeInviteCode();
  const color = PARTNER_COLORS[0];
  const bookRef = await addDoc(collection(db, 'books'), {
    name: 'Our Book',
    createdAt: serverTimestamp(),
    members: [uid],
    memberNames: { [uid]: displayName },
    memberColors: { [uid]: color },
    photoCount: 0,
    inviteCode,
    coverUrl: null,
  });
  await setDoc(
    doc(db, 'users', uid),
    { bookId: bookRef.id, displayName, color },
    { merge: true }
  );
  return { bookId: bookRef.id, inviteCode };
}

/**
 * Join an existing book by invite code. Returns the bookId, or null if the code
 * doesn't match any book.
 */
export async function joinBook(
  uid: string,
  displayName: string,
  inviteCode: string
): Promise<string | null> {
  const booksRef = collection(db, 'books');
  const q = query(booksRef, where('inviteCode', '==', inviteCode.trim().toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const bookDoc = snap.docs[0];
  const bookId = bookDoc.id;
  const data = bookDoc.data() as SharedBook;

  const color = data.members.includes(uid)
    ? data.memberColors[uid] ?? PARTNER_COLORS[1]
    : pickUnusedColor(Object.values(data.memberColors ?? {}));

  await updateDoc(doc(db, 'books', bookId), {
    members: arrayUnion(uid),
    [`memberNames.${uid}`]: displayName,
    [`memberColors.${uid}`]: color,
  });
  await setDoc(
    doc(db, 'users', uid),
    { bookId, displayName, color },
    { merge: true }
  );
  return bookId;
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return null;
  return userDoc.data() as UserProfile;
}

export async function getUserBookId(uid: string): Promise<string | null> {
  const profile = await getUserProfile(uid);
  return profile?.bookId ?? null;
}

export function subscribeToUser(uid: string, cb: (profile: UserProfile | null) => void): () => void {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => cb(snap.exists() ? (snap.data() as UserProfile) : null),
    () => cb(null)
  );
}

export function subscribeToBookMeta(
  bookId: string,
  cb: (book: SharedBook | null) => void
): () => void {
  return onSnapshot(
    doc(db, 'books', bookId),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as SharedBook) : null),
    () => cb(null)
  );
}

export function subscribeToBook(
  bookId: string,
  onPhotos: (photos: BookPhoto[]) => void,
  onError?: (err: Error) => void
): () => void {
  const photosRef = collection(db, 'books', bookId, 'photos');
  const q = query(photosRef, orderBy('createdAt', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const photos = snap.docs.map(
        (d) => ({ id: d.id, ...normalizePhoto(d.data()) } as BookPhoto)
      );
      onPhotos(photos);
    },
    (err) => onError?.(err)
  );
}

/** Fill in defaults so older/partial docs never crash the UI. */
function normalizePhoto(data: any): Omit<BookPhoto, 'id'> {
  return {
    url: data.url ?? '',
    thumbnailUrl: data.thumbnailUrl ?? data.url ?? '',
    filterId: data.filterId ?? 'none',
    intensity: typeof data.intensity === 'number' ? data.intensity : 1,
    caption: data.caption ?? '',
    addedBy: data.addedBy ?? '',
    addedByName: data.addedByName ?? 'Someone',
    addedByColor: data.addedByColor ?? PARTNER_COLORS[0],
    createdAt: data.createdAt ?? null,
    bookId: data.bookId ?? '',
    isPostcard: !!data.isPostcard,
    postcardMessage: data.postcardMessage,
    isFavorite: !!data.isFavorite,
    width: typeof data.width === 'number' ? data.width : 0,
    height: typeof data.height === 'number' ? data.height : 0,
  };
}

export interface AddPhotoInput {
  bookId: string;
  localUri: string;
  thumbnailUri?: string;
  filterId: string;
  intensity: number;
  caption: string;
  uid: string;
  displayName: string;
  avatarColor: string;
  width: number;
  height: number;
  isPostcard?: boolean;
  postcardMessage?: string;
}

export async function addPhotoToBook(input: AddPhotoInput): Promise<string> {
  const {
    bookId,
    localUri,
    thumbnailUri,
    filterId,
    intensity,
    caption,
    uid,
    displayName,
    avatarColor,
    width,
    height,
    isPostcard = false,
    postcardMessage,
  } = input;

  const folder = photoFolder(bookId);
  const url = await uploadImageAsync(localUri, {
    folder,
    publicId: photoPublicId(bookId, uid),
  });
  const thumbnailUrl = thumbnailUri
    ? await uploadImageAsync(thumbnailUri, { folder, publicId: photoPublicId(bookId, uid, '_thumb') })
    : url;

  // Firestore rejects `undefined`, so only include postcardMessage when present.
  const photoData: Record<string, any> = {
    url,
    thumbnailUrl,
    filterId,
    intensity,
    caption,
    addedBy: uid,
    addedByName: displayName,
    addedByColor: avatarColor,
    createdAt: serverTimestamp(),
    bookId,
    isPostcard,
    isFavorite: false,
    width,
    height,
  };
  if (isPostcard && postcardMessage) {
    photoData.postcardMessage = postcardMessage;
  }

  const photoRef = await addDoc(collection(db, 'books', bookId, 'photos'), photoData);

  await updateDoc(doc(db, 'books', bookId), {
    photoCount: increment(1),
    coverUrl: url,
  });

  return photoRef.id;
}

/**
 * Turn an existing photo into a postcard: creates a new book entry that reuses
 * the already-uploaded image (no re-upload) and carries the written message.
 */
export async function addPostcardToBook(
  bookId: string,
  source: BookPhoto,
  sender: { uid: string; name: string; color: string },
  message: string
): Promise<string> {
  const photoData: Record<string, any> = {
    url: source.url,
    thumbnailUrl: source.thumbnailUrl,
    filterId: source.filterId,
    intensity: source.intensity,
    caption: source.caption,
    addedBy: sender.uid,
    addedByName: sender.name,
    addedByColor: sender.color,
    createdAt: serverTimestamp(),
    bookId,
    isPostcard: true,
    isFavorite: false,
    width: source.width,
    height: source.height,
    postcardMessage: message.trim(),
  };
  const photoRef = await addDoc(collection(db, 'books', bookId, 'photos'), photoData);
  await updateDoc(doc(db, 'books', bookId), {
    photoCount: increment(1),
    coverUrl: source.url,
  });
  return photoRef.id;
}

export async function updateCaption(
  bookId: string,
  photoId: string,
  caption: string
): Promise<void> {
  await updateDoc(doc(db, 'books', bookId, 'photos', photoId), { caption });
}

export async function toggleFavorite(
  bookId: string,
  photoId: string,
  isFavorite: boolean
): Promise<void> {
  await updateDoc(doc(db, 'books', bookId, 'photos', photoId), { isFavorite });
}

export async function deletePhoto(bookId: string, photo: BookPhoto): Promise<void> {
  await deleteDoc(doc(db, 'books', bookId, 'photos', photo.id));
  await updateDoc(doc(db, 'books', bookId), { photoCount: increment(-1) });
  await deleteImageByUrl(photo.url);
  if (photo.thumbnailUrl && photo.thumbnailUrl !== photo.url) {
    await deleteImageByUrl(photo.thumbnailUrl);
  }
}

export async function getPhoto(bookId: string, photoId: string): Promise<BookPhoto | null> {
  const snap = await getDoc(doc(db, 'books', bookId, 'photos', photoId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...normalizePhoto(snap.data()) } as BookPhoto;
}

export async function getPhotosForMemory(bookId: string): Promise<BookPhoto[]> {
  const photosRef = collection(db, 'books', bookId, 'photos');
  const snap = await getDocs(photosRef);
  return snap.docs.map((d) => ({ id: d.id, ...normalizePhoto(d.data()) } as BookPhoto));
}

// ─── Profile / Settings ──────────────────────────────────────

export async function updateBookName(bookId: string, name: string): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { name: name.trim() || 'Our Book' });
}

export async function updateUserProfile(
  uid: string,
  bookId: string | null,
  patch: { displayName?: string; color?: string }
): Promise<void> {
  const clean: Record<string, any> = {};
  if (patch.displayName !== undefined) clean.displayName = patch.displayName.trim() || 'Me';
  if (patch.color !== undefined) clean.color = patch.color;
  await setDoc(doc(db, 'users', uid), clean, { merge: true });

  // Mirror into the book so the partner sees the change on every photo.
  if (bookId) {
    const bookPatch: Record<string, any> = {};
    if (patch.displayName !== undefined) bookPatch[`memberNames.${uid}`] = clean.displayName;
    if (patch.color !== undefined) bookPatch[`memberColors.${uid}`] = patch.color;
    if (Object.keys(bookPatch).length) {
      await updateDoc(doc(db, 'books', bookId), bookPatch);
    }
  }
}

export async function setNotificationPrefs(
  uid: string,
  prefs: { notifyMemories?: boolean; notifyPostcards?: boolean }
): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true });
}

/** Update lastActive so the partner can show an "online" dot. Best-effort. */
export async function touchPresence(uid: string): Promise<void> {
  try {
    await setDoc(doc(db, 'users', uid), { lastActive: serverTimestamp() }, { merge: true });
  } catch {
    // Presence is non-critical.
  }
}

export async function leaveBook(uid: string, bookId: string): Promise<void> {
  await updateDoc(doc(db, 'books', bookId), { members: arrayRemove(uid) });
  await setDoc(doc(db, 'users', uid), { bookId: null }, { merge: true });
}

// ─── Partner helpers ─────────────────────────────────────────

export interface Partner {
  uid: string;
  name: string;
  color: string;
}

export function getPartner(book: SharedBook | null, uid: string): Partner | null {
  if (!book) return null;
  const partnerUid = book.members.find((m) => m !== uid);
  if (!partnerUid) return null;
  return {
    uid: partnerUid,
    name: book.memberNames?.[partnerUid] ?? 'Your partner',
    color: book.memberColors?.[partnerUid] ?? PARTNER_COLORS[1],
  };
}

export async function fetchUserPushToken(uid: string): Promise<string | null> {
  const profile = await getUserProfile(uid);
  return profile?.pushToken ?? null;
}
