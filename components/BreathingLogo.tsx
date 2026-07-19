import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Logo } from './Logo';

interface BreathingLogoProps {
  size?: number;
}

/**
 * The Locket mark, alive: a slow breath (scale) with a soft radial gold glow
 * that swells and fades in time with it. Used on the darkroom, the empty
 * book, and onboarding — the quiet heartbeat of the app.
 */
export function BreathingLogo({ size = 96 }: BreathingLogoProps) {
  const breath = useSharedValue(0);

  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, [breath]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breath.value * 0.04 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + breath.value * 0.5,
    transform: [{ scale: 1 + breath.value * 0.1 }],
  }));

  const halo = size * 2;

  return (
    <View style={{ width: halo, height: halo, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, haloStyle]} pointerEvents="none">
        <Svg width={halo} height={halo}>
          <Defs>
            <RadialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#C9A96E" stopOpacity={0.32} />
              <Stop offset="55%" stopColor="#C9A96E" stopOpacity={0.1} />
              <Stop offset="100%" stopColor="#C9A96E" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={halo / 2} cy={halo / 2} r={halo / 2} fill="url(#logoGlow)" />
        </Svg>
      </Animated.View>
      <Animated.View style={logoStyle}>
        <Logo size={size} />
      </Animated.View>
    </View>
  );
}
