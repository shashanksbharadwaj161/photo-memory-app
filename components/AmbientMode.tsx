import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Image, Text, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { BookPhoto } from '@/lib/book';

interface AmbientModeProps {
  visible: boolean;
  photos: BookPhoto[];
  onDismiss: () => void;
  /** Best-effort "your partner is around too" signal, reusing the same presence check as the book header. */
  partnerOnline?: boolean;
}

const FADE_IN_MS = 1500;
const CAPTION_DELAY_MS = 3000;
const CAPTION_FADE_MS = 800;
const HOLD_MS = 8000;
const FADE_OUT_MS = 1500;

export function AmbientMode({ visible, photos, onDismiss, partnerOnline }: AmbientModeProps) {
  const [index, setIndex] = useState(0);
  const photoOpacity = useRef(new Animated.Value(0)).current;
  const captionOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible || photos.length === 0) return;
    let cancelled = false;
    let idx = 0;
    setIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];

    const cycle = () => {
      if (cancelled) return;
      photoOpacity.setValue(0);
      captionOpacity.setValue(0);
      Animated.timing(photoOpacity, {
        toValue: 1,
        duration: FADE_IN_MS,
        useNativeDriver: true,
      }).start();

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          Animated.timing(captionOpacity, {
            toValue: 1,
            duration: CAPTION_FADE_MS,
            useNativeDriver: true,
          }).start();
        }, CAPTION_DELAY_MS)
      );

      timers.push(
        setTimeout(() => {
          if (cancelled) return;
          Animated.timing(photoOpacity, {
            toValue: 0,
            duration: FADE_OUT_MS,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (!finished || cancelled) return;
            idx = (idx + 1) % photos.length;
            setIndex(idx);
            cycle();
          });
        }, FADE_IN_MS + HOLD_MS)
      );
    };

    cycle();
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, photos.length]);

  const dismiss = () => {
    Animated.timing(photoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      onDismiss();
    });
  };

  if (!visible || photos.length === 0) return null;
  const photo = photos[index];
  const dateLabel = photo.createdAt ? format(photo.createdAt.toDate(), 'MMMM d, yyyy') : '';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={dismiss}>
      <View style={styles.root}>
        {partnerOnline && <View style={styles.watchingDot} />}
        <TouchableOpacity activeOpacity={1} style={StyleSheet.absoluteFill} onPress={dismiss}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: photoOpacity }]}>
            <Image source={{ uri: photo.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          </Animated.View>
          <View style={styles.captionWrap} pointerEvents="none">
            {!!photo.caption && (
              <Animated.View style={{ opacity: captionOpacity }}>
                <Text style={styles.caption}>{photo.caption}</Text>
                <Text style={styles.date}>{dateLabel}</Text>
              </Animated.View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  watchingDot: {
    position: 'absolute',
    top: 52,
    left: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    opacity: 0.35,
    zIndex: 1,
  },
  captionWrap: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 64,
  },
  caption: {
    fontFamily: 'Caveat_400Regular',
    fontSize: 20,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 1 },
  },
  date: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
  },
});
