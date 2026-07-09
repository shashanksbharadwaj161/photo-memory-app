import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Text as SvgText,
  G,
  TextPath,
} from 'react-native-svg';

interface StampProps {
  size?: number;
}

/** A decorative postage stamp — perforated gold border, aperture, "LOCKET". */
export function Stamp({ size = 74 }: StampProps) {
  // Build a perforated (scalloped) border by punching small circles around a rect.
  const teeth = 9;
  const holes: React.ReactNode[] = [];
  for (let i = 0; i <= teeth; i++) {
    const t = (i / teeth) * 100;
    holes.push(<Circle key={`t${i}`} cx={t} cy={0} r={2.2} fill="#1A1410" />);
    holes.push(<Circle key={`b${i}`} cx={t} cy={100} r={2.2} fill="#1A1410" />);
    holes.push(<Circle key={`l${i}`} cx={0} cy={t} r={2.2} fill="#1A1410" />);
    holes.push(<Circle key={`r${i}`} cx={100} cy={t} r={2.2} fill="#1A1410" />);
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="stampGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E8C87E" />
          <Stop offset="100%" stopColor="#A8883E" />
        </LinearGradient>
        <Path id="stampArc" d="M50 50 m -30 0 a 30 30 0 1 1 60 0" fill="none" />
      </Defs>

      {/* Stamp face */}
      <Path d="M6 6 H94 V94 H6 Z" fill="#FAF3E4" stroke="url(#stampGold)" strokeWidth={3} />

      {/* Inner border */}
      <Path d="M14 14 H86 V86 H14 Z" fill="none" stroke="#C9A96E" strokeWidth={1} strokeOpacity={0.6} />

      {/* Aperture emblem */}
      <Circle cx={50} cy={52} r={16} fill="none" stroke="#C9A96E" strokeWidth={2} />
      <Circle cx={50} cy={52} r={9} fill="none" stroke="#C9A96E" strokeWidth={1.3} strokeOpacity={0.7} />
      <Circle cx={50} cy={52} r={3.5} fill="#C9A96E" />
      {[0, 60, 120].map((a, i) => (
        <G key={i} rotation={a} origin="50, 52">
          <Path d="M50 36 L52.4 43 L47.6 43 Z" fill="#C9A96E" fillOpacity={0.4} />
        </G>
      ))}

      {/* Title arc */}
      <SvgText fill="#A8883E" fontSize={9} fontWeight="bold" letterSpacing={2} textAnchor="middle">
        <TextPath href="#stampArc" startOffset="50%">
          LOCKET
        </TextPath>
      </SvgText>

      {/* Country / value */}
      <SvgText x={50} y={82} fill="#A8883E" fontSize={6} fontWeight="bold" letterSpacing={1.5} textAnchor="middle">
        MEMORIES
      </SvgText>

      {holes}
    </Svg>
  );
}

interface PostmarkProps {
  size?: number;
}

/** A circular postmark — "SENT WITH LOVE" ringed around a small heart. */
export function Postmark({ size = 74 }: PostmarkProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" opacity={0.75}>
      <Defs>
        <Path id="postmarkTop" d="M50 50 m -34 0 a 34 34 0 1 1 68 0" fill="none" />
        <Path id="postmarkBottom" d="M50 50 m 34 0 a 34 34 0 1 1 -68 0" fill="none" />
      </Defs>
      <Circle cx={50} cy={50} r={44} fill="none" stroke="#8C5A3A" strokeWidth={2} strokeDasharray="2 2" />
      <Circle cx={50} cy={50} r={38} fill="none" stroke="#8C5A3A" strokeWidth={1.5} />
      <SvgText fill="#8C5A3A" fontSize={8} letterSpacing={2} textAnchor="middle">
        <TextPath href="#postmarkTop" startOffset="50%">
          SENT WITH
        </TextPath>
      </SvgText>
      <SvgText fill="#8C5A3A" fontSize={8} letterSpacing={2} textAnchor="middle">
        <TextPath href="#postmarkBottom" startOffset="50%">
          LOVE · LOCKET
        </TextPath>
      </SvgText>
      <Path
        d="M50 44 C47 39 40 40 40 46 C40 51 50 58 50 58 C50 58 60 51 60 46 C60 40 53 39 50 44 Z"
        fill="#8C5A3A"
      />
    </Svg>
  );
}
