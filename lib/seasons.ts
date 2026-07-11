export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export function getCurrentSeason(): Season {
  const m = new Date().getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}

export const SeasonalTheme: Record<Season, { accent: string; tint: string; label: string }> = {
  spring: { accent: '#C8E8B0', tint: 'rgba(200,232,176,0.04)', label: 'Spring' },
  summer: { accent: '#F0D878', tint: 'rgba(240,216,120,0.04)', label: 'Summer' },
  autumn: { accent: '#D4783C', tint: 'rgba(212,120,60,0.05)', label: 'Autumn' },
  winter: { accent: '#A8C0D8', tint: 'rgba(168,192,216,0.04)', label: 'Winter' },
};

/** Blend the season's accent 30% into gold — used for tab bar active tint. */
export function seasonGoldBlend(season: Season, gold = '#C9A96E'): string {
  const hexToRgb = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [gr, gg, gb] = hexToRgb(gold);
  const [sr, sg, sb] = hexToRgb(SeasonalTheme[season].accent);
  const mix = (a: number, b: number) => Math.round(a * 0.7 + b * 0.3);
  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(mix(gr, sr))}${toHex(mix(gg, sg))}${toHex(mix(gb, sb))}`;
}
