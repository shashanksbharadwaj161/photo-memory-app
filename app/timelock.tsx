import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { FilteredImage } from '@/components/FilteredImage';
import { GoldButton } from '@/components/GoldButton';
import { WaxSeal } from '@/components/WaxSeal';
import { BreathingDot } from '@/components/BreathingDot';
import { FilterSnapshot, getPhoto, deletePhoto, getUserProfile, PARTNER_COLORS } from '@/lib/book';
import { resolvePhotoFilter } from '@/lib/filters';
import { createTimeLock, getLockPresets, formatUnlockDate } from '@/lib/timelocks';

const MAX_MESSAGE = 140;
const DOT_COUNT = 14; // one dot per ~10 characters

interface Pending {
  uri: string;
  filterId: string;
  intensity: number;
  filterSnapshot?: FilterSnapshot;
  caption: string;
  existingPhotoId?: string;
}

export default function TimeLockScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const params = useLocalSearchParams<{
    source?: string;
    localUri?: string;
    filterId?: string;
    intensity?: string;
    caption?: string;
    filterSnapshot?: string;
    photoId?: string;
  }>();

  const [pending, setPending] = useState<Pending | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState(1);
  const [unlockDate, setUnlockDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [message, setMessage] = useState('');
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (params.source === 'existing' && params.photoId && bookId) {
        const photo = await getPhoto(bookId, params.photoId);
        if (!alive) return;
        if (!photo) {
          setNotFound(true);
          return;
        }
        setPending({
          uri: photo.url,
          filterId: photo.filterId,
          intensity: photo.intensity,
          filterSnapshot: photo.filterSnapshot,
          caption: photo.caption,
          existingPhotoId: photo.id,
        });
      } else if (params.localUri) {
        let snapshot: FilterSnapshot | undefined;
        if (params.filterSnapshot) {
          try {
            snapshot = JSON.parse(params.filterSnapshot);
          } catch {
            snapshot = undefined;
          }
        }
        setPending({
          uri: params.localUri,
          filterId: params.filterId ?? 'none',
          intensity: params.intensity ? Number(params.intensity) : 1,
          filterSnapshot: snapshot,
          caption: params.caption ?? '',
        });
      } else {
        setNotFound(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.source, params.photoId, params.localUri, bookId]);

  const presets = useMemo(() => getLockPresets(), []);
  const previewSize = Math.min(width - 64, 320);

  const close = () => router.back();

  const chooseDate = (date: Date) => {
    Haptics.selectionAsync().catch(() => {});
    setUnlockDate(date);
    setStep(3);
  };

  const onPickCustomDate = (_event: unknown, date?: Date) => {
    setShowPicker(Platform.OS === 'ios');
    if (date) chooseDate(date);
  };

  const seal = async () => {
    if (!pending || !user || !bookId || !unlockDate) return;
    setSealing(true);
    try {
      const profile = await getUserProfile(user.uid);
      await createTimeLock({
        bookId,
        uid: user.uid,
        displayName: user.displayName || profile?.displayName || 'Me',
        avatarColor: profile?.color || PARTNER_COLORS[0],
        photoUri: pending.uri,
        filterId: pending.filterId,
        intensity: pending.intensity,
        filterSnapshot: pending.filterSnapshot,
        caption: pending.caption,
        message,
        unlockDate,
      });

      // Moving an existing page into the capsule removes it from the visible
      // book — otherwise the "lock" would be pointless, since the partner
      // could already see it as a normal page.
      if (pending.existingPhotoId) {
        const photo = await getPhoto(bookId, pending.existingPhotoId);
        if (photo) await deletePhoto(bookId, photo);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSealed(true);
    } catch {
      setSealing(false);
    }
  };

  useEffect(() => {
    if (step === 4 && !sealing && !sealed) seal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (notFound) {
    return (
      <View style={styles.root}>
        <Header onClose={close} title="Lock in time" insetTop={insets.top} />
        <View style={styles.center}>
          <Text style={styles.missing}>We couldn't find that photo.</Text>
          <GoldButton label="Close" variant="ghost" onPress={close} style={{ marginTop: 18 }} />
        </View>
      </View>
    );
  }

  if (!pending) {
    return (
      <View style={styles.root}>
        <Header onClose={close} title="Lock in time" insetTop={insets.top} />
        <View style={styles.center}>
          <BreathingDot />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header onClose={close} title={`Step ${Math.min(step, 4)} of 4`} insetTop={insets.top} />

      {step === 1 && (
        <Animated.View entering={FadeIn} style={styles.centerFlex}>
          <Text style={styles.stepTitle}>A memory, waiting</Text>
          <FilteredImage
            uri={pending.uri}
            filterId={pending.filterId}
            intensity={pending.intensity}
            filter={resolvePhotoFilter(pending.filterId, pending.filterSnapshot)}
            radius={16}
            style={{ width: previewSize, height: previewSize * 1.2 }}
          />
          <GoldButton label="Choose when to open it" onPress={() => setStep(2)} style={styles.stepCta} />
        </Animated.View>
      )}

      {step === 2 && (
        <Animated.View entering={FadeIn} style={styles.centerFlex}>
          <Text style={styles.stepTitle}>When should this open?</Text>
          <View style={styles.cardsCol}>
            {presets.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => chooseDate(p.date)}
                style={[styles.durationCard, p.recommended && styles.durationCardRecommended]}
              >
                <Text style={styles.durationDate}>{formatUnlockDate(p.date)}</Text>
                <Text style={styles.durationSub}>In {p.label}{p.recommended ? ' · recommended' : ''}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowPicker(true)} style={styles.durationCard}>
              <Text style={styles.durationDate}>Choose a date</Text>
              <Text style={styles.durationSub}>Pick any day in the future</Text>
            </Pressable>
          </View>
          {showPicker && (
            <DateTimePicker
              value={presets[0].date}
              mode="date"
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
              onChange={onPickCustomDate}
              {...(Platform.OS === 'android' ? { display: 'default' } : {})}
            />
          )}
        </Animated.View>
      )}

      {step === 3 && unlockDate && (
        <Animated.View entering={FadeIn} style={styles.messageStep}>
          <Text style={[styles.stepTitle, { color: Colors.textOnPaper }]}>Leave a note</Text>
          <View style={styles.messageCard}>
            <TextInput
              value={message}
              onChangeText={(t) => setMessage(t.slice(0, MAX_MESSAGE))}
              placeholder="By the time you read this…"
              placeholderTextColor={Colors.textMuted}
              multiline
              style={styles.messageInput}
              autoFocus
            />
          </View>
          <View style={styles.dots}>
            {Array.from({ length: DOT_COUNT }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < Math.ceil(message.length / (MAX_MESSAGE / DOT_COUNT)) && styles.dotFilled,
                ]}
              />
            ))}
          </View>
          <Pressable onPress={() => setStep(4)} style={styles.sealBtn}>
            <WaxSeal size={64} />
          </Pressable>
          <Text style={styles.sealHint}>Seal this capsule</Text>
        </Animated.View>
      )}

      {step === 4 && unlockDate && (
        <SealAnimation
          uri={pending.uri}
          filterId={pending.filterId}
          intensity={pending.intensity}
          filterOverride={pending.filterSnapshot}
          unlockDate={unlockDate}
          done={sealed}
          onFinish={close}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function SealAnimation({
  uri,
  filterId,
  intensity,
  filterOverride,
  unlockDate,
  done,
  onFinish,
}: {
  uri: string;
  filterId: string;
  intensity: number;
  filterOverride?: FilterSnapshot;
  unlockDate: Date;
  done: boolean;
  onFinish: () => void;
}) {
  const photoScale = useSharedValue(1);
  const photoOpacity = useSharedValue(1);
  const sealScale = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    photoScale.value = withTiming(0.72, { duration: 500 });
    photoOpacity.value = withDelay(200, withTiming(0.55, { duration: 400 }));
    sealScale.value = withDelay(450, withSpring(1, { damping: 9, stiffness: 140 }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  useEffect(() => {
    if (done) {
      textOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
    }
  }, [done]);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: photoScale.value }],
    opacity: photoOpacity.value,
  }));
  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.centerFlex}>
      <View style={styles.sealStage}>
        <Animated.View style={photoStyle}>
          <FilteredImage
            uri={uri}
            filterId={filterId}
            intensity={intensity}
            filter={resolvePhotoFilter(filterId, filterOverride)}
            radius={16}
            style={{ width: 220, height: 260 }}
          />
        </Animated.View>
        <Animated.View style={[styles.sealOverlay, sealStyle]}>
          <WaxSeal size={90} />
        </Animated.View>
      </View>
      <Animated.View style={textStyle}>
        <Text style={styles.sealedText}>Sealed until {formatUnlockDate(unlockDate)}</Text>
        <GoldButton label="Done" onPress={onFinish} style={{ marginTop: 24 }} />
      </Animated.View>
    </View>
  );
}

function Header({ onClose, title, insetTop }: { onClose: () => void; title: string; insetTop: number }) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + 8 }]}>
      <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
        <Ionicons name="close" size={26} color={Colors.textOnInk} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerBtn} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.labelGold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerFlex: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  missing: { ...Typography.bodyMuted, fontSize: 16 },
  stepTitle: { ...Typography.displayLight, marginBottom: 22, textAlign: 'center' },
  stepCta: { marginTop: 28, alignSelf: 'stretch' },
  cardsCol: { alignSelf: 'stretch', gap: 14 },
  durationCard: {
    minHeight: 100,
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.radiusLg,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    paddingHorizontal: 22,
  },
  durationCardRecommended: {
    minHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    backgroundColor: Colors.surfaceRaised,
  },
  durationDate: { ...Typography.display, fontSize: 22 },
  durationSub: { ...Typography.bodyMuted, marginTop: 4 },
  messageStep: {
    flex: 1,
    backgroundColor: Colors.paperWarm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  messageCard: {
    alignSelf: 'stretch',
    minHeight: 160,
  },
  messageInput: {
    ...Typography.handwritten,
    fontSize: 20,
    lineHeight: 28,
    minHeight: 160,
    textAlignVertical: 'top',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    marginBottom: 30,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    borderWidth: 1,
    borderColor: Colors.goldDark,
  },
  dotFilled: {
    backgroundColor: Colors.goldDark,
  },
  sealBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealHint: {
    ...Typography.label,
    marginTop: 10,
    color: Colors.textMuted,
  },
  sealStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealOverlay: {
    position: 'absolute',
  },
  sealedText: {
    ...Typography.displayLight,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 30,
  },
});
