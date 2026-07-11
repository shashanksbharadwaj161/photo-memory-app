/**
 * Turn any thrown error into a warm, human sentence — never a raw Firebase/
 * network error code. Used anywhere an async operation (upload, Firestore
 * write, etc.) can fail and needs to tell the user something useful.
 */
export function friendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = (err as { code?: string })?.code ?? '';
  const message = (err as { message?: string })?.message ?? '';

  if (code === 'permission-denied' || /permission.denied/i.test(message)) {
    return 'Access denied. Try signing out and back in.';
  }
  if (code === 'unavailable' || code === 'network-request-failed' || /network/i.test(message)) {
    return 'Check your connection and try again.';
  }
  if (code === 'not-found' || /not.found/i.test(message)) {
    return "Not found. It may have been deleted.";
  }
  if (/cloudinary is not configured/i.test(message)) {
    return 'Photo upload not configured yet. Please set up Cloudinary.';
  }
  if (/upload failed/i.test(message)) {
    return "Couldn't upload the photo. Please try again.";
  }
  if (code === 'resource-exhausted' || /quota/i.test(message)) {
    return "We're a bit busy — please try again in a moment.";
  }
  return fallback;
}
