import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { TimeLock, formatUnlockDate, formatCountdown } from '@/lib/timelocks';
import { resolvePhotoFilter } from '@/lib/filters';
import { FilteredImage } from './FilteredImage';
import { PartnerAvatar } from './PartnerAvatar';
import { Vignette } from './Vignette';

interface TimeLockPageProps {
  lock: TimeLock;
  width: number;
  height: number;
  justUnlocked?: boolean;
}

export function TimeLockPage({ lock, width, height, justUnlocked }: TimeLockPageProps) {
  if (!lock.isUnlocked) {
    return (
      <View style={[styles.lockedPage, { width, height }]}>
        <Ionicons name="mail-outline" size={40} color={Colors.gold} />
        <Text style={styles.lockedTitle}>Something is waiting for you</Text>
        <Text style={styles.lockedDate}>on {formatUnlockDate(lock.lockedUntil.toDate())}</Text>
        <Text style={styles.countdown}>{formatCountdown(lock.lockedUntil.toDate())}</Text>
        <PartnerAvatar
          name={lock.addedByName}
          color={lock.addedByColor}
          size={26}
          style={styles.lockedAvatar}
        />
      </View>
    );
  }

  return <UnlockedCapsule lock={lock} width={width} height={height} justUnlocked={justUnlocked} />;
}

function UnlockedCapsule({
  lock,
  width,
  height,
  justUnlocked,
}: {
  lock: TimeLock;
  width: number;
  height: number;
  justUnlocked?: boolean;
}) {
  const scale = useSharedValue(justUnlocked ? 0.95 : 1);
  const opacity = useSharedValue(justUnlocked ? 0 : 1);
  const [revealCount, setRevealCount] = useState(justUnlocked ? 0 : lock.caption.length);

  useEffect(() => {
    if (!justUnlocked) return;
    scale.value = withSpring(1, { damping: 12, stiffness: 120 });
    opacity.value = withTiming(1, { duration: 500 });

    const capped = Math.min(lock.caption.length, 40);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setRevealCount(i);
      if (i >= capped) {
        clearInterval(interval);
        setRevealCount(lock.caption.length);
      }
    }, 200);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justUnlocked]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.unlockedPage, { width, height }, style]}>
      <View style={styles.photoFrame}>
        <FilteredImage
          uri={lock.url}
          filterId={lock.filterId}
          intensity={lock.intensity}
          filter={resolvePhotoFilter(lock.filterId, lock.filterSnapshot)}
          radius={4}
          style={{ width: '100%', height: height * 0.58 }}
          grain={false}
        />
        <Vignette color="#4A1E00" opacity={0.35} />
      </View>
      <Text style={styles.unlockedLabel}>Opened today</Text>
      {!!lock.caption && (
        <Text style={styles.caption}>{lock.caption.slice(0, revealCount)}</Text>
      )}
      {!!lock.message && <Text style={styles.message}>{lock.message}</Text>}
      <View style={styles.footer}>
        <PartnerAvatar name={lock.addedByName} color={lock.addedByColor} size={26} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lockedPage: {
    backgroundColor: Colors.ink,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  lockedTitle: {
    ...Typography.displayLight,
    fontSize: 19,
    textAlign: 'center',
    marginTop: 18,
  },
  lockedDate: {
    ...Typography.bodyMuted,
    marginTop: 6,
  },
  countdown: {
    ...Typography.label,
    marginTop: 16,
  },
  lockedAvatar: {
    position: 'absolute',
    bottom: 18,
    right: 18,
  },
  unlockedPage: {
    backgroundColor: Colors.paper,
    borderRadius: 6,
    padding: 18,
    overflow: 'hidden',
  },
  photoFrame: {
    borderWidth: 3,
    borderColor: Colors.filmBorder,
    borderRadius: 6,
    overflow: 'hidden',
  },
  unlockedLabel: {
    ...Typography.label,
    color: Colors.goldDark,
    marginTop: 14,
  },
  caption: {
    ...Typography.handwrittenLarge,
    fontSize: 20,
    marginTop: 6,
  },
  message: {
    ...Typography.handwritten,
    fontSize: 17,
    color: Colors.textMuted,
    marginTop: 10,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'flex-end',
  },
});
