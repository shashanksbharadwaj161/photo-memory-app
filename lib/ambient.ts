import AsyncStorage from '@react-native-async-storage/async-storage';

const AMBIENT_LAST_INTERACTION = 'locket_ambient_interaction';
const AMBIENT_TIMEOUT_KEY = 'locket_ambient_timeout';

export async function recordInteraction(): Promise<void> {
  await AsyncStorage.setItem(AMBIENT_LAST_INTERACTION, Date.now().toString());
}

export async function getAmbientTimeout(): Promise<number> {
  const val = await AsyncStorage.getItem(AMBIENT_TIMEOUT_KEY);
  return val ? parseInt(val, 10) : 45000; // default 45 seconds
}

export async function setAmbientTimeout(ms: number): Promise<void> {
  await AsyncStorage.setItem(AMBIENT_TIMEOUT_KEY, ms.toString());
}

export async function shouldActivateAmbient(): Promise<boolean> {
  const last = await AsyncStorage.getItem(AMBIENT_LAST_INTERACTION);
  const timeout = await getAmbientTimeout();
  if (timeout === 0) return false; // disabled
  if (!last) return false;
  return Date.now() - parseInt(last, 10) > timeout;
}
