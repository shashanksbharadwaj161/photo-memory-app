import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { BookPhoto } from '@/lib/book';
import { resolvePhotoFilter } from '@/lib/filters';
import { FilteredImage } from './FilteredImage';

interface QuietPageProps {
  photo: BookPhoto;
  width: number;
  height: number;
  onPress?: () => void;
}

function GoldStar({ size = 12 }: { size?: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 50 : 20;
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={points} fill={Colors.gold} />
    </Svg>
  );
}

export function QuietPage({ photo, width, height, onPress }: QuietPageProps) {
  const pulse = useSharedValue(0.7);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800 }),
        withTiming(0.7, { duration: 1800 })
      ),
      -1,
      true
    );
  }, [pulse]);

  const borderStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  const photoHeight = Math.round(height * 0.72);

  return (
    <Pressable style={[styles.page, { width, height }]} onPress={onPress}>
      <Animated.View style={[styles.borderGlow, borderStyle]} pointerEvents="none" />
      <View style={styles.inner}>
        <FilteredImage
          uri={photo.url}
          filterId={photo.filterId}
          intensity={photo.intensity}
          filter={resolvePhotoFilter(photo.filterId, photo.filterSnapshot)}
          radius={4}
          style={{ width: '100%', height: photoHeight }}
        />
        {!!photo.caption && <Text style={styles.caption}>{photo.caption}</Text>}
      </View>
      <View style={styles.starCorner}>
        <GoldStar size={12} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: Colors.paperWarm,
    borderRadius: 6,
    overflow: 'hidden',
  },
  borderGlow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: 6,
  },
  inner: {
    flex: 1,
    padding: 18,
  },
  caption: {
    ...Typography.handwrittenLarge,
    fontSize: 21,
    marginTop: 16,
  },
  starCorner: {
    position: 'absolute',
    bottom: 14,
    left: 14,
  },
});
