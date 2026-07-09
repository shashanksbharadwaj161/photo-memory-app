import { FilterDefinition, getFilterById } from '@/constants/filters';

/**
 * The 4×5 identity color matrix (no change). Used as the "0% intensity"
 * anchor when interpolating filter strength.
 */
export const IDENTITY_MATRIX: number[] = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
];

/**
 * Linearly interpolate between the identity matrix and a target filter matrix.
 * `intensity` is 0..1 (0 = original, 1 = full filter). This gives the intensity
 * slider a smooth, physically-plausible ramp.
 */
export function lerpMatrix(target: number[], intensity: number): number[] {
  const t = Math.max(0, Math.min(1, intensity));
  if (target.length !== IDENTITY_MATRIX.length) return IDENTITY_MATRIX;
  return IDENTITY_MATRIX.map((base, i) => base + (target[i] - base) * t);
}

/**
 * Resolve the color matrix to feed into <ColorMatrix> for a given filter id and
 * intensity. Centralises the lookup so every screen renders filters identically.
 */
export function matrixFor(filterId: string | undefined | null, intensity = 1): number[] {
  const filter = getFilterById(filterId);
  if (intensity >= 1) return filter.matrix;
  return lerpMatrix(filter.matrix, intensity);
}

/**
 * Whether a filter meaningfully changes the pixels. Used to skip the (native)
 * ColorMatrix wrapper entirely for "Original", which is both faster and avoids
 * an unnecessary GPU pass.
 */
export function isIdentity(filter: FilterDefinition, intensity = 1): boolean {
  return filter.id === 'none' || intensity <= 0;
}
