import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  differenceInCalendarDays,
  format,
  startOfMonth,
} from 'date-fns';
import { BookPhoto, getPhotosForMemory } from './book';
import { presentLocalMemory } from './notifications';

const MEMORY_TASK = 'LOCKET_MEMORY_CHECK';
const STORE_BOOK_ID = 'locket.memory.bookId';
const STORE_PARTNER_NAME = 'locket.memory.partnerName';
const STORE_LAST_NOTIFIED = 'locket.memory.lastNotifiedDay';

// Thresholds we celebrate, in days.
const THRESHOLDS = [365, 180, 90, 30];

export function photoDate(photo: BookPhoto): Date | null {
  if (!photo.createdAt) return null;
  try {
    return photo.createdAt.toDate();
  } catch {
    return null;
  }
}

/** How close (in days) `photo` is to any celebrated threshold, or null. */
function memoryMatch(photo: BookPhoto, today: Date): { daysAgo: number; distance: number } | null {
  const d = photoDate(photo);
  if (!d) return null;
  const daysAgo = differenceInCalendarDays(today, d);
  let best: { daysAgo: number; distance: number } | null = null;
  for (const threshold of THRESHOLDS) {
    const distance = Math.abs(daysAgo - threshold);
    if (distance <= 2 && (!best || distance < best.distance)) {
      best = { daysAgo, distance };
    }
  }
  return best;
}

// ─── Background task ──────────────────────────────────────────

/**
 * Define the background handler. Called once at module import (global scope) so
 * the OS can find it even after a cold start / reboot.
 */
export function defineMemoryTask(): void {
  if (TaskManager.isTaskDefined(MEMORY_TASK)) return;
  TaskManager.defineTask(MEMORY_TASK, async () => {
    try {
      const bookId = await AsyncStorage.getItem(STORE_BOOK_ID);
      if (!bookId) return BackgroundFetch.BackgroundFetchResult.NoData;

      // Only notify once per calendar day.
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const lastNotified = await AsyncStorage.getItem(STORE_LAST_NOTIFIED);
      if (lastNotified === todayKey) {
        return BackgroundFetch.BackgroundFetchResult.NoData;
      }

      const photos = await getPhotosForMemory(bookId);
      const memory = findTodayMemory(photos);
      if (!memory) return BackgroundFetch.BackgroundFetchResult.NoData;

      const match = memoryMatch(memory, new Date());
      const partnerName = (await AsyncStorage.getItem(STORE_PARTNER_NAME)) || 'your partner';
      await presentLocalMemory(
        '✨ A memory surfaced',
        `${getMemoryLabel(match?.daysAgo ?? 365)} — you and ${partnerName}`
      );
      await AsyncStorage.setItem(STORE_LAST_NOTIFIED, todayKey);

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch {
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export async function registerMemoryTask(bookId: string, partnerName: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORE_BOOK_ID, bookId);
    await AsyncStorage.setItem(STORE_PARTNER_NAME, partnerName || 'your partner');
    const already = await TaskManager.isTaskRegisteredAsync(MEMORY_TASK);
    if (!already) {
      await BackgroundFetch.registerTaskAsync(MEMORY_TASK, {
        minimumInterval: 60 * 60 * 12, // twice a day; OS decides actual cadence
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }
  } catch {
    // Background fetch is unavailable on some devices — non-fatal.
  }
}

export async function unregisterMemoryTask(): Promise<void> {
  try {
    if (await TaskManager.isTaskRegisteredAsync(MEMORY_TASK)) {
      await BackgroundFetch.unregisterTaskAsync(MEMORY_TASK);
    }
    await AsyncStorage.multiRemove([STORE_BOOK_ID, STORE_PARTNER_NAME, STORE_LAST_NOTIFIED]);
  } catch {
    // ignore
  }
}

// ─── Pure helpers used by the Memories screen ────────────────

export interface DatedMemory {
  photo: BookPhoto;
  daysAgo: number;
  label: string;
}

export function findTodayMemory(photos: BookPhoto[]): BookPhoto | null {
  const today = new Date();
  let best: { photo: BookPhoto; distance: number } | null = null;
  for (const photo of photos) {
    const match = memoryMatch(photo, today);
    if (match && (!best || match.distance < best.distance)) {
      best = { photo, distance: match.distance };
    }
  }
  return best?.photo ?? null;
}

export function getTodayMemory(photos: BookPhoto[]): DatedMemory | null {
  const photo = findTodayMemory(photos);
  if (!photo) return null;
  const d = photoDate(photo);
  const daysAgo = d ? differenceInCalendarDays(new Date(), d) : 365;
  return { photo, daysAgo, label: getMemoryLabel(daysAgo) };
}

export function getMemoryLabel(daysAgo: number): string {
  if (daysAgo >= 360 && daysAgo <= 370) return '1 year ago today';
  if (daysAgo >= 178 && daysAgo <= 182) return '6 months ago today';
  if (daysAgo >= 88 && daysAgo <= 92) return '3 months ago today';
  if (daysAgo >= 28 && daysAgo <= 32) return '1 month ago today';
  const months = Math.max(1, Math.round(daysAgo / 30));
  return `${months} month${months === 1 ? '' : 's'} ago`;
}

// ─── Milestones ──────────────────────────────────────────────

export function chronological(photos: BookPhoto[]): BookPhoto[] {
  return [...photos]
    .filter((p) => photoDate(p) !== null)
    .sort((a, b) => (photoDate(a)!.getTime() - photoDate(b)!.getTime()));
}

export function firstPhoto(photos: BookPhoto[]): BookPhoto | null {
  const sorted = chronological(photos);
  return sorted[0] ?? null;
}

export function latestPhoto(photos: BookPhoto[]): BookPhoto | null {
  const sorted = chronological(photos);
  return sorted[sorted.length - 1] ?? null;
}

export interface MonthGroup {
  key: string;
  label: string;
  photos: BookPhoto[];
}

export function mostCapturedMonth(photos: BookPhoto[]): MonthGroup | null {
  const groups = new Map<string, BookPhoto[]>();
  for (const p of photos) {
    const d = photoDate(p);
    if (!d) continue;
    const key = format(startOfMonth(d), 'yyyy-MM');
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  let best: MonthGroup | null = null;
  for (const [key, list] of groups) {
    if (!best || list.length > best.photos.length) {
      best = { key, label: format(new Date(`${key}-01T00:00:00`), 'MMMM yyyy'), photos: list };
    }
  }
  return best;
}

export function photosThisYear(photos: BookPhoto[]): BookPhoto[] {
  const year = new Date().getFullYear();
  return chronological(photos).filter((p) => photoDate(p)!.getFullYear() === year);
}
