import { TextStyle } from 'react-native';
import { Colors } from './colors';

/**
 * Named text styles for the V2 design system. Prefer these over ad-hoc
 * fontFamily/fontSize combinations so type stays consistent across the app.
 */
export const Typography: Record<string, TextStyle> = {
  display: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0.3,
    color: Colors.gold,
  },
  displayLight: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0.2,
    fontStyle: 'italic',
    color: Colors.gold,
  },
  body: {
    fontFamily: 'System',
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0.1,
    color: Colors.textOnInk,
  },
  bodyMuted: {
    fontFamily: 'System',
    fontSize: 13,
    lineHeight: 19,
    letterSpacing: 0.1,
    color: Colors.textMuted,
  },
  handwritten: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 19,
    lineHeight: 26,
    color: Colors.textHandwritten,
  },
  handwrittenLarge: {
    fontFamily: 'Caveat_700Bold',
    fontSize: 24,
    lineHeight: 32,
    color: Colors.textHandwritten,
  },
  label: {
    fontFamily: 'System',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  labelGold: {
    fontFamily: 'System',
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  mono: {
    fontFamily: 'Courier New',
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: 6,
    color: Colors.gold,
  },
};
