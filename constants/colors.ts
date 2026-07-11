export const Colors = {
  // Backgrounds
  ink: '#1A1410', // Near-black warm — main background
  inkLight: '#2C2418', // Slightly lighter dark for cards on dark bg
  inkLighter: '#3A3020', // Elevated surfaces / pressed states on dark
  paper: '#F5EFE0', // Warm cream — the "page" of the book
  paperDark: '#EDE3CE', // Slightly darker cream for page shadow
  paperTint: '#FAF6EE', // Postcard paper

  // Accents
  gold: '#C9A96E', // Warm gold — primary accent, logo
  goldLight: '#E8C87E', // Highlight gold for gradients
  goldDark: '#A8883E', // Darker gold for pressed states
  coral: '#E8735A', // Warm coral — notifications, postcard stamp

  // Text
  textOnInk: '#F5EFE0', // Cream text on dark backgrounds
  textOnPaper: '#2C1810', // Dark warm brown text on cream pages
  textMuted: '#8C7B6B', // Muted for captions, dates
  textHandwritten: '#4A3728', // Slightly warm dark for handwritten captions
  textWarm: '#F0E8D8', // Slightly warmer white — printed-form values in settings

  // UI
  separator: 'rgba(201,169,110,0.2)', // Gold tinted dividers
  overlay: 'rgba(26,20,16,0.7)', // Scrim
  glassLight: 'rgba(245,239,224,0.1)', // Frosted glass on dark
  glassDark: 'rgba(26,20,16,0.4)', // Frosted glass on light
  field: 'rgba(245,239,224,0.06)', // Input field background on dark
  fieldBorder: 'rgba(201,169,110,0.25)', // Input field border

  // Filter strip
  filterSelected: '#C9A96E',
  filterUnselected: 'rgba(201,169,110,0.3)',

  // Status
  online: '#7CB87C',
  error: '#E05252',

  // V2 — extended surfaces & paper tones
  paperWarm: '#F7F0E3',
  paperCool: '#F0EDF5',
  paperAged: '#EDE0C8',
  inkDeep: '#1C1008',
  inkMid: '#3D2E1E',
  surface: '#231C14',
  surfaceRaised: '#2E2318',
  surfaceSunken: '#140E08',
  goldSubtle: 'rgba(201,169,110,0.08)',
  goldBorder: 'rgba(201,169,110,0.18)',
  goldGlow: 'rgba(201,169,110,0.35)',
  filmBorder: '#1C1208',

  // V2 — seasonal accents
  spring: '#C8E8B0',
  summer: '#F0D878',
  autumn: '#D4783C',
  winter: '#A8C0D8',
} as const;

export type ColorName = keyof typeof Colors;
