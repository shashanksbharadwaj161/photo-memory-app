import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';

interface GlassPanelProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  intensity?: number;
  /** 'gold' warms the sheen and border; 'neutral' stays quiet. */
  tone?: 'gold' | 'neutral';
  padded?: boolean;
}

/**
 * The app's frosted-glass surface: real blur (with the Android render path
 * enabled), a warm 1px gradient hairline, and a faint top-light sheen so the
 * panel reads as a physical pane sitting above the page — not a flat card.
 */
export function GlassPanel({
  children,
  style,
  radius = 22,
  intensity = 28,
  tone = 'neutral',
  padded = true,
}: GlassPanelProps) {
  const border = tone === 'gold' ? 'rgba(201,169,110,0.35)' : Colors.goldBorder;
  const sheen =
    tone === 'gold'
      ? (['rgba(232,200,126,0.14)', 'rgba(232,200,126,0.02)', 'rgba(0,0,0,0)'] as const)
      : (['rgba(245,239,224,0.09)', 'rgba(245,239,224,0.02)', 'rgba(0,0,0,0)'] as const);

  return (
    <View style={[styles.frame, { borderRadius: radius, borderColor: border }, style]}>
      <BlurView
        intensity={intensity}
        tint="dark"
        style={StyleSheet.absoluteFill}
        {...(Platform.OS === 'android'
          ? { experimentalBlurMethod: 'dimezisBlurView' as const }
          : {})}
      />
      {/* Fallback wash so the panel still reads on devices where blur is a no-op */}
      <View style={[StyleSheet.absoluteFill, styles.wash]} />
      <LinearGradient
        colors={sheen}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={padded ? styles.padded : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  wash: {
    backgroundColor: 'rgba(35,28,20,0.45)',
  },
  padded: {
    padding: 20,
  },
});
