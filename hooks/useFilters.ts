import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { FILTERS, FilterDefinition } from '@/constants/filters';
import { matrixForFilter } from '@/lib/filters';
import { findFilter, getSavedPresets } from '@/lib/presets';

export interface UseFiltersResult {
  filters: FilterDefinition[];
  selected: FilterDefinition;
  selectedId: string;
  intensity: number; // 0..1
  matrix: number[];
  /** True when the selected filter isn't one of the built-in FILTERS (i.e. a "Mine" preset). */
  isCustom: boolean;
  select: (filter: FilterDefinition) => void;
  selectById: (id: string) => void;
  setIntensity: (value: number) => void;
  reset: () => void;
}

export function useFilters(initialId = 'none', initialIntensity = 1): UseFiltersResult {
  const [selectedId, setSelectedId] = useState(initialId);
  const [intensity, setIntensity] = useState(initialIntensity);
  const [savedPresets, setSavedPresets] = useState<FilterDefinition[]>([]);

  const loadPresets = useCallback(() => {
    getSavedPresets().then(setSavedPresets).catch(() => {});
  }, []);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  // Refresh whenever this screen regains focus, so a preset saved in the
  // filter builder shows up immediately on returning to the camera.
  useFocusEffect(
    useCallback(() => {
      loadPresets();
    }, [loadPresets])
  );

  const selected = useMemo(
    () => findFilter(selectedId, savedPresets),
    [selectedId, savedPresets]
  );
  const isCustom = useMemo(() => !FILTERS.some((f) => f.id === selectedId), [selectedId]);
  const matrix = useMemo(() => matrixForFilter(selected, intensity), [selected, intensity]);

  const select = useCallback((filter: FilterDefinition) => setSelectedId(filter.id), []);
  const selectById = useCallback((id: string) => setSelectedId(id), []);
  const reset = useCallback(() => {
    setSelectedId('none');
    setIntensity(1);
  }, []);

  return {
    filters: FILTERS,
    selected,
    selectedId,
    intensity,
    matrix,
    isCustom,
    select,
    selectById,
    setIntensity,
    reset,
  };
}
