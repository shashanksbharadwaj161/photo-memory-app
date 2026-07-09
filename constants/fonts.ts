/**
 * Central font-family constants. The string values must exactly match the
 * export names loaded in app/_layout.tsx via expo-font.
 */
export const Fonts = {
  serif: 'PlayfairDisplay_400Regular',
  serifBold: 'PlayfairDisplay_700Bold',
  serifItalic: 'PlayfairDisplay_400Regular_Italic',
  serifBoldItalic: 'PlayfairDisplay_700Bold_Italic',
  hand: 'Caveat_400Regular',
  handBold: 'Caveat_700Bold',
} as const;

export type FontName = keyof typeof Fonts;
