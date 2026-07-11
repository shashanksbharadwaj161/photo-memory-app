import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { FilterDefinition } from '@/constants/filters';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import { savePreset } from '@/lib/presets';
import { friendlyErrorMessage } from '@/lib/errors';
import { PARTNER_COLORS, getUserProfile } from '@/lib/book';
import {
  subscribeToFilterSession,
  pushFilterSession,
  clearFilterSessionDragging,
  FilterSessionState,
} from '@/lib/filterSessions';
import { FilteredImage } from '@/components/FilteredImage';
import { Slider } from '@/components/Slider';
import { GoldButton } from '@/components/GoldButton';
import { PartnerAvatar } from '@/components/PartnerAvatar';
import { BottomSheet } from '@/components/BottomSheet';

const TINTS: { id: string; label: string; color: string; delta: [number, number, number] }[] = [
  { id: 'none', label: 'None', color: '#3A3020', delta: [0, 0, 0] },
  { id: 'warm', label: 'Warm', color: '#E8A85C', delta: [0.08, 0.02, -0.05] },
  { id: 'cool', label: 'Cool', color: '#7CA8D8', delta: [-0.05, 0.0, 0.08] },
  { id: 'green', label: 'Green', color: '#8CC888', delta: [-0.03, 0.08, -0.03] },
  { id: 'pink', label: 'Pink', color: '#E89CB8', delta: [0.08, 0.0, 0.04] },
  { id: 'purple', label: 'Purple', color: '#B08CD8', delta: [0.05, 0.0, 0.08] },
];

interface Recipe {
  warmth: number; // -1..1
  brightness: number; // -1..1
  contrast: number; // -1..1
  fade: number; // 0..1
  grain: number; // 0..1
  tintStrength: number; // 0..1
  tintId: string;
}

const DEFAULT_RECIPE: Recipe = {
  warmth: 0,
  brightness: 0,
  contrast: 0,
  fade: 0,
  grain: 0,
  tintStrength: 0,
  tintId: 'none',
};

function tintOf(id: string) {
  return TINTS.find((t) => t.id === id) ?? TINTS[0];
}

export function buildMatrix(recipe: Recipe): number[] {
  const brightScale = 1 + recipe.brightness * 0.4;
  const contrastScale = 1 + recipe.contrast * 0.3;
  const contrastOffset = (1 - contrastScale) * 0.5;
  const fadeOffset = recipe.fade * 0.12;
  const [dr, dg, db] = tintOf(recipe.tintId).delta.map((d) => d * recipe.tintStrength);

  const rScale = brightScale * contrastScale + recipe.warmth * 0.15;
  const gScale = brightScale * contrastScale;
  const bScale = brightScale * contrastScale - recipe.warmth * 0.15;

  return [
    rScale, 0, 0, 0, contrastOffset + fadeOffset + dr,
    0, gScale, 0, 0, contrastOffset + fadeOffset + dg,
    0, 0, bScale, 0, contrastOffset + fadeOffset + db,
    0, 0, 0, 1, 0,
  ];
}

function bipolarLabel(v: number, labels: [string, string, string, string, string]): string {
  if (v <= -0.6) return labels[0];
  if (v <= -0.15) return labels[1];
  if (v < 0.15) return labels[2];
  if (v < 0.6) return labels[3];
  return labels[4];
}
function unipolarLabel(v: number, labels: [string, string, string, string]): string {
  if (v < 0.1) return labels[0];
  if (v < 0.4) return labels[1];
  if (v < 0.7) return labels[2];
  return labels[3];
}

const SLIDER_META = {
  warmth: { title: 'Warmth', label: (v: number) => bipolarLabel(v, ['Very cool', 'Cool', 'Neutral', 'Warm', 'Very warm']) },
  brightness: { title: 'Brightness', label: (v: number) => bipolarLabel(v, ['Much darker', 'Darker', 'Neutral', 'Brighter', 'Much brighter']) },
  contrast: { title: 'Contrast', label: (v: number) => bipolarLabel(v, ['Very flat', 'Soft', 'Neutral', 'Punchy', 'Very punchy']) },
  fade: { title: 'Fade', label: (v: number) => unipolarLabel(v, ['None', 'Slight fade', 'Faded', 'Heavily faded']) },
  grain: { title: 'Grain', label: (v: number) => unipolarLabel(v, ['Clean', 'Fine grain', 'Grainy', 'Heavy grain']) },
  tintStrength: { title: 'Tint', label: (v: number) => unipolarLabel(v, ['Off', 'Subtle', 'Noticeable', 'Strong']) },
} as const;

type SliderKey = keyof typeof SLIDER_META;
const BIPOLAR: SliderKey[] = ['warmth', 'brightness', 'contrast'];

export default function FilterBuilderScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { photos, partner } = useBook(bookId, user?.uid);
  const params = useLocalSearchParams<{ previewUri?: string }>();

  const [recipe, setRecipe] = useState<Recipe>(DEFAULT_RECIPE);
  const [together, setTogether] = useState(false);
  const [session, setSession] = useState<FilterSessionState | null>(null);
  const [showSave, setShowSave] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const throttleRef = useRef<number>(0);

  const previewUri = params.previewUri || photos[photos.length - 1]?.url || '';
  const matrix = useMemo(() => buildMatrix(recipe), [recipe]);
  const previewFilter: FilterDefinition = useMemo(
    () => ({
      id: 'builder-preview',
      name: '',
      subtitle: '',
      matrix,
      grainOpacity: recipe.grain * 0.15,
      vignetteOpacity: 0,
      vignetteColor: '#000000',
      tintForThumbnail: 'transparent',
    }),
    [matrix, recipe.grain]
  );

  // ── "Build together" collaboration ──────────────────────────
  useEffect(() => {
    if (!together || !bookId) return;
    return subscribeToFilterSession(bookId, (state) => {
      setSession(state);
      if (!state || state.draggingBy === user?.uid) return;
      setRecipe({
        warmth: state.warmth ?? 0,
        brightness: state.brightness ?? 0,
        contrast: state.contrast ?? 0,
        fade: state.fade ?? 0,
        grain: state.grain ?? 0,
        tintStrength: state.tintStrength ?? 0,
        tintId: state.tintId ?? 'none',
      });
    });
  }, [together, bookId, user?.uid]);

  useEffect(() => {
    return () => {
      if (together && bookId) clearFilterSessionDragging(bookId).catch(() => {});
    };
  }, [together, bookId]);

  const broadcast = (next: Recipe, slider: SliderKey) => {
    if (!together || !bookId || !user) return;
    const now = Date.now();
    if (now - throttleRef.current < 100) return;
    throttleRef.current = now;
    getUserProfile(user.uid).then((profile) => {
      pushFilterSession(bookId, {
        ...next,
        draggingBy: user.uid,
        draggingByName: user.displayName || profile?.displayName || 'Me',
        draggingByColor: profile?.color || PARTNER_COLORS[0],
        draggingSlider: slider,
      }).catch(() => {});
    });
  };

  const updateSlider = (key: SliderKey, uiValue: number) => {
    const value = BIPOLAR.includes(key) ? uiValue * 2 - 1 : uiValue;
    const next = { ...recipe, [key]: value };
    setRecipe(next);
    broadcast(next, key);
  };

  const uiValueFor = (key: SliderKey): number => {
    const v = recipe[key] as number;
    return BIPOLAR.includes(key) ? (v + 1) / 2 : v;
  };

  const partnerDragging =
    together && session?.draggingBy && session.draggingBy !== user?.uid && session.draggingSlider
      ? session
      : null;

  const doSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const preset: FilterDefinition = {
        id: `custom_${Date.now()}`,
        name: name.trim(),
        subtitle: 'My custom look',
        matrix,
        grainOpacity: recipe.grain * 0.15,
        vignetteOpacity: 0,
        vignetteColor: '#000000',
        tintForThumbnail:
          recipe.tintId === 'none' ? 'transparent' : `${tintOf(recipe.tintId).color}55`,
      };
      await savePreset(preset);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (err) {
      setSaveError(friendlyErrorMessage(err, "Couldn't save this filter. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={Colors.textOnInk} />
        </Pressable>
        <Text style={styles.headerTitle}>Create your own</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={[styles.preview, { height: width * 0.85 }]}>
        {previewUri ? (
          <FilteredImage uri={previewUri} filterId="builder-preview" filter={previewFilter} style={styles.previewImg} />
        ) : (
          <View style={styles.previewEmpty}>
            <Text style={styles.previewEmptyText}>Take a photo first to preview your filter</Text>
          </View>
        )}
      </View>

      <View style={styles.togetherRow}>
        <View style={styles.togetherLabel}>
          <Ionicons name="people-outline" size={16} color={Colors.gold} />
          <Text style={styles.togetherText}>Build together</Text>
        </View>
        <Switch
          value={together}
          onValueChange={setTogether}
          trackColor={{ true: Colors.gold, false: Colors.inkLighter }}
          ios_backgroundColor={Colors.inkLighter}
        />
      </View>

      {partnerDragging && (
        <View style={styles.draggingRow}>
          <PartnerAvatar
            name={partnerDragging.draggingByName || 'Partner'}
            color={partnerDragging.draggingByColor || Colors.gold}
            size={16}
          />
          <Text style={styles.draggingText}>
            {partnerDragging.draggingByName} is dragging{' '}
            {SLIDER_META[partnerDragging.draggingSlider as SliderKey]?.title ?? ''}
          </Text>
        </View>
      )}

      <View style={styles.sliders}>
        {(Object.keys(SLIDER_META) as SliderKey[]).map((key) => (
          <View key={key} style={styles.sliderRow}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>{SLIDER_META[key].title}</Text>
              <Text style={styles.sliderValue}>{SLIDER_META[key].label(recipe[key] as number)}</Text>
            </View>
            <Slider value={uiValueFor(key)} onChange={(v) => updateSlider(key, v)} />
            {key === 'tintStrength' && (
              <View style={styles.tintRow}>
                {TINTS.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      const next = { ...recipe, tintId: t.id };
                      setRecipe(next);
                      broadcast(next, 'tintStrength');
                    }}
                    style={[
                      styles.tintDot,
                      { backgroundColor: t.color },
                      recipe.tintId === t.id && styles.tintDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <GoldButton label="Save this filter" onPress={() => setShowSave(true)} />
      </View>

      <BottomSheet visible={showSave} onClose={() => setShowSave(false)} title="Name this filter">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Sunday Morning"
          placeholderTextColor={Colors.textMuted}
          style={styles.nameInput}
          autoFocus
          maxLength={24}
        />
        {saveError && <Text style={styles.saveError}>{saveError}</Text>}
        <GoldButton
          label="Save"
          onPress={doSave}
          loading={saving}
          disabled={!name.trim()}
          style={{ marginTop: 18, marginBottom: 8 }}
        />
      </BottomSheet>
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
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...Typography.labelGold },
  preview: {
    marginHorizontal: Spacing.pageMargin,
    borderRadius: Spacing.radiusLg,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  previewImg: { width: '100%', height: '100%' },
  previewEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  previewEmptyText: { ...Typography.bodyMuted, textAlign: 'center' },
  togetherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: 14,
  },
  togetherLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  togetherText: { ...Typography.body, fontSize: 14 },
  draggingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: 8,
  },
  draggingText: { ...Typography.bodyMuted },
  sliders: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.lg,
    gap: Spacing.lg,
  },
  sliderRow: {},
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sliderTitle: { ...Typography.body, fontSize: 14 },
  sliderValue: { ...Typography.bodyMuted },
  tintRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  tintDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  tintDotActive: {
    borderColor: Colors.gold,
  },
  footer: {
    marginTop: 'auto',
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.lg,
  },
  nameInput: {
    ...Typography.body,
    fontSize: 17,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    paddingVertical: 10,
  },
  saveError: {
    ...Typography.bodyMuted,
    color: Colors.error,
    marginTop: 10,
  },
});
