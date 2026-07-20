import React, { useEffect, useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  Text,
  StyleProp,
  ViewStyle,
  ImageResizeMode,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ColorMatrix, Matrix } from 'react-native-color-matrix-image-filters';
import { FilterDefinition, getFilterById } from '@/constants/filters';
import { matrixForFilter } from '@/lib/filters';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { GrainOverlay } from './GrainOverlay';
import { Vignette } from './Vignette';
import { BreathingDot } from './BreathingDot';

interface FilteredImageProps {
  uri: string;
  filterId: string;
  intensity?: number; // 0..1
  style?: StyleProp<ViewStyle>; // controls the size of the frame
  radius?: number;
  resizeMode?: ImageResizeMode;
  grain?: boolean;
  vignette?: boolean;
  /**
   * An already-resolved filter recipe (matrix/grain/vignette). Pass this for
   * "Mine" presets, which live only in local AsyncStorage — without it, a
   * partner's device that never saved that preset would fall back to
   * "Original" instead of rendering the intended look. When omitted, `filterId`
   * is looked up in the built-in FILTERS list as before.
   */
  filter?: FilterDefinition;
  /** Shown on the placeholder if the image fails to load. */
  caption?: string;
}

/**
 * Renders a photo with its film filter baked in (GPU color matrix), plus the
 * matching grain and vignette. This is the single source of truth for how a
 * filtered photo looks across the whole app.
 */
export function FilteredImage({
  uri,
  filterId,
  intensity = 1,
  style,
  radius = 0,
  resizeMode = 'cover',
  grain = true,
  vignette = true,
  filter: filterOverride,
  caption,
}: FilteredImageProps) {
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setFailed(false);
    setLoading(true);
  }, [uri]);
  const filter = filterOverride ?? getFilterById(filterId);
  const clamped = Math.max(0, Math.min(1, intensity));
  const identity = filter.id === 'none' || clamped <= 0;
  const matrix = matrixForFilter(filter, clamped);

  const image = (
    <Image
      source={{ uri }}
      resizeMode={resizeMode}
      style={styles.fill}
      onLoadEnd={() => setLoading(false)}
      onError={() => {
        setFailed(true);
        setLoading(false);
      }}
    />
  );

  const showPlaceholder = !uri || failed;

  return (
    <View style={[styles.container, { borderRadius: radius }, style]}>
      {showPlaceholder ? (
        <View style={[styles.fill, styles.placeholder]}>
          {failed && (
            <>
              <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
              {!!caption && (
                <Text style={styles.placeholderCaption} numberOfLines={2}>
                  {caption}
                </Text>
              )}
            </>
          )}
        </View>
      ) : identity ? (
        image
      ) : (
        <ColorMatrix matrix={matrix as unknown as Matrix} style={styles.fill}>
          {image}
        </ColorMatrix>
      )}

      {!showPlaceholder && loading && (
        <View style={[styles.fill, styles.loadingOverlay]} pointerEvents="none">
          <BreathingDot />
        </View>
      )}

      {!showPlaceholder && grain && <GrainOverlay opacity={filter.grainOpacity * clamped} />}
      {!showPlaceholder && vignette && (
        <Vignette color={filter.vignetteColor} opacity={filter.vignetteOpacity * clamped} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: Colors.inkLight,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: Colors.inkLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  placeholderCaption: {
    fontFamily: Fonts.hand,
    fontSize: 16,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  loadingOverlay: {
    backgroundColor: Colors.inkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
