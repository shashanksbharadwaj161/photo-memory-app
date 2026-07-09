import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface PaperCardProps {
  children: React.ReactNode;
  rotate?: number; // degrees, for the "tossed on a table" feel
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** A warm cream card with a soft paper shadow, sitting on the dark background. */
export function PaperCard({ children, rotate = 0, style, padded = true }: PaperCardProps) {
  return (
    <View
      style={[
        styles.card,
        padded && styles.padded,
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paper,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  padded: {
    padding: 16,
  },
});
