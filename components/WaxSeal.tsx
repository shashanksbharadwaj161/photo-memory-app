import React from 'react';
import Svg, { Circle, Polygon, Path } from 'react-native-svg';

interface WaxSealProps {
  size?: number;
}

/** A small red wax-seal medallion with a gold octagonal border. */
export function WaxSeal({ size = 64 }: WaxSealProps) {
  // An 8-point star polygon approximating an octagonal wax edge.
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 48 : 42;
    const x = 50 + r * Math.cos(angle);
    const y = 50 + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={points} fill="#C9A96E" />
      <Circle cx="50" cy="50" r="38" fill="#C41E3A" />
      <Circle cx="50" cy="50" r="38" fill="none" stroke="#A8162C" strokeWidth="1.5" opacity={0.6} />
      {/* A simple locket glyph pressed into the wax */}
      <Path
        d="M50 34 C50 34 43 29 38 34 C33 39 33 45 33 45 L33 62 C33 66 36 69 40 69 L60 69 C64 69 67 66 67 62 L67 45 C67 45 67 39 62 34 C57 29 50 34 50 34Z"
        fill="none"
        stroke="#E8B0B0"
        strokeWidth="2"
        opacity={0.85}
      />
      <Circle cx="50" cy="52" r="6" fill="none" stroke="#E8B0B0" strokeWidth="1.5" opacity={0.85} />
    </Svg>
  );
}
