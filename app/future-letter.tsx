import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { WaxSeal } from '@/components/WaxSeal';
import { createFutureLetter } from '@/lib/letters';
import { getLockPresets, formatUnlockDate } from '@/lib/timelocks';
import { friendlyErrorMessage } from '@/lib/errors';

const RULE_SPACING = 28;
const RULE_COUNT = 20;

export default function FutureLetterScreen() {
  const insets = useSafeAreaInsets();
  const { user, bookId } = useAuth();
  const { partner } = useBook(bookId, user?.uid);

  const [content, setContent] = useState('');
  const [unlockDate, setUnlockDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [sealError, setSealError] = useState<string | null>(null);

  const presets = getLockPresets();
  const selfName = user?.displayName || 'me';
  const salutation = partner ? `Dear ${selfName} & ${partner.name},` : `Dear us,`;

  const close = () => router.back();

  const pickDate = (date: Date) => {
    Haptics.selectionAsync().catch(() => {});
    setUnlockDate(date);
  };

  const onPickCustomDate = (_event: unknown, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) pickDate(date);
  };

  const seal = async () => {
    if (!user || !bookId || !unlockDate || !content.trim()) return;
    setSealing(true);
    setSealError(null);
    try {
      await createFutureLetter(bookId, user.uid, selfName, content, unlockDate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSealed(true);
      setTimeout(close, 1400);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setSealError(friendlyErrorMessage(err, "Couldn't seal this letter. Please try again."));
      setSealing(false);
    }
  };

  const canSeal = content.trim().length > 0 && !!unlockDate;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={close} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textOnPaper} />
        </Pressable>
        <Text style={styles.headerTitle}>Letter to future us</Text>
        <View style={styles.headerBtn} />
      </View>

      {sealed ? (
        <Animated.View entering={FadeIn} style={styles.sealedWrap}>
          <WaxSeal size={80} />
          <Text style={styles.sealedText}>
            Sealed until {unlockDate ? formatUnlockDate(unlockDate) : ''}
          </Text>
        </Animated.View>
      ) : (
        <>
          <View style={styles.paper}>
            {Array.from({ length: RULE_COUNT }).map((_, i) => (
              <View key={i} style={[styles.rule, { top: 70 + i * RULE_SPACING }]} />
            ))}
            <Text style={styles.salutation}>{salutation}</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              placeholder="Write something for whoever you'll be, later…"
              placeholderTextColor="rgba(74,55,40,0.4)"
              multiline
              style={styles.input}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.durationRow}>
              {presets.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => pickDate(p.date)}
                  style={[
                    styles.durationChip,
                    unlockDate?.getTime() === p.date.getTime() && styles.durationChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.durationChipText,
                      unlockDate?.getTime() === p.date.getTime() && styles.durationChipTextActive,
                    ]}
                  >
                    In {p.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setShowPicker(true)} style={styles.durationChip}>
                <Text style={styles.durationChipText}>Choose date</Text>
              </Pressable>
            </View>

            {unlockDate && (
              <Text style={styles.unlockPreview}>Opens {formatUnlockDate(unlockDate)}</Text>
            )}

            {showPicker && (
              <DateTimePicker
                value={presets[0].date}
                mode="date"
                minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
                onChange={onPickCustomDate}
                {...(Platform.OS === 'android' ? { display: 'default' } : {})}
              />
            )}

            {sealError && <Text style={styles.sealError}>{sealError}</Text>}

            <Pressable
              onPress={seal}
              disabled={!canSeal || sealing}
              style={[styles.sealBtn, !canSeal && styles.sealBtnDisabled]}
            >
              <WaxSeal size={64} />
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.paperWarm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.label, color: Colors.textMuted },
  paper: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  rule: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    height: 1,
    backgroundColor: '#2C1810',
    opacity: 0.06,
  },
  salutation: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 30,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    lineHeight: 28,
    color: Colors.textHandwritten,
    paddingBottom: 20,
  },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: 10,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(44,24,16,0.08)',
  },
  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Spacing.radiusPill,
    borderWidth: 1,
    borderColor: 'rgba(44,24,16,0.2)',
  },
  durationChipActive: {
    borderColor: Colors.goldDark,
    backgroundColor: 'rgba(201,169,110,0.15)',
  },
  durationChipText: {
    fontFamily: 'System',
    fontSize: 13,
    color: Colors.textOnPaper,
  },
  durationChipTextActive: {
    color: Colors.goldDark,
    fontWeight: '600',
  },
  unlockPreview: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 13,
    color: Colors.textMuted,
  },
  sealError: {
    fontFamily: 'System',
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
  },
  sealBtn: {
    alignSelf: 'center',
    marginTop: 6,
  },
  sealBtnDisabled: {
    opacity: 0.35,
  },
  sealedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
  },
  sealedText: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 18,
    color: Colors.textOnPaper,
  },
});
