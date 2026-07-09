import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Variant = 'gold' | 'ghost' | 'dark';

interface GoldButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function GoldButton({
  label,
  onPress,
  variant = 'gold',
  disabled,
  loading,
  icon,
  style,
  textStyle,
}: GoldButtonProps) {
  const isDisabled = disabled || loading;
  const contentColor =
    variant === 'gold' ? Colors.ink : variant === 'dark' ? Colors.textOnInk : Colors.gold;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'gold' && styles.gold,
        variant === 'ghost' && styles.ghost,
        variant === 'dark' && styles.dark,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={18} color={contentColor} style={styles.icon} />}
          <Text style={[styles.label, { color: contentColor }, textStyle]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  gold: {
    backgroundColor: Colors.gold,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.fieldBorder,
  },
  dark: {
    backgroundColor: Colors.inkLight,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontFamily: Fonts.serifBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
});
