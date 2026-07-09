import { useEffect, useMemo, useState } from 'react';
import {
  BookPhoto,
  SharedBook,
  UserProfile,
  Partner,
  subscribeToBook,
  subscribeToBookMeta,
  subscribeToUser,
  getPartner,
} from '@/lib/book';

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

export interface UseBookResult {
  photos: BookPhoto[];
  book: SharedBook | null;
  partner: Partner | null;
  partnerProfile: UserProfile | null;
  partnerOnline: boolean;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export function useBook(bookId: string | null, uid: string | undefined): UseBookResult {
  const [photos, setPhotos] = useState<BookPhoto[]>([]);
  const [book, setBook] = useState<SharedBook | null>(null);
  const [partnerProfile, setPartnerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [tick, setTick] = useState(0);

  // Photos stream.
  useEffect(() => {
    if (!bookId) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const unsub = subscribeToBook(
      bookId,
      (next) => {
        setPhotos(next);
        setLoading(false);
        setError(null);
      },
      () => {
        setError("Couldn't sync — check your connection");
        setLoading(false);
      }
    );
    return unsub;
  }, [bookId, nonce]);

  // Book metadata stream (members, names, invite code, cover).
  useEffect(() => {
    if (!bookId) {
      setBook(null);
      return;
    }
    return subscribeToBookMeta(bookId, setBook);
  }, [bookId, nonce]);

  const partner = useMemo(() => (uid ? getPartner(book, uid) : null), [book, uid]);

  // Partner presence stream.
  useEffect(() => {
    if (!partner) {
      setPartnerProfile(null);
      return;
    }
    return subscribeToUser(partner.uid, setPartnerProfile);
  }, [partner?.uid]);

  // Re-evaluate the online window once a minute.
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const partnerOnline = useMemo(() => {
    const last = partnerProfile?.lastActive;
    if (!last) return false;
    try {
      return Date.now() - last.toDate().getTime() < ONLINE_WINDOW_MS;
    } catch {
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partnerProfile, tick]);

  return {
    photos,
    book,
    partner,
    partnerProfile,
    partnerOnline,
    loading,
    error,
    retry: () => setNonce((n) => n + 1),
  };
}
