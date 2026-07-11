import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, addMonths, isSameMonth, startOfMonth } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { BookPhoto } from '@/lib/book';
import { chronological, photoDate, mostCapturedMonth } from '@/lib/memories';
import { isClaudeAvailable, generateMonthlyNarrative } from '@/lib/claude';
import { FilteredImage } from '@/components/FilteredImage';
import { resolvePhotoFilter } from '@/lib/filters';
import { BreathingDot } from '@/components/BreathingDot';
import { getCurrentSeason, Season, SeasonalTheme } from '@/lib/seasons';

interface Entry {
  key: string;
  kind: 'milestone' | 'gap';
  date: Date;
  side: 'left' | 'right';
  label: string; // e.g. "The beginning"
  sub?: string; // date label
  photo?: BookPhoto;
  pulsing?: boolean;
  claudeLoading?: boolean;
}

function seasonOf(date: Date): Season {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return 'spring';
  if (m >= 5 && m <= 7) return 'summer';
  if (m >= 8 && m <= 10) return 'autumn';
  return 'winter';
}
const SEASON_LABEL: Record<Season, string> = {
  spring: 'Spring arrived',
  summer: 'Summer arrived',
  autumn: 'Autumn arrived',
  winter: 'Winter arrived',
};

export default function TimelineScreen() {
  const insets = useSafeAreaInsets();
  const { user, bookId } = useAuth();
  const { photos, partner, loading } = useBook(bookId, user?.uid);
  const [claudeOn, setClaudeOn] = useState(false);
  const [narratives, setNarratives] = useState<Record<string, string>>({});

  useEffect(() => {
    isClaudeAvailable().then(setClaudeOn).catch(() => {});
  }, []);

  const sorted = useMemo(() => chronological(photos), [photos]);

  const base = useMemo(() => {
    if (sorted.length === 0) return { entries: [] as Entry[], monthMeta: [] as MonthMeta[] };
    return buildTimeline(sorted);
  }, [sorted]);

  // Enrich otherwise-unlabeled populated months with a Claude narrative, best-effort.
  useEffect(() => {
    if (!claudeOn || !partner) return;
    const selfName = user?.displayName || 'Me';
    const toFetch = base.monthMeta.filter((m) => m.needsNarrative && !narratives[m.key]);
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const m of toFetch.slice(0, 6)) {
        try {
          const text = await generateMonthlyNarrative(
            m.captions,
            m.label,
            [selfName, partner.name]
          );
          if (!cancelled && text) {
            setNarratives((prev) => ({ ...prev, [m.key]: text }));
          }
        } catch {
          // best-effort — leave the generic label in place
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claudeOn, base.monthMeta, partner]);

  const entries = useMemo(() => {
    return base.entries.map((e) =>
      e.kind === 'milestone' && narratives[monthKey(e.date)] && e.claudeLoading
        ? { ...e, label: narratives[monthKey(e.date)]!, claudeLoading: false }
        : e
    );
  }, [base.entries, narratives]);

  const season = getCurrentSeason();
  const accent = SeasonalTheme[season].accent;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.gold} />
        </Pressable>
        <Text style={styles.headerTitle}>Your story</Text>
        <View style={styles.headerBtn} />
      </View>

      {loading && photos.length === 0 ? (
        <View style={styles.center}>
          <BreathingDot />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Your story hasn't begun yet — take your first photo.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.spineWrap}>
            <View style={[styles.spine, { backgroundColor: accent }]} />
            {entries.map((entry, i) => (
              <TimelineRow key={entry.key} entry={entry} accent={accent} delay={i * 40} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function TimelineRow({ entry, accent, delay }: { entry: Entry; accent: string; delay: number }) {
  if (entry.kind === 'gap') {
    return (
      <Animated.View entering={FadeIn.delay(delay)} style={styles.gapRow}>
        <Text style={styles.gapDash}>—</Text>
        <Text style={styles.gapLabel}>{entry.label}</Text>
      </Animated.View>
    );
  }

  const thumb = entry.photo ? (
    <Pressable
      onPress={() => router.push('/(app)/book' as any)}
      style={[styles.thumbWrap, { borderColor: accent }]}
    >
      <FilteredImage
        uri={entry.photo.thumbnailUrl}
        filterId={entry.photo.filterId}
        intensity={entry.photo.intensity}
        filter={resolvePhotoFilter(entry.photo.filterId, entry.photo.filterSnapshot)}
        grain={false}
        style={styles.thumb}
      />
    </Pressable>
  ) : (
    <View style={[styles.thumbWrap, { borderColor: accent }]} />
  );

  const textBlock = (align: 'left' | 'right') => (
    <View style={[styles.textBlock, align === 'right' && { alignItems: 'flex-end' }]}>
      <Text style={[styles.entryDate, align === 'right' && styles.textRight]}>{entry.sub}</Text>
      <Text style={[styles.entryLabel, align === 'right' && styles.textRight]}>{entry.label}</Text>
      {entry.pulsing && <PulsingDot accent={accent} />}
    </View>
  );

  return (
    <Animated.View entering={FadeIn.delay(delay)} style={styles.row}>
      <View style={styles.rowHalf}>
        {entry.side === 'left' && (
          <>
            {textBlock('right')}
            <View style={[styles.connector, { backgroundColor: accent }]} />
            {thumb}
          </>
        )}
      </View>
      <View style={[styles.rowHalf, styles.rowHalfRight]}>
        {entry.side === 'right' && (
          <>
            {thumb}
            <View style={[styles.connector, { backgroundColor: accent }]} />
            {textBlock('left')}
          </>
        )}
      </View>
    </Animated.View>
  );
}

function PulsingDot({ accent }: { accent: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.3, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      true
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View style={[styles.pulsingDot, { backgroundColor: accent }, style]} />
  );
}

// ─── Timeline computation ──────────────────────────────────────

interface MonthMeta {
  key: string;
  label: string;
  captions: string[];
  needsNarrative: boolean;
}

function monthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM');
}

function buildTimeline(sorted: BookPhoto[]): { entries: Entry[]; monthMeta: MonthMeta[] } {
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  const firstDate = photoDate(first)!;
  const now = new Date();

  const groups = new Map<string, BookPhoto[]>();
  for (const p of sorted) {
    const d = photoDate(p);
    if (!d) continue;
    const key = monthKey(d);
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }

  const busiest = mostCapturedMonth(sorted);
  const nowKey = monthKey(now);
  const firstKey = monthKey(firstDate);

  const entries: Entry[] = [];
  const monthMeta: MonthMeta[] = [];
  const seenSeasons = new Set<Season>();
  let side: 'left' | 'right' = 'left';

  let cursor = startOfMonth(firstDate);
  const end = startOfMonth(now);

  while (cursor <= end) {
    const key = monthKey(cursor);
    const monthPhotos = groups.get(key);
    const label = format(cursor, 'MMMM yyyy');

    if (!monthPhotos || monthPhotos.length === 0) {
      entries.push({
        key: `gap-${key}`,
        kind: 'gap',
        date: cursor,
        side: 'left',
        label: format(cursor, 'MMM'),
      });
      cursor = addMonths(cursor, 1);
      continue;
    }

    const season = seasonOf(cursor);
    const isFirstSeasonSighting = !seenSeasons.has(season);
    seenSeasons.add(season);

    let title: string | null = null;
    let photo = monthPhotos[0];
    let pulsing = false;

    if (key === firstKey) {
      title = 'The beginning';
      photo = first;
    } else if (isSameMonth(cursor, now)) {
      title = 'Right now';
      photo = latest;
      pulsing = true;
    } else if (busiest && key === busiest.key) {
      title = 'Your most captured month';
      photo = busiest.photos[0];
    } else if (isFirstSeasonSighting) {
      // The very first populated month is always caught by the "beginning"
      // branch above, so by the time we get here this is genuinely a new
      // season appearing for the first time later in the book.
      title = SEASON_LABEL[season];
    }

    const needsNarrative = !title;
    if (needsNarrative) {
      monthMeta.push({
        key,
        label,
        captions: monthPhotos.map((p) => p.caption).filter(Boolean),
        needsNarrative: true,
      });
    }

    entries.push({
      key: `m-${key}`,
      kind: 'milestone',
      date: cursor,
      side,
      label: title ?? label,
      sub: label,
      photo,
      pulsing,
      claudeLoading: needsNarrative,
    });
    side = side === 'left' ? 'right' : 'left';

    cursor = addMonths(cursor, 1);
  }

  return { entries, monthMeta };
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.displayLight, fontSize: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyText: { ...Typography.bodyMuted, textAlign: 'center' },
  scroll: { paddingTop: 30, paddingHorizontal: 20 },
  spineWrap: { position: 'relative' },
  spine: {
    position: 'absolute',
    left: '50%',
    marginLeft: -0.75,
    top: 0,
    bottom: 0,
    width: 1.5,
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  rowHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  rowHalfRight: {
    justifyContent: 'flex-start',
  },
  connector: {
    width: 24,
    height: 1.5,
    opacity: 0.6,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  thumb: {
    width: 48,
    height: 48,
  },
  textBlock: {
    maxWidth: 150,
    paddingHorizontal: 10,
  },
  textRight: { textAlign: 'right' },
  entryDate: { ...Typography.label, fontSize: 10 },
  entryLabel: { ...Typography.displayLight, fontSize: 16, marginTop: 2 },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  gapRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gapDash: {
    ...Typography.label,
    fontSize: 14,
    color: Colors.textMuted,
  },
  gapLabel: {
    ...Typography.label,
    fontSize: 9,
    color: Colors.textMuted,
    opacity: 0.6,
    marginTop: 2,
  },
});
