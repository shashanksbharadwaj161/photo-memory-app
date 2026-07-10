import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

// ─────────────────────────────────────────────────────────────
// PASTE YOUR CLOUDINARY CREDENTIALS HERE
// Cloudinary Console → Dashboard → "Cloud name".
// Settings → Upload → Upload presets → Add upload preset → Signing mode:
// "Unsigned". No API key/secret is ever needed on-device.
// ─────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = 'PASTE_YOUR_CLOUD_NAME';
const CLOUDINARY_UPLOAD_PRESET = 'PASTE_YOUR_UPLOAD_PRESET';
// ─────────────────────────────────────────────────────────────

/** True until the developer replaces the placeholder credentials above. */
export const isCloudinaryConfigured =
  !CLOUDINARY_CLOUD_NAME.startsWith('PASTE_') && !CLOUDINARY_UPLOAD_PRESET.startsWith('PASTE_');

function uploadUrl(): string {
  return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
}

interface CloudinaryUploadResponse {
  secure_url?: string;
  error?: { message?: string };
  [key: string]: unknown;
}

function guessMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  return 'image/jpeg';
}

export interface UploadOptions {
  /** Cloudinary folder to group this book's photos, e.g. `locket/<bookId>`. */
  folder?: string;
  /** Deterministic public id (filename, without extension). */
  publicId?: string;
}

/**
 * Upload a local image to Cloudinary via an unsigned upload preset (no
 * server or API secret required) and return its public `secure_url`.
 */
export async function uploadImageAsync(
  localUri: string,
  options: UploadOptions = {}
): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Cloudinary is not configured — paste your cloud name and upload preset into lib/storage.ts.'
    );
  }

  const filename = localUri.split('/').pop() || `photo_${Date.now()}.jpg`;

  const form = new FormData();
  // React Native's fetch/FormData accepts this { uri, name, type } shape for files.
  form.append('file', {
    uri: localUri,
    name: filename,
    type: guessMimeType(filename),
  } as unknown as Blob);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (options.folder) form.append('folder', options.folder);
  if (options.publicId) form.append('public_id', options.publicId);

  const response = await fetch(uploadUrl(), {
    method: 'POST',
    body: form,
  });

  const data = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;

  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Could not upload the photo. Please try again.');
  }

  return data.secure_url;
}

/** Build a deterministic Cloudinary folder for a book's photos. */
export function photoFolder(bookId: string): string {
  return `locket/${bookId}`;
}

/** Build a deterministic Cloudinary public id for a book photo. */
export function photoPublicId(bookId: string, uid: string, suffix = ''): string {
  return `${Date.now()}_${uid}${suffix}`;
}

/**
 * Best-effort delete of a previously uploaded image.
 *
 * Deleting a Cloudinary asset requires a signed request (your API secret),
 * which must never ship inside the app — so with unsigned, client-only
 * uploads this intentionally does nothing. The Firestore document is still
 * removed by `deletePhoto` in lib/book.ts; prune orphaned Cloudinary assets
 * from the dashboard or a scheduled server job if you need to reclaim space.
 */
export async function deleteImageByUrl(_url: string): Promise<void> {
  // No-op — see doc comment above.
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
