import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useCamera } from '@/hooks/useCamera';
import { useFilters } from '@/hooks/useFilters';
import { FilterStrip } from '@/components/FilterStrip';
import { FilteredImage } from '@/components/FilteredImage';
import { Slider } from '@/components/Slider';
import { GoldButton } from '@/components/GoldButton';
import { Logo } from '@/components/Logo';
import { getUserProfile, addPhotoToBook, PARTNER_COLORS } from '@/lib/book';

const FLASH_ICON = {
  off: 'flash-off-outline',
  on: 'flash',
  auto: 'flash-outline',
} as const;

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const camera = useCamera();
  const filters = useFilters();
  const cameraRef = useRef<CameraView>(null);

  const [captured, setCaptured] = useState<{ uri: string; width: number; height: number } | null>(
    null
  );
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [active, setActive] = useState(true);

  // Only mount the camera while the tab is focused (frees the sensor otherwise).
  useFocusEffect(
    React.useCallback(() => {
      setActive(true);
      return () => setActive(false);
    }, [])
  );

  const previewHeight = Math.round(height * 0.62);

  // ── Permission gate ────────────────────────────────────────
  if (!camera.permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }
  if (!camera.permission.granted) {
    return (
      <View style={[styles.center, { padding: 32 }]}>
        <Logo size={72} />
        <Text style={styles.permTitle}>Let’s open the camera</Text>
        <Text style={styles.permBody}>
          Locket needs camera access so you can capture moments straight into your shared book.
        </Text>
        <GoldButton
          label="Enable camera"
          onPress={camera.requestPermission}
          style={{ marginTop: 22, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  // ── Capture ────────────────────────────────────────────────
  const takePhoto = async () => {
    if (!cameraRef.current || camera.capturing) return;
    camera.setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo) {
        setCaptured({ uri: photo.uri, width: photo.width, height: photo.height });
      }
    } catch {
      // ignore — user can retry
    } finally {
      camera.setCapturing(false);
    }
  };

  const importFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setCaptured({ uri: a.uri, width: a.width ?? 0, height: a.height ?? 0 });
    }
  };

  const discard = () => {
    setCaptured(null);
    setCaption('');
    filters.reset();
  };

  const addToBook = async () => {
    if (!captured || !user || !bookId) return;
    setSaving(true);
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
        caption: caption.trim(),
        uid: user.uid,
        displayName: user.displayName || profile?.displayName || 'Me',
        avatarColor: profile?.color || PARTNER_COLORS[0],
        width: full.width,
        height: full.height,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        discard();
      }, 1100);
    } catch {
      setSaving(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Preview / edit mode ────────────────────────────────────
  if (captured) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.previewHeader}>
          <Pressable onPress={discard} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="close" size={26} color={Colors.textOnInk} />
          </Pressable>
          <Text style={styles.headerTitle}>New memory</Text>
          <View style={styles.headerBtn} />
        </View>

        <Animated.View entering={FadeIn} style={styles.previewArea}>
          <FilteredImage
            uri={captured.uri}
            filterId={filters.selectedId}
            intensity={filters.intensity}
            radius={16}
            style={{ width: width - 40, height: previewHeight }}
          />
        </Animated.View>

        <View style={styles.editControls}>
          <FilterStrip selectedId={filters.selectedId} onSelect={filters.select} />
          {filters.selectedId !== 'none' && (
            <View style={styles.sliderRow}>
              <Ionicons name="contrast-outline" size={16} color={Colors.textMuted} />
              <View style={styles.sliderFlex}>
                <Slider value={filters.intensity} onChange={filters.setIntensity} />
              </View>
              <Text style={styles.sliderPct}>{Math.round(filters.intensity * 100)}%</Text>
            </View>
          )}

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Say something…"
            placeholderTextColor={Colors.textMuted}
            style={styles.captionInput}
            maxLength={140}
            multiline
          />

          <View style={[styles.actionRow, { paddingBottom: insets.bottom + 10 }]}>
            <GoldButton label="Discard" variant="ghost" onPress={discard} style={styles.actionBtn} />
            <GoldButton
              label="Add to Book"
              icon="add"
              onPress={addToBook}
              loading={saving}
              style={styles.actionBtn}
            />
          </View>
        </View>

        {success && (
          <Animated.View entering={ZoomIn} style={styles.successOverlay} pointerEvents="none">
            <View style={styles.successBadge}>
              <Ionicons name="checkmark" size={48} color={Colors.ink} />
            </View>
            <Text style={styles.successText}>Added to your book</Text>
          </Animated.View>
        )}
      </View>
    );
  }

  // ── Live camera mode ───────────────────────────────────────
  const tint = filters.selected.tintForThumbnail;
  return (
    <View style={styles.root}>
      <View style={[styles.viewfinder, { height: previewHeight, marginTop: insets.top + 6 }]}>
        {active && (
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={camera.facing}
            flash={camera.flash}
            onCameraReady={() => camera.setReady(true)}
          />
        )}
        {/* Live filter approximation — a soft tint + vignette over the preview */}
        {tint !== 'transparent' && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} pointerEvents="none" />
        )}
        <View style={styles.vignetteEdge} pointerEvents="none" />

        <Pressable onPress={camera.cycleFlash} style={[styles.flashBtn, { top: 14 }]} hitSlop={8}>
          <Ionicons name={FLASH_ICON[camera.flash]} size={22} color={Colors.paper} />
        </Pressable>
        <Text style={styles.liveFilterName}>{filters.selected.name}</Text>
      </View>

      <View style={styles.strip}>
        <FilterStrip selectedId={filters.selectedId} onSelect={filters.select} />
      </View>

      <View style={[styles.controls, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable onPress={importFromGallery} style={styles.sideBtn} hitSlop={10}>
          <Ionicons name="images-outline" size={26} color={Colors.gold} />
        </Pressable>

        <Pressable onPress={takePhoto} disabled={camera.capturing}>
          {({ pressed }) => (
            <View style={[styles.captureOuter, pressed && { transform: [{ scale: 0.94 }] }]}>
              <View style={styles.captureInner}>
                {camera.capturing && <ActivityIndicator color={Colors.ink} />}
              </View>
            </View>
          )}
        </Pressable>

        <Pressable onPress={camera.toggleFacing} style={styles.sideBtn} hitSlop={10}>
          <Ionicons name="camera-reverse-outline" size={28} color={Colors.gold} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  center: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 24,
    color: Colors.textOnInk,
    marginTop: 20,
  },
  permBody: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  viewfinder: {
    marginHorizontal: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  vignetteEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 40,
    borderColor: 'rgba(0,0,0,0.18)',
  },
  flashBtn: {
    position: 'absolute',
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveFilterName: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    fontFamily: Fonts.hand,
    fontSize: 22,
    color: Colors.paper,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  strip: {
    marginTop: 6,
  },
  controls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.inkLight,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  captureOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 5,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview mode
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 18,
    color: Colors.textOnInk,
  },
  previewArea: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  editControls: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 2,
  },
  sliderFlex: {
    flex: 1,
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
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  actionBtn: {
    flex: 1,
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
