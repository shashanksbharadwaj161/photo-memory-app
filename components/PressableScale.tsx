import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Haptic fired on press-down. Defaults to a light tick. */
  haptic?: 'light' | 'medium' | 'none';
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  hitSlop?: number;
}

/**
 * The app-wide tap feel: every press sinks to ~0.96 with a spring and a light
 * haptic tick, then settles back. Wrap anything tappable in this instead of a
 * bare Pressable so the whole app shares one physical language.
 */
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  haptic = 'light',
  scaleTo = 0.96,
  style,
  hitSlop,
}: PressableScaleProps) {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + (scaleTo - 1) * pressed.value },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => {
        pressed.value = withSpring(1, { damping: 20, stiffness: 400 });
        if (haptic !== 'none') {
          Haptics.impactAsync(
            haptic === 'medium'
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Light
          ).catch(() => {});
        }
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, { damping: 16, stiffness: 300 });
      }}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}
