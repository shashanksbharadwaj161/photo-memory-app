import AsyncStorage from '@react-native-async-storage/async-storage';
import { FILTERS, FilterDefinition } from '@/constants/filters';
import { MY_PRESETS } from '@/constants/my-presets';

const CUSTOM_PRESETS_KEY = 'locket_custom_presets';

export function getAllFilters(): FilterDefinition[] {
  return FILTERS;
}

export function getStaticPresets(): FilterDefinition[] {
  return MY_PRESETS;
}

export async function getSavedPresets(): Promise<FilterDefinition[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? (JSON.parse(raw) as FilterDefinition[]) : [];
  } catch {
    return [];
  }
}

export async function savePreset(preset: FilterDefinition): Promise<void> {
  const existing = await getSavedPresets();
  const updated = [...existing.filter((p) => p.id !== preset.id), preset];
  await AsyncStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
}

export async function deletePreset(id: string): Promise<void> {
  const existing = await getSavedPresets();
  await AsyncStorage.setItem(
    CUSTOM_PRESETS_KEY,
    JSON.stringify(existing.filter((p) => p.id !== id))
  );
}

/**
 * All filters available in the "Mine" tab: bundled presets from
 * constants/my-presets.ts plus whatever the user has saved on this device.
 * A saved preset with the same id as a bundled one wins in this list (it
 * reflects the user's latest edit), even though `findFilter`'s resolution
 * order below keeps bundled presets authoritative for rendering old photos.
 */
export function mergeMinePresets(saved: FilterDefinition[]): FilterDefinition[] {
  const byId = new Map<string, FilterDefinition>();
  for (const p of MY_PRESETS) byId.set(p.id, p);
  for (const p of saved) byId.set(p.id, p);
  return Array.from(byId.values());
}

export function findFilter(id: string, saved: FilterDefinition[] = []): FilterDefinition {
  const all = [...FILTERS, ...MY_PRESETS, ...saved];
  return all.find((f) => f.id === id) ?? FILTERS[0];
}
