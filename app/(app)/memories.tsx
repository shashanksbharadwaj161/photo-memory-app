import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { BookPhoto } from '@/lib/book';
import {
  getTodayMemory,
  firstPhoto,
  latestPhoto,
  mostCapturedMonth,
  photosThisYear,
} from '@/lib/memories';
import { MemoryCard } from '@/components/MemoryCard';
import { FilteredImage } from '@/components/FilteredImage';
import { PhotoViewer } from '@/components/PhotoViewer';
import { BreathingDot } from '@/components/BreathingDot';
import { Logo } from '@/components/Logo';

export default function MemoriesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { photos, loading } = useBook(bookId, user?.uid);
  const [viewer, setViewer] = useState<BookPhoto | null>(null);

  const data = useMemo(
    () => ({
      today: getTodayMemory(photos),
      first: firstPhoto(photos),
      latest: latestPhoto(photos),
      month: mostCapturedMonth(photos),
      thisYear: photosThisYear(photos),
    }),
    [photos]
  );

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.title}>Memories</Text>
      <Text style={styles.subtitle}>the moments worth resurfacing</Text>
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
          </Animated.View>
        ) : (
          <View style={styles.noToday}>
            <Ionicons name="sparkles-outline" size={22} color={Colors.gold} />
            <Text style={styles.noTodayText}>
              No anniversary today — check back as the seasons turn.
            </Text>
          </View>
        )}

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
