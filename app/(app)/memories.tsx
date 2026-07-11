import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, startOfMonth } from 'date-fns';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { BookPhoto } from '@/lib/book';
import {
  getTodayMemory,
  firstPhoto,
  latestPhoto,
  mostCapturedMonth,
  photosThisYear,
  photoDate,
} from '@/lib/memories';
import { isClaudeAvailable, generateMemoryStory, generateMonthlyNarrative } from '@/lib/claude';
import { inferMood, topTwoMoods, MoodColors } from '@/lib/mood';
import { MemoryCard } from '@/components/MemoryCard';
import { FilteredImage } from '@/components/FilteredImage';
import { resolvePhotoFilter } from '@/lib/filters';
import { PhotoViewer } from '@/components/PhotoViewer';
import { BreathingDot } from '@/components/BreathingDot';
import { Logo } from '@/components/Logo';

interface MoodTile {
  key: string;
  label: string;
  colors: [string, string] | null;
  firstPhotoId: string | null;
}

function buildMoodTiles(photos: BookPhoto[]): MoodTile[] {
  const now = new Date();
  const tiles: MoodTile[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = format(d, 'yyyy-MM');
    const monthPhotos = photos.filter((p) => {
      const pd = photoDate(p);
      return pd && format(startOfMonth(pd), 'yyyy-MM') === key;
    });
    if (monthPhotos.length === 0) {
      tiles.push({ key, label: format(d, 'MMM'), colors: null, firstPhotoId: null });
    } else {
      const sorted = [...monthPhotos].sort(
        (a, b) => (photoDate(a)?.getTime() ?? 0) - (photoDate(b)?.getTime() ?? 0)
      );
      const moods = monthPhotos.map((p) => inferMood(p.caption, photoDate(p)!.getHours()));
      const [a, b] = topTwoMoods(moods);
      tiles.push({
        key,
        label: format(d, 'MMM'),
        colors: [MoodColors[a], MoodColors[b]],
        firstPhotoId: sorted[0].id,
      });
    }
  }
  return tiles;
}

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { photos, partner, loading } = useBook(bookId, user?.uid);
  const [viewer, setViewer] = useState<BookPhoto | null>(null);
  const [claudeOn, setClaudeOn] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [todayStory, setTodayStory] = useState<string | null>(null);

  useEffect(() => {
    isClaudeAvailable().then(setClaudeOn).catch(() => {});
  }, []);

  const data = useMemo(
    () => ({
      today: getTodayMemory(photos),
      first: firstPhoto(photos),
      latest: latestPhoto(photos),
      month: mostCapturedMonth(photos),
      thisYear: photosThisYear(photos),
      moodTiles: buildMoodTiles(photos),
    }),
    [photos]
  );

  // Monthly narrative for the current month, best-effort.
  useEffect(() => {
    if (!claudeOn || !partner || photos.length <= 3) return;
    const now = new Date();
    const key = format(startOfMonth(now), 'yyyy-MM');
    const monthPhotos = photos.filter((p) => {
      const pd = photoDate(p);
      return pd && format(startOfMonth(pd), 'yyyy-MM') === key;
    });
    const captions = monthPhotos.map((p) => p.caption).filter(Boolean);
    if (captions.length === 0) return;
    setNarrativeLoading(true);
    generateMonthlyNarrative(captions, format(now, 'MMMM yyyy'), [user?.displayName || 'Me', partner.name])
      .then(setNarrative)
      .catch(() => {})
      .finally(() => setNarrativeLoading(false));
  }, [claudeOn, partner, photos, user?.displayName]);

  // Reflection for the "On this day" memory, best-effort.
  useEffect(() => {
    if (!claudeOn || !data.today || !partner) return;
    generateMemoryStory(data.today.photo.caption, data.today.daysAgo, partner.name)
      .then(setTodayStory)
      .catch(() => {});
  }, [claudeOn, data.today?.photo.id, partner]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View>
        <Text style={styles.title}>Memories</Text>
        <Text style={styles.subtitle}>the moments worth resurfacing</Text>
      </View>
      <Pressable onPress={() => router.push('/timeline' as any)} style={styles.storyBtn} hitSlop={8}>
        <Text style={styles.storyBtnText}>Your story</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.gold} />
      </Pressable>
    </View>
  );

  if (loading && photos.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <BreathingDot />
        </View>
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.center}>
          <Logo size={72} />
          <Text style={styles.emptyText}>Your memories will gather here as your book grows.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Monthly narrative */}
        {(narrative || narrativeLoading) && (
          <Animated.View entering={FadeInDown} style={styles.narrativeCard}>
            <View style={styles.narrativeHeader}>
              <Text style={styles.narrativeLabel}>{format(new Date(), 'MMMM')}, in a few words</Text>
              <Text style={styles.sparkle}>✦</Text>
            </View>
            {narrativeLoading && !narrative ? (
              <ActivityIndicator size="small" color={Colors.gold} style={{ marginTop: 6 }} />
            ) : (
              <Text style={styles.narrativeText}>{narrative}</Text>
            )}
          </Animated.View>
        )}

        {/* On this day */}
        {data.today ? (
          <Animated.View entering={FadeInDown.delay(40)}>
            <MemoryCard
              photo={data.today.photo}
              label={`On this day · ${data.today.label}`}
              height={340}
              rotate={-1}
              onPress={() => setViewer(data.today!.photo)}
            />
            {todayStory && (
              <View style={styles.reflection}>
                <Text style={styles.sparkleSmall}>✦</Text>
                <Text style={styles.reflectionText}>{todayStory}</Text>
              </View>
            )}
          </Animated.View>
        ) : (
          <View style={styles.noToday}>
            <Ionicons name="sparkles-outline" size={22} color={Colors.gold} />
            <Text style={styles.noTodayText}>
              No anniversary today — check back as the seasons turn.
            </Text>
          </View>
        )}

        {/* Mood arc */}
        <View style={styles.moodBlock}>
          <Text style={styles.moodLabel}>Your emotional arc</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
            {data.moodTiles.map((tile) => (
              <Pressable
                key={tile.key}
                disabled={!tile.firstPhotoId}
                onPress={() => {
                  if (tile.firstPhotoId) router.push(`/(app)/book?focus=${tile.firstPhotoId}` as any);
                }}
                style={styles.moodTileWrap}
              >
                <View
                  style={[
                    styles.moodTile,
                    tile.colors
                      ? { backgroundColor: tile.colors[0] }
                      : styles.moodTileEmpty,
                  ]}
                >
                  {tile.colors && (
                    <View style={[styles.moodTileHalf, { backgroundColor: tile.colors[1] }]} />
                  )}
                </View>
                <Text style={styles.moodTileLabel}>{tile.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Milestones row */}
        <View style={styles.milestoneRow}>
          {data.first && (
            <MilestonePhoto
              label="Your first photo"
              photo={data.first}
              rotate={-2}
              onPress={() => setViewer(data.first!)}
            />
          )}
          {data.latest && data.latest.id !== data.first?.id && (
            <MilestonePhoto
              label="Latest addition"
              photo={data.latest}
              rotate={2}
              onPress={() => setViewer(data.latest!)}
            />
          )}
        </View>

        {/* Most captured month */}
        {data.month && data.month.photos.length >= 2 && (
          <Animated.View entering={FadeInDown.delay(80)} style={styles.monthCard}>
            <Text style={styles.monthLabel}>Most captured · {data.month.label}</Text>
            <View style={styles.grid}>
              {data.month.photos.slice(0, 4).map((p) => (
                <Pressable key={p.id} onPress={() => setViewer(p)} style={styles.gridItem}>
                  <FilteredImage
                    uri={p.thumbnailUrl}
                    filterId={p.filterId}
                    intensity={p.intensity}
                    filter={resolvePhotoFilter(p.filterId, p.filterSnapshot)}
                    radius={8}
                    grain={false}
                    style={StyleSheet.absoluteFill}
                  />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}

        {/* This year reel */}
        {data.thisYear.length > 0 && (
          <View style={styles.reelBlock}>
            <Text style={styles.reelLabel}>This year in photos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reel}
            >
              {data.thisYear.map((p) => (
                <Pressable key={p.id} onPress={() => setViewer(p)}>
                  <FilteredImage
                    uri={p.thumbnailUrl}
                    filterId={p.filterId}
                    intensity={p.intensity}
                    filter={resolvePhotoFilter(p.filterId, p.filterSnapshot)}
                    radius={10}
                    grain={false}
                    style={styles.reelThumb}
                  />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      <PhotoViewer photo={viewer} visible={!!viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

function MilestonePhoto({
  label,
  photo,
  rotate,
  onPress,
}: {
  label: string;
  photo: BookPhoto;
  rotate: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.milestone, { transform: [{ rotate: `${rotate}deg` }] }]}
    >
      <FilteredImage
        uri={photo.thumbnailUrl}
        filterId={photo.filterId}
        intensity={photo.intensity}
        filter={resolvePhotoFilter(photo.filterId, photo.filterSnapshot)}
        radius={8}
        grain={false}
        style={styles.milestoneImg}
      />
      <Text style={styles.milestoneLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 8,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 30,
    color: Colors.gold,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: Colors.textMuted,
    marginTop: 2,
  },
  storyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 4,
  },
  storyBtnText: {
    ...Typography.labelGold,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 12,
    gap: 20,
  },
  narrativeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
  },
  narrativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  narrativeLabel: {
    ...Typography.label,
  },
  sparkle: {
    color: Colors.gold,
    fontSize: 12,
  },
  narrativeText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textOnInk,
    marginTop: 8,
  },
  reflection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 6,
    marginTop: 10,
  },
  sparkleSmall: {
    color: Colors.gold,
    fontSize: 11,
    marginTop: 2,
  },
  reflectionText: {
    flex: 1,
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  noToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.inkLight,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  noTodayText: {
    flex: 1,
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: Colors.textMuted,
  },
  moodBlock: {
    gap: 10,
  },
  moodLabel: {
    fontFamily: Fonts.serifBold,
    fontSize: 17,
    color: Colors.textOnInk,
    marginLeft: 4,
  },
  moodRow: {
    gap: 10,
    paddingRight: 8,
  },
  moodTileWrap: {
    alignItems: 'center',
    gap: 6,
  },
  moodTile: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  moodTileHalf: {
    width: '50%',
    height: '100%',
  },
  moodTileEmpty: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  moodTileLabel: {
    ...Typography.label,
    fontSize: 9,
  },
  milestoneRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  milestone: {
    flex: 1,
    backgroundColor: Colors.paper,
    borderRadius: 14,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  milestoneImg: {
    width: '100%',
    height: 130,
    borderRadius: 8,
  },
  milestoneLabel: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.textOnPaper,
    marginTop: 8,
    marginLeft: 2,
  },
  monthCard: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  monthLabel: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.textOnPaper,
    marginBottom: 10,
    marginLeft: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    aspectRatio: 1.3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reelBlock: {
    gap: 10,
  },
  reelLabel: {
    fontFamily: Fonts.serifBold,
    fontSize: 17,
    color: Colors.textOnInk,
    marginLeft: 4,
  },
  reel: {
    gap: 10,
    paddingRight: 8,
  },
  reelThumb: {
    width: 96,
    height: 96,
  },
});
