import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUIET_SOUND_ENABLED_KEY = 'locket_quiet_sound';

// ─────────────────────────────────────────────────────────────
// PASTE A HOSTED AMBIENT SOUND URL HERE (e.g. soft rain, a quiet room tone).
// Left blank on purpose — the app should never fetch third-party audio
// without you explicitly choosing a source. Until this is set, the Quiet
// Page simply plays no sound.
// ─────────────────────────────────────────────────────────────
const AMBIENT_SOUND_URL = 'PASTE_YOUR_AMBIENT_SOUND_URL';
// ─────────────────────────────────────────────────────────────

export const isAmbientSoundConfigured = !AMBIENT_SOUND_URL.startsWith('PASTE_');

let sound: Audio.Sound | null = null;

export async function isQuietSoundEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(QUIET_SOUND_ENABLED_KEY)) !== '0'; // default on
}

export async function setQuietSoundEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(QUIET_SOUND_ENABLED_KEY, enabled ? '1' : '0');
  if (!enabled) await stopQuietSound();
}

/** Start the Quiet Page's ambient loop. No-ops if unconfigured or disabled. */
export async function playQuietSound(): Promise<void> {
  if (!isAmbientSoundConfigured) return;
  try {
    if (!(await isQuietSoundEnabled())) return;
    if (sound) return; // already playing
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound: s } = await Audio.Sound.createAsync(
      { uri: AMBIENT_SOUND_URL },
      { isLooping: true, volume: 0.4 }
    );
    sound = s;
    await sound.playAsync();
  } catch {
    // Ambient sound is a nice-to-have — never let it break the book.
  }
}

export async function stopQuietSound(): Promise<void> {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  } catch {
    // ignore
  } finally {
    sound = null;
  }
}
