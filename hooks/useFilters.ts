import { useCallback, useMemo, useState } from 'react';
import { FILTERS, FilterDefinition, getFilterById } from '@/constants/filters';
import { matrixFor } from '@/lib/filters';

export interface UseFiltersResult {
  filters: FilterDefinition[];
  selected: FilterDefinition;
  selectedId: string;
  intensity: number; // 0..1
  matrix: number[];
  select: (filter: FilterDefinition) => void;
  selectById: (id: string) => void;
  setIntensity: (value: number) => void;
  reset: () => void;
}

export function useFilters(initialId = 'none', initialIntensity = 1): UseFiltersResult {
  const [selectedId, setSelectedId] = useState(initialId);
  const [intensity, setIntensity] = useState(initialIntensity);

  const selected = useMemo(() => getFilterById(selectedId), [selectedId]);
  const matrix = useMemo(() => matrixFor(selectedId, intensity), [selectedId, intensity]);

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
    select,
    selectById,
    setIntensity,
    reset,
  };
}
