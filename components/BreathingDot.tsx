import React, { useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

interface BreathingDotProps {
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** A slow, breathing gold circle — our loading indicator (never a spinner). */
export function BreathingDot({ size = 16, color = Colors.gold, style }: BreathingDotProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.7 + progress.value * 0.45 }],
    opacity: 0.45 + progress.value * 0.55,
  }));

  return (
    <View style={[styles.wrap, style]}>
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
