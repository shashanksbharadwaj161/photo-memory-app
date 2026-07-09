import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface FieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
}

/** A warm dark input field that lights up gold on focus. */
export function Field({ label, icon, secure, style, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? Colors.gold : Colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          {...props}
          secureTextEntry={hidden}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, style]}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={Colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  label: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 7,
    marginLeft: 4,
    letterSpacing: 0.3,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.field,
    borderWidth: 1.5,
    borderColor: Colors.fieldBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
  },
  fieldFocused: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201,169,110,0.08)',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.textOnInk,
    height: '100%',
  },
});
