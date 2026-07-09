import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { storage } from './firebase';

/**
 * Read a local file URI into a Blob. On React Native `fetch(uri).blob()` is the
 * supported path for turning a file:// URI into uploadable bytes.
 */
async function uriToBlob(localUri: string): Promise<Blob> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error('Could not read the selected image.');
  }
  return await response.blob();
}

/**
 * Upload a local image to Firebase Storage and return its public download URL.
 */
export async function uploadImageAsync(
  path: string,
  localUri: string,
  contentType = 'image/jpeg'
): Promise<string> {
  const blob = await uriToBlob(localUri);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType });
  return await getDownloadURL(storageRef);
}

/**
 * Build a deterministic storage path for a book photo.
 */
export function photoStoragePath(bookId: string, uid: string, suffix = ''): string {
  return `photos/${bookId}/${Date.now()}_${uid}${suffix}.jpg`;
}

/**
 * Best-effort delete of a previously uploaded file by its download URL.
 * Never throws — deletion failures should not block the user.
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Object may already be gone or be an external URL — ignore.
  }
}

/**
 * Download a remote photo and save it into the device's photo library.
 * Returns false if permission was denied.
 */
export async function savePhotoToDevice(url: string, fileName: string): Promise<boolean> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return false;
  const target = `${FileSystem.cacheDirectory}${fileName}`;
  const { uri } = await FileSystem.downloadAsync(url, target);
  await MediaLibrary.saveToLibraryAsync(uri);
  await FileSystem.deleteAsync(uri, { idempotent: true });
  return true;
}

export interface ExportProgress {
  saved: number;
  total: number;
}

/** Save many photos to the device gallery, reporting progress. */
export async function savePhotosToDevice(
  urls: string[],
  onProgress?: (p: ExportProgress) => void
): Promise<{ saved: number; total: number; permission: boolean }> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) return { saved: 0, total: urls.length, permission: false };

  let saved = 0;
  for (let i = 0; i < urls.length; i++) {
    try {
      const target = `${FileSystem.cacheDirectory}locket_${Date.now()}_${i}.jpg`;
      const { uri } = await FileSystem.downloadAsync(urls[i], target);
      await MediaLibrary.saveToLibraryAsync(uri);
      await FileSystem.deleteAsync(uri, { idempotent: true });
      saved++;
    } catch {
      // Skip a single failed photo; keep exporting the rest.
    }
    onProgress?.({ saved, total: urls.length });
  }
  return { saved, total: urls.length, permission: true };
}
