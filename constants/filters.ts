export interface FilterDefinition {
  id: string;
  name: string;
  subtitle: string;
  matrix: number[]; // 4x5 color matrix for ColorMatrixImageFilter
  grainOpacity: number; // 0 = no grain, 0.08 = subtle, 0.15 = heavy
  vignetteOpacity: number; // 0 = no vignette, 1 = strong
  vignetteColor: string;
  tintForThumbnail: string; // Hex color for the filter strip thumbnail tint
}

// Every matrix is a 4×5 RGBA color matrix in row-major order:
// [ R→R, G→R, B→R, A→R, +R,
//   R→G, G→G, B→G, A→G, +G,
//   R→B, G→B, B→B, A→B, +B,
//   R→A, G→A, B→A, A→A, +A ]
// Values are in 0–1 range (ColorMatrixImageFilter uses 0–1 for the matrix).

export const FILTERS: FilterDefinition[] = [
  {
    id: 'none',
    name: 'Original',
    subtitle: 'No filter',
    matrix: [
      1, 0, 0, 0, 0,
      0, 1, 0, 0, 0,
      0, 0, 1, 0, 0,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0,
    vignetteOpacity: 0,
    vignetteColor: '#000000',
    tintForThumbnail: 'transparent',
  },
  {
    id: 'kodak_gold',
    name: 'Kodak Gold',
    subtitle: 'Warm 90s film',
    matrix: [
      1.2, 0.05, 0, 0, 0.02,
      0, 1.05, 0, 0, 0.01,
      0, 0, 0.85, 0, -0.02,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.07,
    vignetteOpacity: 0.3,
    vignetteColor: '#3D1F00',
    tintForThumbnail: 'rgba(200,140,60,0.35)',
  },
  {
    id: 'polaroid',
    name: 'Polaroid',
    subtitle: 'Faded & washed out',
    matrix: [
      0.9, 0.05, 0.05, 0, 0.08,
      0.03, 0.88, 0.03, 0, 0.06,
      0.03, 0.03, 0.85, 0, 0.1,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.06,
    vignetteOpacity: 0.35,
    vignetteColor: '#1A0D00',
    tintForThumbnail: 'rgba(255,230,180,0.3)',
  },
  {
    id: 'bw_grain',
    name: 'Silver',
    subtitle: 'High contrast B&W',
    matrix: [
      0.33, 0.33, 0.33, 0, 0,
      0.33, 0.33, 0.33, 0, 0,
      0.33, 0.33, 0.33, 0, 0,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.14,
    vignetteOpacity: 0.5,
    vignetteColor: '#000000',
    tintForThumbnail: 'rgba(180,180,180,0.3)',
  },
  {
    id: 'cyanotype',
    name: 'Cyan',
    subtitle: 'Moody blue tone',
    matrix: [
      0.5, 0.1, 0.1, 0, 0,
      0.05, 0.6, 0.15, 0, 0.02,
      0.1, 0.15, 1.1, 0, 0.05,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.05,
    vignetteOpacity: 0.4,
    vignetteColor: '#001A33',
    tintForThumbnail: 'rgba(40,100,180,0.3)',
  },
  {
    id: 'hdr_glow',
    name: 'HDR Glow',
    subtitle: 'Soft punchy bloom',
    matrix: [
      1.15, 0, 0, 0, 0.02,
      0, 1.15, 0, 0, 0.02,
      0, 0, 1.15, 0, 0.02,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.02,
    vignetteOpacity: 0.25,
    vignetteColor: '#0A0A0A',
    tintForThumbnail: 'rgba(255,255,240,0.25)',
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    subtitle: 'Always sunset',
    matrix: [
      1.25, 0.1, 0, 0, 0.05,
      0.02, 1.0, 0, 0, 0.02,
      0, 0, 0.7, 0, -0.03,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.04,
    vignetteOpacity: 0.45,
    vignetteColor: '#4A1E00',
    tintForThumbnail: 'rgba(230,160,30,0.35)',
  },
  {
    id: 'muted_portra',
    name: 'Portra',
    subtitle: 'Soft & editorial',
    matrix: [
      0.95, 0.05, 0, 0, 0.05,
      0, 0.9, 0.05, 0, 0.03,
      0, 0.03, 0.88, 0, 0.04,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.05,
    vignetteOpacity: 0.2,
    vignetteColor: '#200A00',
    tintForThumbnail: 'rgba(200,180,160,0.3)',
  },
  {
    id: 'noir',
    name: 'Noir',
    subtitle: 'Deep cool night',
    matrix: [
      0.25, 0.3, 0.1, 0, 0.05,
      0.2, 0.3, 0.1, 0, 0.05,
      0.15, 0.2, 0.45, 0, 0.08,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.1,
    vignetteOpacity: 0.6,
    vignetteColor: '#000A14',
    tintForThumbnail: 'rgba(20,40,80,0.4)',
  },
  {
    id: 'ghibli',
    name: 'Ghibli',
    subtitle: 'Soft painted anime',
    matrix: [
      1.18, 0, 0, 0, 0.08,
      0.05, 1.12, 0.08, 0, 0.06,
      0.02, 0.08, 1.05, 0, 0.04,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.12,
    vignetteOpacity: 0.15,
    vignetteColor: '#C8E8C8',
    tintForThumbnail: 'rgba(120,200,160,0.35)',
  },
  {
    id: 'fuji',
    name: 'Fuji Film',
    subtitle: 'Warm punchy Provia',
    matrix: [
      1.1, 0.03, 0, 0, 0.03,
      0, 1.05, 0.02, 0, 0.01,
      0, 0.02, 0.92, 0, -0.02,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.06,
    vignetteOpacity: 0.3,
    vignetteColor: '#1A0800',
    tintForThumbnail: 'rgba(220,160,80,0.3)',
  },
  {
    id: 'wes_anderson',
    name: 'Wes Anderson',
    subtitle: 'Pastel symmetry',
    matrix: [
      0.85, 0.1, 0.05, 0, 0.12,
      0.05, 0.82, 0.08, 0, 0.1,
      0.05, 0.08, 0.78, 0, 0.14,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.04,
    vignetteOpacity: 0.25,
    vignetteColor: '#2D1F3D',
    tintForThumbnail: 'rgba(255,200,180,0.3)',
  },
  {
    id: 'teal_orange',
    name: 'Teal & Orange',
    subtitle: 'Cinematic grade',
    matrix: [
      1.2, 0, 0, 0, 0.04,
      0, 0.95, 0.05, 0, -0.02,
      0, 0.15, 1.1, 0, -0.04,
      0, 0, 0, 1, 0,
    ],
    grainOpacity: 0.03,
    vignetteOpacity: 0.5,
    vignetteColor: '#001A1A',
    tintForThumbnail: 'rgba(0,180,180,0.25)',
  },
];

export const DEFAULT_FILTER = FILTERS[0];

export function getFilterById(id: string | undefined | null): FilterDefinition {
  return FILTERS.find((f) => f.id === id) ?? DEFAULT_FILTER;
}
