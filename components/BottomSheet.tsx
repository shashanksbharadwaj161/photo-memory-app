import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({ visible, onClose, title, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.anchor} pointerEvents="box-none">
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(180)}
          style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}
        >
          <View style={styles.handle} />
          {title && <Text style={styles.title}>{title}</Text>}
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface SheetActionProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  subtitle?: string;
}

export function SheetAction({ icon, label, onPress, danger, subtitle }: SheetActionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
    >
      <Ionicons name={icon} size={22} color={danger ? Colors.coral : Colors.gold} />
      <View style={styles.actionText}>
        <Text style={[styles.actionLabel, danger && { color: Colors.coral }]}>{label}</Text>
        {subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  anchor: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.inkLight,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '82%',
    borderTopWidth: 1,
    borderColor: Colors.separator,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.separator,
    marginBottom: 14,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    color: Colors.textOnInk,
    marginBottom: 12,
    marginLeft: 4,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionPressed: {
    backgroundColor: Colors.glassLight,
  },
  actionText: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    color: Colors.textOnInk,
  },
  actionSubtitle: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
