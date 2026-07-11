import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

interface RadialBackdropProps {
  /** An optional very-subtle seasonal wash, e.g. 'rgba(200,232,176,0.04)'. */
  seasonTint?: string;
}

/**
 * The book's background: a soft radial gradient (warmer center, cooler edges)
 * so the dark background never reads as flat black, plus an optional faint
 * seasonal tint layered on top.
 */
export function RadialBackdrop({ seasonTint }: RadialBackdropProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="40%" rx="75%" ry="65%">
            <Stop offset="0%" stopColor="#1E1812" stopOpacity={1} />
            <Stop offset="100%" stopColor="#161008" stopOpacity={1} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
      </Svg>
      {seasonTint && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: seasonTint }]} />
      )}
    </View>
  );
}
