import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { BookPhoto } from '@/lib/book';
import { FilteredImage } from './FilteredImage';
import { PartnerAvatar } from './PartnerAvatar';

interface PhotoViewerProps {
  photo: BookPhoto | null;
  visible: boolean;
  onClose: () => void;
  onToggleFavorite?: (photo: BookPhoto) => void;
}

export function PhotoViewer({ photo, visible, onClose, onToggleFavorite }: PhotoViewerProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const heart = useSharedValue(0);

  useEffect(() => {
    if (visible) translateY.value = 0;
  }, [visible, translateY]);

  const favorite = () => {
    if (!photo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onToggleFavorite?.(photo);
  };

  const flyHeart = () => {
    heart.value = 0;
    heart.value = withSequence(
      withTiming(1, { duration: 260 }),
      withTiming(0, { duration: 520 })
    );
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > 140 || e.velocityY > 900) {
        translateY.value = withTiming(height, { duration: 200 }, () => runOnJS(onClose)());
      } else {
        translateY.value = withSpring(0, { damping: 18 });
      }
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd(() => {
      runOnJS(favorite)();
      runOnJS(flyHeart)();
    });

  const composed = Gesture.Simultaneous(pan, doubleTap);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.value, [0, height * 0.6], [1, 0], Extrapolation.CLAMP),
  }));

  const heartStyle = useAnimatedStyle(() => ({
    opacity: heart.value,
    transform: [
      { scale: interpolate(heart.value, [0, 0.5, 1], [0.4, 1.3, 1]) },
      { translateY: interpolate(heart.value, [0, 1], [0, -80]) },
    ],
  }));

  if (!photo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[styles.backdrop, backdropStyle]} />
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.container, imageStyle]}>
          <FilteredImage
            uri={photo.url}
            filterId={photo.filterId}
            intensity={photo.intensity}
            resizeMode="contain"
            grain={false}
            vignette={false}
            style={{ width, height: height * 0.7 }}
          />

          <Animated.View style={[styles.heart, heartStyle]} pointerEvents="none">
            <Ionicons name="heart" size={110} color={Colors.coral} />
          </Animated.View>

          <View style={styles.info}>
            <View style={styles.infoRow}>
              <PartnerAvatar name={photo.addedByName} color={photo.addedByColor} size={30} />
              <Text style={styles.addedBy}>{photo.addedByName}</Text>
              {photo.isFavorite && <Ionicons name="heart" size={18} color={Colors.coral} />}
            </View>
            {!!photo.caption && <Text style={styles.caption}>{photo.caption}</Text>}
            <Text style={styles.hint}>Double-tap to favourite · swipe down to close</Text>
          </View>
        </Animated.View>
      </GestureDetector>

      <Pressable
        onPress={onClose}
        style={[styles.close, { top: insets.top + 8 }]}
        hitSlop={12}
      >
        <Ionicons name="close" size={26} color={Colors.textOnInk} />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    alignSelf: 'center',
  },
  info: {
    position: 'absolute',
    bottom: 60,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addedBy: {
    color: Colors.textOnInk,
    fontFamily: Fonts.serifBold,
    fontSize: 16,
  },
  caption: {
    color: Colors.paper,
    fontFamily: Fonts.hand,
    fontSize: 24,
    textAlign: 'center',
  },
  hint: {
    color: Colors.textMuted,
    fontFamily: Fonts.serif,
    fontSize: 12,
    marginTop: 4,
  },
  close: {
    position: 'absolute',
    right: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.glassDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
