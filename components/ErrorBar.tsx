import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface ErrorBarProps {
  message: string;
  onRetry?: () => void;
  bottomInset?: number;
}

/** A warm, friendly inline error bar. Never shows raw error codes. */
export function ErrorBar({ message, onRetry, bottomInset = 24 }: ErrorBarProps) {
  return (
    <Animated.View
      entering={FadeInDown.springify()}
      exiting={FadeOutDown}
      style={[styles.wrap, { bottom: bottomInset }]}
    >
      <View style={styles.bar}>
        <Ionicons name="cloud-offline-outline" size={18} color={Colors.coral} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
        {onRetry && (
          <Pressable onPress={onRetry} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.6 }}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inkLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(232,115,90,0.35)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: {
    flex: 1,
    color: Colors.textOnInk,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  retry: {
    color: Colors.gold,
    fontFamily: Fonts.serifBold,
    fontSize: 14,
  },
});
