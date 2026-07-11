export type Mood = 'joyful' | 'quiet' | 'adventurous' | 'tender' | 'melancholy' | 'playful';

export function inferMood(caption: string, hour: number): Mood {
  const l = caption.toLowerCase();
  if (hour >= 22 || hour <= 5) return 'quiet';
  if (/laugh|fun|haha|silly|game|play/.test(l)) return 'playful';
  if (/love|miss|hold|close|us|together|always/.test(l)) return 'tender';
  if (/hike|travel|trip|explore|road|adventure|new/.test(l)) return 'adventurous';
  if (/tired|rain|grey|quiet|still|slow|soft/.test(l)) return 'melancholy';
  if (/happy|joy|smile|sun|bright|beautiful|perfect/.test(l)) return 'joyful';
  if (hour >= 7 && hour <= 12) return 'joyful';
  if (hour >= 13 && hour <= 17) return 'adventurous';
  if (hour >= 18 && hour <= 21) return 'tender';
  return 'quiet';
}

export const MoodColors: Record<Mood, string> = {
  joyful: '#F0D878',
  quiet: '#A8C0D8',
  adventurous: '#C8E8B0',
  tender: '#E8B0B0',
  melancholy: '#B0A8C8',
  playful: '#F0C878',
};

export const MoodLabels: Record<Mood, string> = {
  joyful: 'Joyful',
  quiet: 'Quiet',
  adventurous: 'Adventurous',
  tender: 'Tender',
  melancholy: 'Wistful',
  playful: 'Playful',
};

export function getDominantMood(moods: Mood[]): Mood {
  const counts = moods.reduce(
    (acc, m) => ({ ...acc, [m]: (acc[m] || 0) + 1 }),
    {} as Record<Mood, number>
  );
  return (Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'joyful') as Mood;
}

/** The dominant and second-most-common mood for a group of photos — used for the two-stop gradient tile. */
export function topTwoMoods(moods: Mood[]): [Mood, Mood] {
  const counts = moods.reduce(
    (acc, m) => ({ ...acc, [m]: (acc[m] || 0) + 1 }),
    {} as Record<Mood, number>
  );
  const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a) as [Mood, number][];
  const first = sorted[0]?.[0] ?? 'joyful';
  const second = sorted[1]?.[0] ?? first;
  return [first, second];
}
