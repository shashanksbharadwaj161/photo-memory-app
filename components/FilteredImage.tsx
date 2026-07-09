import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  ImageResizeMode,
} from 'react-native';
import { ColorMatrix, Matrix } from 'react-native-color-matrix-image-filters';
import { getFilterById } from '@/constants/filters';
import { matrixFor } from '@/lib/filters';
import { Colors } from '@/constants/colors';
import { GrainOverlay } from './GrainOverlay';
import { Vignette } from './Vignette';

interface FilteredImageProps {
  uri: string;
  filterId: string;
  intensity?: number; // 0..1
  style?: StyleProp<ViewStyle>; // controls the size of the frame
  radius?: number;
  resizeMode?: ImageResizeMode;
  grain?: boolean;
  vignette?: boolean;
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
}: FilteredImageProps) {
  const filter = getFilterById(filterId);
  const clamped = Math.max(0, Math.min(1, intensity));
  const identity = filter.id === 'none' || clamped <= 0;
  const matrix = matrixFor(filterId, clamped);

  const image = <Image source={{ uri }} resizeMode={resizeMode} style={styles.fill} />;

  return (
    <View style={[styles.container, { borderRadius: radius }, style]}>
      {!uri ? (
        <View style={[styles.fill, styles.placeholder]} />
      ) : identity ? (
        image
      ) : (
        <ColorMatrix matrix={matrix as unknown as Matrix} style={styles.fill}>
          {image}
        </ColorMatrix>
      )}

      {grain && <GrainOverlay opacity={filter.grainOpacity * clamped} />}
      {vignette && (
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
  },
});
