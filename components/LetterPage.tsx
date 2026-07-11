import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { FutureLetter } from '@/lib/letters';
import { formatUnlockDate, formatCountdown } from '@/lib/timelocks';

interface LetterPageProps {
  letter: FutureLetter;
  width: number;
  height: number;
  justUnlocked?: boolean;
}

export function LetterPage({ letter, width, height, justUnlocked }: LetterPageProps) {
  if (!letter.isUnlocked) {
    return (
      <View style={[styles.lockedPage, { width, height }]}>
        <Ionicons name="document-lock-outline" size={36} color={Colors.textOnPaper} />
        <Text style={styles.lockedTitle}>A letter from {formatUnlockDate(letter.createdAt?.toDate() ?? new Date())}</Text>
        <Text style={styles.lockedSub}>Opens {formatUnlockDate(letter.lockedUntil.toDate())}</Text>
        <Text style={styles.countdown}>{formatCountdown(letter.lockedUntil.toDate())}</Text>
      </View>
    );
  }

  return <UnlockedLetter letter={letter} width={width} height={height} justUnlocked={justUnlocked} />;
}

function UnlockedLetter({
  letter,
  width,
  height,
  justUnlocked,
}: {
  letter: FutureLetter;
  width: number;
  height: number;
  justUnlocked?: boolean;
}) {
  const rotateX = useSharedValue(justUnlocked ? -25 : 0);
  const opacity = useSharedValue(justUnlocked ? 0 : 1);
  const lines = letter.content.split('\n');
  const [visibleLines, setVisibleLines] = useState(justUnlocked ? 0 : lines.length);

  useEffect(() => {
    if (!justUnlocked) return;
    rotateX.value = withTiming(0, { duration: 650, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 500 });

    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleLines(i);
      if (i >= lines.length) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justUnlocked]);

  const style = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateX: `${rotateX.value}deg` }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.unlockedPage, { width, height }, style]}>
      <Text style={styles.unlockedLabel}>From {letter.addedByName}</Text>
      <Text style={styles.content}>{lines.slice(0, visibleLines).join('\n')}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lockedPage: {
    backgroundColor: Colors.paperWarm,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    transform: [{ perspective: 400 }, { rotateY: '2deg' }],
  },
  lockedTitle: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    color: Colors.textOnPaper,
    textAlign: 'center',
    marginTop: 16,
  },
  lockedSub: {
    ...Typography.bodyMuted,
    color: '#8C7B6B',
    marginTop: 8,
  },
  countdown: {
    ...Typography.label,
    color: '#8C7B6B',
    marginTop: 12,
  },
  unlockedPage: {
    backgroundColor: Colors.paperWarm,
    borderRadius: 6,
    padding: 22,
  },
  unlockedLabel: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 13,
    color: '#8C7B6B',
    marginBottom: 14,
  },
  content: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 19,
    lineHeight: 27,
    color: Colors.textHandwritten,
  },
});
