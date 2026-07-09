import React, { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface PageFlipProps {
  children: React.ReactNode;
  play?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps a page and plays a gentle "cover opening" reveal — the page swings in
 * from the right with a slight rotation, then settles. Used for the book entry
 * animation and the "postcard just arrived" reveal.
 */
export function PageFlip({ children, play = true, style }: PageFlipProps) {
  const progress = useSharedValue(play ? 0 : 1);

  useEffect(() => {
    if (play) {
      progress.value = 0;
      progress.value = withSpring(1, { damping: 15, stiffness: 110, mass: 0.9 });
    } else {
      progress.value = withTiming(1, { duration: 1 });
    }
  }, [play, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { perspective: 1000 },
      { translateX: (1 - progress.value) * 60 },
      { rotateY: `${(1 - progress.value) * -14}deg` },
    ],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
