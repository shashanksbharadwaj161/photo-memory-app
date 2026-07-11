import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function getProjectId(): string | undefined {
  const eas = (Constants.expoConfig?.extra as any)?.eas;
  const id = eas?.projectId ?? (Constants as any)?.easConfig?.projectId;
  if (!id || String(id).startsWith('PASTE_')) return undefined;
  return id;
}

export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Locket',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A96E',
    });
  }
}

/**
 * Register for push and persist the Expo push token on the user's profile so
 * the partner's device can deliver postcards. Returns null (never throws) when
 * running on a simulator, when permission is denied, or when the project isn't
 * yet linked to EAS.
 */
export async function registerForPushNotifications(uid: string): Promise<string | null> {
  try {
    await ensureAndroidChannel();

    if (!Device.isDevice) return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = getProjectId();
    const token = (
      await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
    ).data;

    await setDoc(doc(db, 'users', uid), { pushToken: token }, { merge: true });
    return token;
  } catch {
    // Push is a nice-to-have; the rest of the app must keep working without it.
    return null;
  }
}

async function sendExpoPush(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Silent — a failed notification should never break the send flow.
  }
}

export async function sendPostcardNotification(
  partnerPushToken: string,
  senderName: string,
  photoId: string,
  bookId: string
): Promise<void> {
  if (!partnerPushToken) return;
  await sendExpoPush({
    to: partnerPushToken,
    title: '💌 A postcard arrived',
    body: `${senderName} sent you a postcard`,
    data: { type: 'postcard', photoId, bookId },
    sound: 'default',
    channelId: 'default',
    priority: 'high',
  });
}

export async function sendMemoryNotification(
  pushToken: string,
  partnerName: string,
  daysAgo: number
): Promise<void> {
  if (!pushToken) return;
  await sendExpoPush({
    to: pushToken,
    title: '✨ A memory surfaced',
    body: `You and ${partnerName} ${
      daysAgo === 365 ? 'were here 1 year ago' : `captured this ${Math.floor(daysAgo / 30)} months ago`
    }`,
    data: { type: 'memory' },
    sound: 'default',
    channelId: 'default',
  });
}

export async function sendTimeLockNotification(pushToken: string): Promise<void> {
  if (!pushToken) return;
  await sendExpoPush({
    to: pushToken,
    title: '✨ A time capsule just opened',
    body: 'Something you locked away is ready to see.',
    data: { type: 'timelock' },
    sound: 'default',
    channelId: 'default',
  });
}

export async function sendLetterNotification(pushToken: string): Promise<void> {
  if (!pushToken) return;
  await sendExpoPush({
    to: pushToken,
    title: '💌 A letter has arrived',
    body: 'A letter to your future selves is ready to read.',
    data: { type: 'letter' },
    sound: 'default',
    channelId: 'default',
  });
}

/** Fire a local "memory surfaced" notification from the on-device background task. */
export async function presentLocalMemory(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { type: 'memory' }, sound: 'default' },
      trigger: null,
    });
  } catch {
    // ignore
  }
}
