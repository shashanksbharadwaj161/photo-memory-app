import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  ZoomIn,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Typography } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/hooks/useFilters';
import { FilterStrip } from '@/components/FilterStrip';
import { FilteredImage } from '@/components/FilteredImage';
import { Slider } from '@/components/Slider';
import { GoldButton } from '@/components/GoldButton';
import { BreathingDot } from '@/components/BreathingDot';
import { BreathingLogo } from '@/components/BreathingLogo';
import { GlassPanel } from '@/components/GlassPanel';
import { PressableScale } from '@/components/PressableScale';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getUserProfile, addPhotoToBook, PARTNER_COLORS } from '@/lib/book';
import {
  isClaudeAvailable,
  suggestCaption,
  finishSentence,
  saveCaptionToHistory,
  getCaptionHistory,
} from '@/lib/claude';
import { friendlyErrorMessage } from '@/lib/errors';

function timeOfDayLabel(): string {
  const h = new Date().getHours();
  if (h < 6) return 'late night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  if (h < 21) return 'evening';
  return 'night';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'The quiet hours.';
  if (h < 12) return 'What does this morning look like?';
  if (h < 17) return 'What does today look like?';
  if (h < 21) return 'Hold on to this evening.';
  return 'Before the day slips away.';
}

function ApertureStar({ size = 20, color = Colors.ink }: { size?: number; color?: string }) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI / 6) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 48 : 26;
    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
  }).join(' ');
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Polygon points={points} fill={color} />
    </Svg>
  );
}

/** Wrapped in an ErrorBoundary so any crash shows a fallback, never a blank screen. */
export default function CameraScreen() {
  return (
    <ErrorBoundary name="darkroom">
      <DarkroomInner />
    </ErrorBoundary>
  );
}

function DarkroomInner() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const filters = useFilters();

  const [captured, setCaptured] = useState<{ uri: string; width: number; height: number } | null>(
    null
  );
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [claudeOn, setClaudeOn] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [showFinish, setShowFinish] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [permissionNote, setPermissionNote] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const developY = useSharedValue(80);
  const developStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: developY.value }],
  }));

  useEffect(() => {
    isClaudeAvailable().then(setClaudeOn).catch(() => {});
  }, []);

  const receivePhoto = (asset: ImagePicker.ImagePickerAsset) => {
    developY.value = 80;
    setCaptured({ uri: asset.uri, width: asset.width ?? 0, height: asset.height ?? 0 });
    developY.value = withSpring(0, { damping: 12, stiffness: 130, mass: 0.8 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  };

  // ── Capture via the NATIVE camera app (works on every Android device) ──
  const capture = async () => {
    setPermissionNote(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPermissionNote(
          'Camera access is off. You can allow it in your phone settings, or import from your gallery below.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.9, exif: false });
      if (!result.canceled && result.assets?.[0]) receivePhoto(result.assets[0]);
    } catch (err) {
      setPermissionNote(friendlyErrorMessage(err, "The camera couldn't open. Try importing instead."));
    }
  };

  const importFromGallery = async () => {
    setPermissionNote(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPermissionNote('Photo access is off. You can allow it in your phone settings.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (!result.canceled && result.assets?.[0]) receivePhoto(result.assets[0]);
    } catch (err) {
      setPermissionNote(friendlyErrorMessage(err, "Couldn't open your gallery. Please try again."));
    }
  };

  const discard = () => {
    setCaptured(null);
    setCaption('');
    setShowFinish(false);
    setUploadError(null);
    filters.reset();
  };

  const buildFilterSnapshot = () =>
    filters.isCustom
      ? {
          matrix: filters.selected.matrix,
          grainOpacity: filters.selected.grainOpacity,
          vignetteOpacity: filters.selected.vignetteOpacity,
          vignetteColor: filters.selected.vignetteColor,
        }
      : undefined;

  const openTimeLock = () => {
    if (!captured) return;
    const snapshot = buildFilterSnapshot();
    router.push({
      pathname: '/timelock',
      params: {
        source: 'fresh',
        localUri: captured.uri,
        filterId: filters.selectedId,
        intensity: String(filters.intensity),
        caption,
        filterSnapshot: snapshot ? JSON.stringify(snapshot) : '',
      },
    } as any);
  };

  const openFilterBuilder = () => {
    router.push({
      pathname: '/filter-builder',
      params: captured ? { previewUri: captured.uri } : {},
    } as any);
  };

  const doSuggestCaption = async () => {
    setSuggesting(true);
    try {
      const history = await getCaptionHistory();
      const text = await suggestCaption(
        'a moment just captured together',
        timeOfDayLabel(),
        filters.selected?.name || 'Original',
        history
      );
      if (text) setCaption(text);
    } catch {
      // Claude is a nice-to-have — stay silent.
    } finally {
      setSuggesting(false);
    }
  };

  const doFinishSentence = async () => {
    setSuggesting(true);
    setShowFinish(false);
    try {
      const history = await getCaptionHistory();
      const text = await finishSentence(caption, history);
      if (text) setCaption(text);
    } catch {
      // silent
    } finally {
      setSuggesting(false);
    }
  };

  const onChangeCaption = (text: string) => {
    setCaption(text);
    setShowFinish(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const trimmed = text.trim();
      const lastChar = trimmed.slice(-1);
      const endsWithPunctuation = ['.', '!', '?', '…', ','].includes(lastChar);
      if (claudeOn && trimmed.length > 5 && !endsWithPunctuation) setShowFinish(true);
    }, 800);
  };

  const addToBook = async () => {
    if (!captured || !user || !bookId) return;
    setSaving(true);
    setUploadError(null);
    try {
      const full = await ImageManipulator.manipulateAsync(
        captured.uri,
        [{ resize: { width: Math.min(1440, captured.width || 1440) } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      const thumb = await ImageManipulator.manipulateAsync(
        captured.uri,
        [{ resize: { width: 420 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const profile = await getUserProfile(user.uid);
      await addPhotoToBook({
        bookId,
        localUri: full.uri,
        thumbnailUri: thumb.uri,
        filterId: filters.selectedId,
        intensity: filters.intensity,
        filterSnapshot: buildFilterSnapshot(),
        caption: caption.trim(),
        uid: user.uid,
        displayName: user.displayName || profile?.displayName || 'Me',
        avatarColor: profile?.color || PARTNER_COLORS[0],
        width: full.width,
        height: full.height,
      });
      if (caption.trim()) saveCaptionToHistory(caption.trim()).catch(() => {});

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        discard();
      }, 1100);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setUploadError(friendlyErrorMessage(err, "Couldn't add this to your book. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  // ═══ DEVELOPMENT ROOM — a photo is on the table ═══════════════
  if (captured) {
    const photoHeight = Math.min(height * 0.46, width * 1.1);
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <RadialBackdrop />
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.devHeader}>
            <PressableScale onPress={discard} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color={Colors.textOnInk} />
            </PressableScale>
            <View style={styles.devTitleWrap}>
              <Text style={styles.devLabel}>THE DARKROOM</Text>
              <Text style={styles.devTitle}>Developing…</Text>
            </View>
            <PressableScale onPress={openTimeLock} hitSlop={10} style={styles.headerBtn}>
              <Ionicons name="lock-closed-outline" size={21} color={Colors.gold} />
            </PressableScale>
          </View>

          <Animated.View style={[styles.devPhotoWrap, developStyle]}>
            <FilteredImage
              uri={captured.uri}
              filterId={filters.selectedId}
              filter={filters.selected}
              intensity={filters.intensity}
              radius={18}
              style={{ width: width - 36, height: photoHeight }}
            />
            {/* Warm lamp falloff over the print */}
            <LinearGradient
              colors={['rgba(232,200,126,0.07)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.22)']}
              style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
              pointerEvents="none"
            />
          </Animated.View>

          <View style={styles.devControls}>
            <FilterStrip
              selectedId={filters.selectedId}
              onSelect={filters.select}
              onLongPress={openFilterBuilder}
            />
            {filters.selectedId !== 'none' && (
              <View style={styles.sliderRow}>
                <Ionicons name="contrast-outline" size={16} color={Colors.textMuted} />
                <View style={{ flex: 1 }}>
                  <Slider value={filters.intensity} onChange={filters.setIntensity} />
                </View>
                <Text style={styles.sliderPct}>{Math.round(filters.intensity * 100)}%</Text>
              </View>
            )}

            <TextInput
              value={caption}
              onChangeText={onChangeCaption}
              placeholder="Say something…"
              placeholderTextColor={Colors.textMuted}
              style={styles.captionInput}
              maxLength={140}
              multiline
            />

            <View style={styles.aiRow}>
              {claudeOn && !suggesting && (
                <Pressable onPress={doSuggestCaption} hitSlop={6}>
                  <Text style={styles.aiHint}>✦ Suggest</Text>
                </Pressable>
              )}
              {showFinish && !suggesting && (
                <Pressable onPress={doFinishSentence} hitSlop={6}>
                  <Text style={styles.aiHint}>✦ Finish</Text>
                </Pressable>
              )}
              {suggesting && <ActivityIndicator size="small" color={Colors.gold} />}
            </View>

            {uploadError && <Text style={styles.uploadError}>{uploadError}</Text>}

            <View style={styles.actionRow}>
              <GoldButton
                label="Discard"
                variant="ghost"
                onPress={discard}
                disabled={saving}
                style={{ flex: 1 }}
              />
              <GoldButton
                label="Add to Book"
                icon="add"
                onPress={addToBook}
                loading={saving}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </ScrollView>

        {saving && (
          <View style={styles.savingOverlay} pointerEvents="none">
            <BreathingDot />
            <Text style={styles.savingText}>Adding to your book…</Text>
          </View>
        )}

        {success && (
          <Animated.View entering={ZoomIn} style={styles.successOverlay} pointerEvents="none">
            <View style={styles.successBadge}>
              <Ionicons name="checkmark" size={48} color={Colors.ink} />
            </View>
            <Text style={styles.successText}>Added to your book</Text>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    );
  }

  // ═══ THE DARKROOM — waiting for light ═════════════════════════
  return (
    <View style={styles.root}>
      <RadialBackdrop />
      {/* A faint amber lamp from the top — the darkroom safelight */}
      <LinearGradient
        colors={['rgba(232,200,126,0.09)', 'rgba(0,0,0,0)']}
        style={styles.lamp}
        pointerEvents="none"
      />

      <View style={[styles.darkroom, { paddingTop: insets.top + 24 }]}>
        <Animated.View entering={FadeIn.duration(600)} style={styles.darkroomHeart}>
          <BreathingLogo size={88} />
          <Text style={styles.darkroomLabel}>THE DARKROOM</Text>
          <Text style={styles.darkroomTitle}>{greeting()}</Text>
        </Animated.View>

        <View style={styles.actionsCol}>
          <PressableScale onPress={capture} haptic="medium">
            <GlassPanel tone="gold" style={styles.actionCard}>
              <View style={styles.actionInner}>
                <View style={styles.actionIconGold}>
                  <ApertureStar size={22} color={Colors.ink} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Capture</Text>
                  <Text style={styles.actionSub}>Open your camera</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.gold} />
              </View>
            </GlassPanel>
          </PressableScale>

          <PressableScale onPress={importFromGallery}>
            <GlassPanel style={styles.actionCard}>
              <View style={styles.actionInner}>
                <View style={styles.actionIconGhost}>
                  <Ionicons name="images-outline" size={22} color={Colors.gold} />
                </View>
                <View style={styles.actionTextWrap}>
                  <Text style={styles.actionTitle}>Import</Text>
                  <Text style={styles.actionSub}>Bring one from your gallery</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </GlassPanel>
          </PressableScale>

          {permissionNote && <Text style={styles.permissionNote}>{permissionNote}</Text>}
        </View>

        <Text style={[styles.footerHint, { marginBottom: insets.bottom + 18 }]}>
          Thirteen films, and any you build yourself, are waiting.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  lamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  // Darkroom idle
  darkroom: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 26,
  },
  darkroomHeart: {
    alignItems: 'center',
    marginTop: 14,
  },
  darkroomLabel: {
    ...Typography.label,
    letterSpacing: 3,
    marginTop: 6,
  },
  darkroomTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 24,
    lineHeight: 33,
    color: Colors.textOnInk,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  actionsCol: {
    alignSelf: 'stretch',
    gap: 14,
  },
  actionCard: {
    alignSelf: 'stretch',
  },
  actionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionIconGold: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconGhost: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 19,
    color: Colors.textOnInk,
  },
  actionSub: {
    ...Typography.bodyMuted,
    marginTop: 2,
  },
  permissionNote: {
    ...Typography.bodyMuted,
    color: Colors.coral,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  footerHint: {
    fontFamily: Fonts.hand,
    fontSize: 17,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  // Development room
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devTitleWrap: {
    alignItems: 'center',
  },
  devLabel: {
    ...Typography.label,
    fontSize: 9,
    letterSpacing: 2.5,
  },
  devTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.gold,
    marginTop: 1,
  },
  devPhotoWrap: {
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  devControls: {
    marginTop: 14,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 2,
  },
  sliderPct: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.textMuted,
    width: 42,
    textAlign: 'right',
  },
  captionInput: {
    marginHorizontal: 24,
    marginTop: 12,
    minHeight: 44,
    maxHeight: 90,
    fontFamily: Fonts.hand,
    fontSize: 22,
    color: Colors.textOnInk,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    paddingBottom: 6,
  },
  aiRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 24,
    marginTop: 8,
    minHeight: 16,
    alignItems: 'center',
  },
  aiHint: {
    ...Typography.labelGold,
  },
  uploadError: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.error,
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  savingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlay,
    gap: 14,
  },
  savingText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: Colors.textOnInk,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.overlay,
  },
  successBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 20,
    color: Colors.paper,
    marginTop: 18,
  },
});
