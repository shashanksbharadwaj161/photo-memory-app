import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';

interface VignetteProps {
  color: string;
  opacity: number; // peak edge opacity (0..1)
}

/** A true radial vignette that darkens the corners of a photo. */
export function Vignette({ color, opacity }: VignetteProps) {
  if (opacity <= 0) return null;
  const clamped = Math.max(0, Math.min(1, opacity));
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <RadialGradient id="vignette" cx="50%" cy="50%" rx="75%" ry="75%">
          <Stop offset="0%" stopColor={color} stopOpacity={0} />
          <Stop offset="55%" stopColor={color} stopOpacity={0} />
          <Stop offset="100%" stopColor={color} stopOpacity={clamped} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vignette)" />
    </Svg>
  );
}
