import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';

interface SliderProps {
  value: number; // 0..1
  onChange: (value: number) => void;
}

const THUMB = 20;

/** A thin gold-tracked slider, driven on the UI thread for smoothness. */
export function Slider({ value, onChange }: SliderProps) {
  const [width, setWidth] = useState(0);
  const pos = useSharedValue(value);

  useEffect(() => {
    pos.value = value;
  }, [value, pos]);

  const emit = (v: number) => onChange(Math.max(0, Math.min(1, v)));

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      if (width <= 0) return;
      const v = Math.max(0, Math.min(1, e.x / width));
      pos.value = v;
      runOnJS(emit)(v);
    })
    .onUpdate((e) => {
      if (width <= 0) return;
      const v = Math.max(0, Math.min(1, e.x / width));
      pos.value = v;
      runOnJS(emit)(v);
    });

  const fillStyle = useAnimatedStyle(() => ({ width: `${pos.value * 100}%` }));
  const thumbStyle = useAnimatedStyle(() => ({
    left: pos.value * width - THUMB / 2,
  }));

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.hitbox}>
        <View
          style={styles.track}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        >
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hitbox: {
    height: 36,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.filterUnselected,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },
  thumb: {
    position: 'absolute',
    top: (36 - THUMB) / 2,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.paper,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
