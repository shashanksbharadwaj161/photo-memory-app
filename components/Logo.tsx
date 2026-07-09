import React from 'react';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, Ellipse } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

/**
 * The Locket mark — a gold locket with a subtle camera aperture nested inside.
 */
export function Logo({ size = 80 }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E8C87E" />
          <Stop offset="50%" stopColor="#C9A96E" />
          <Stop offset="100%" stopColor="#A8883E" />
        </LinearGradient>
        <LinearGradient id="innerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#2C1810" />
          <Stop offset="100%" stopColor="#1A1410" />
        </LinearGradient>
      </Defs>

      {/* Locket body — rounded shape with a hinge at the top */}
      <Path
        d="M50 15 C50 15 38 8 30 16 C22 24 22 34 22 34 L22 78 C22 84 27 88 34 88 L66 88 C73 88 78 84 78 78 L78 34 C78 34 78 24 70 16 C62 8 50 15 50 15Z"
        fill="url(#goldGrad)"
      />

      {/* Inner dark area — where the photo lives */}
      <Path
        d="M50 18 C50 18 40 12 33 19 C26 26 26 35 26 35 L26 75 C26 80 30 83 35 83 L65 83 C70 83 74 80 74 75 L74 35 C74 35 74 26 67 19 C60 12 50 18 50 18Z"
        fill="url(#innerGrad)"
      />

      {/* Camera aperture rings */}
      <Circle cx="50" cy="52" r="14" fill="none" stroke="#C9A96E" strokeWidth="1.5" strokeOpacity="0.6" />
      <Circle cx="50" cy="52" r="8" fill="none" stroke="#C9A96E" strokeWidth="1" strokeOpacity="0.4" />
      <Circle cx="50" cy="52" r="3" fill="#C9A96E" fillOpacity="0.7" />

      {/* Aperture blades */}
      {[0, 45, 90, 135].map((angle, i) => (
        <G key={i} rotation={angle} origin="50, 52">
          <Path d="M50 38 L52 44 L48 44 Z" fill="#C9A96E" fillOpacity="0.35" />
        </G>
      ))}

      {/* Hinge */}
      <Ellipse cx="50" cy="15" rx="6" ry="4" fill="#A8883E" />
      <Ellipse cx="50" cy="14" rx="4" ry="2.5" fill="#C9A96E" />

      {/* Chain link */}
      <Ellipse cx="50" cy="9" rx="3" ry="4" fill="none" stroke="#C9A96E" strokeWidth="1.5" />

      {/* Gold shine */}
      <Path
        d="M34 24 C36 20 42 17 48 18"
        fill="none"
        stroke="#F0DC9A"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.5"
      />
    </Svg>
  );
}
