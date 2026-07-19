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
import { LinearGradient } from 'expo-linear-gradient';
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
import { FilteredImage } from '@/components/FilteredImage';
import { resolvePhotoFilter } from '@/lib/filters';
import { PhotoViewer } from '@/components/PhotoViewer';
import { BreathingDot } from '@/components/BreathingDot';
import { BreathingLogo } from '@/components/BreathingLogo';
import { PressableScale } from '@/components/PressableScale';
import { RadialBackdrop } from '@/components/RadialBackdrop';

/** Deterministic small rotation per photo, so the box always looks the same. */
function seededRotation(id: string, max = 2.5): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 100) / 100) * max * 2 - max;
}

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
      const moods = monthPhotos.map((p) => inferMood(p.caption ?? '', photoDate(p)!.getHours()));
      const [a, b] = topTwoMoods(moods);
      tiles.push({
        key,
        label: format(d, 'MMM'),
        colors: [MoodColors[a], MoodColors[b]],
        firstPhotoId: sorted[0]?.id ?? null,
      });
    }
  }
  return tiles;
}

/** A photograph as an object: cream frame, deep lip, handwritten label, seeded tilt. */
function Polaroid({
  photo,
  label,
  width,
  onPress,
  big,
}: {
  photo: BookPhoto;
  label: string;
  width: number;
  onPress: () => void;
  big?: boolean;
}) {
  const rotate = seededRotation(photo.id);
  const photoSize = width - 20;
  return (
    <PressableScale onPress={onPress} style={{ transform: [{ rotate: `${rotate}deg` }] }}>
      <View style={[polaroidStyles.frame, { width }]}>
        <FilteredImage
          uri={big ? photo.url : photo.thumbnailUrl || photo.url}
          filterId={photo.filterId}
          intensity={photo.intensity}
          filter={resolvePhotoFilter(photo.filterId, photo.filterSnapshot)}
          radius={2}
          grain={false}
          style={{ width: photoSize, height: big ? photoSize * 1.05 : photoSize * 0.92 }}
        />
        <Text style={polaroidStyles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const polaroidStyles = StyleSheet.create({
  frame: {
    backgroundColor: Colors.paperWarm,
    padding: 10,
    paddingBottom: 6,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  label: {
    fontFamily: Fonts.hand,
    fontSize: 19,
    color: Colors.textHandwritten,
    textAlign: 'center',
    paddingVertical: 10,
  },
});

/** A strip of film: sprocket holes above and below a row of frames. */
function FilmStrip({
  photos,
  onPress,
}: {
  photos: BookPhoto[];
  onPress: (p: BookPhoto) => void;
}) {
  const holes = (key: string) => (
    <View style={filmStyles.holeRow} key={key}>
      {Array.from({ length: 14 }).map((_, i) => (
        <View key={i} style={filmStyles.hole} />
      ))}
    </View>
  );
  return (
    <View style={filmStyles.strip}>
      {holes('top')}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={filmStyles.framesRow}
      >
        {photos.map((p) => (
          <Pressable key={p.id} onPress={() => onPress(p)}>
            <FilteredImage
              uri={p.thumbnailUrl || p.url}
              filterId={p.filterId}
              intensity={p.intensity}
              filter={resolvePhotoFilter(p.filterId, p.filterSnapshot)}
              radius={3}
              grain={false}
              style={filmStyles.frame}
            />
          </Pressable>
        ))}
      </ScrollView>
      {holes('bottom')}
    </View>
  );
}

const filmStyles = StyleSheet.create({
  strip: {
    backgroundColor: '#120D07',
    borderRadius: 10,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  holeRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 5,
  },
  hole: {
    width: 9,
    height: 6,
    borderRadius: 2,
    backgroundColor: 'rgba(245,239,224,0.14)',
  },
  framesRow: {
    gap: 6,
    paddingHorizontal: 8,
  },
  frame: {
    width: 92,
    height: 72,
  },
});

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
    generateMemoryStory(data.today.photo.caption ?? '', data.today.daysAgo, partner.name)
      .then(setTodayStory)
      .catch(() => {});
  }, [claudeOn, data.today?.photo.id, partner]);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <View>
        <Text style={styles.kicker}>THE SHOEBOX</Text>
        <Text style={styles.title}>Memories</Text>
      </View>
      <PressableScale onPress={() => router.push('/timeline' as any)} style={styles.storyBtn} hitSlop={8}>
        <Text style={styles.storyBtnText}>Your story</Text>
        <Ionicons name="chevron-forward" size={14} color={Colors.gold} />
      </PressableScale>
    </View>
  );

  if (loading && photos.length === 0) {
    return (
      <View style={styles.root}>
        <RadialBackdrop />
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
        <RadialBackdrop />
        {header}
        <View style={styles.center}>
          <BreathingLogo size={76} />
          <Text style={styles.emptyText}>
            Take more photos together — this box fills itself.
          </Text>
        </View>
      </View>
    );
  }

  const heroWidth = Math.min(width - 72, 330);
  const smallWidth = (width - 36 - 18) / 2;

  return (
    <View style={styles.root}>
      <RadialBackdrop />
      {/* Warm light pooling from the top — opening the box near a window */}
      <LinearGradient
        colors={['rgba(232,200,126,0.10)', 'rgba(0,0,0,0)']}
        style={styles.lamp}
        pointerEvents="none"
      />
      {header}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* On this day — the photograph on top of the pile */}
        {data.today ? (
          <Animated.View entering={FadeInDown.springify().damping(15)} style={styles.heroWrap}>
            <Text style={styles.heroLabel}>ON THIS DAY · {data.today.label.toUpperCase()}</Text>
            <Polaroid
              photo={data.today.photo}
              label={data.today.photo.caption || format(new Date(), 'MMMM d')}
              width={heroWidth}
              big
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
            <Ionicons name="sparkles-outline" size={20} color={Colors.gold} />
            <Text style={styles.noTodayText}>
              Nothing resurfaced today — the box remembers, even when it's quiet.
            </Text>
          </View>
        )}

        {/* Monthly narrative */}
        {(narrative || narrativeLoading) && (
          <Animated.View entering={FadeInDown.delay(60)} style={styles.narrativeCard}>
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

        {/* Two photographs pulled from deeper in the box */}
        <View style={styles.pairRow}>
          {data.first && (
            <Polaroid
              photo={data.first}
              label="the very first"
              width={smallWidth}
              onPress={() => setViewer(data.first!)}
            />
          )}
          {data.latest && data.latest.id !== data.first?.id && (
            <Polaroid
              photo={data.latest}
              label="the latest"
              width={smallWidth}
              onPress={() => setViewer(data.latest!)}
            />
          )}
        </View>

        {/* Emotional arc */}
        <View style={styles.moodBlock}>
          <Text style={styles.sectionLabel}>YOUR EMOTIONAL ARC</Text>
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
                    tile.colors ? { backgroundColor: tile.colors[0] } : styles.moodTileEmpty,
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

        {/* Most captured month */}
        {data.month && (data.month.photos?.length ?? 0) >= 2 && (
          <Animated.View entering={FadeInDown.delay(90)} style={styles.monthBlock}>
            <Text style={styles.sectionLabel}>
              MOST CAPTURED · {data.month.label.toUpperCase()}
            </Text>
            <View style={styles.monthGrid}>
              {data.month.photos.slice(0, 4).map((p) => (
                <Pressable key={p.id} onPress={() => setViewer(p)} style={styles.monthItem}>
                  <FilteredImage
                    uri={p.thumbnailUrl || p.url}
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

        {/* This year as a strip of film */}
        {data.thisYear.length > 0 && (
          <View style={styles.reelBlock}>
            <Text style={styles.sectionLabel}>THIS YEAR, ON FILM</Text>
            <FilmStrip photos={data.thisYear} onPress={setViewer} />
          </View>
        )}
      </ScrollView>

      <PhotoViewer photo={viewer} visible={!!viewer} onClose={() => setViewer(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  lamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 10,
  },
  kicker: {
    ...Typography.label,
    letterSpacing: 3,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 30,
    color: Colors.gold,
    marginTop: 2,
  },
  storyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingBottom: 6,
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
    lineHeight: 24,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 26,
  },
  heroWrap: {
    alignItems: 'center',
    gap: 14,
  },
  heroLabel: {
    ...Typography.labelGold,
    letterSpacing: 2.5,
  },
  reflection: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 2,
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
    textAlign: 'center',
  },
  noToday: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
  },
  noTodayText: {
    flex: 1,
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textMuted,
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
  pairRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  sectionLabel: {
    ...Typography.label,
    letterSpacing: 2.5,
    marginBottom: 10,
    marginLeft: 4,
  },
  moodBlock: {},
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
  monthBlock: {},
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthItem: {
    width: '48.4%',
    aspectRatio: 1.3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reelBlock: {},
});
