import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  LayoutChangeEvent,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import { FILTERS, FilterDefinition } from '@/constants/filters';
import { getSavedPresets, mergeMinePresets } from '@/lib/presets';

interface FilterStripProps {
  selectedId: string;
  onSelect: (filter: FilterDefinition) => void;
  /** Long-pressing the strip opens the filter builder ("Create your own"). */
  onLongPress?: () => void;
}

type Tab = 'film' | 'mine';

export function FilterStrip({ selectedId, onSelect, onLongPress }: FilterStripProps) {
  const [tab, setTab] = useState<Tab>('film');
  const [mine, setMine] = useState<FilterDefinition[]>([]);
  const slide = useSharedValue(0);
  const [rowWidth, setRowWidth] = useState(0);

  const loadMine = useCallback(() => {
    getSavedPresets()
      .then((saved) => setMine(mergeMinePresets(saved)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  // Reload "Mine" whenever this screen regains focus — picks up a preset
  // just saved in the filter builder.
  useFocusEffect(
    useCallback(() => {
      loadMine();
    }, [loadMine])
  );

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    Haptics.selectionAsync().catch(() => {});
    setTab(next);
    slide.value = withTiming(next === 'film' ? 0 : 1, { duration: 260 });
  };

  const trackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -slide.value * rowWidth }],
  }));

  return (
    <View>
      <View style={styles.tabRow}>
        <TabLabel label="Film" active={tab === 'film'} onPress={() => switchTab('film')} />
        <TabLabel label="Mine" active={tab === 'mine'} onPress={() => switchTab('mine')} />
      </View>

      <View
        style={styles.rowClip}
        onLayout={(e: LayoutChangeEvent) => setRowWidth(e.nativeEvent.layout.width)}
      >
        {rowWidth > 0 && (
          <Animated.View style={[styles.track, { width: rowWidth * 2 }, trackStyle]}>
            <View style={{ width: rowWidth }}>
              <FilterList
                data={FILTERS}
                selectedId={selectedId}
                onSelect={onSelect}
                onLongPress={onLongPress}
              />
            </View>
            <View style={{ width: rowWidth }}>
              {mine.length > 0 ? (
                <FilterList
                  data={mine}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onLongPress={onLongPress}
                />
              ) : (
                <Pressable onLongPress={onLongPress} delayLongPress={320} style={styles.emptyMine}>
                  <Text style={styles.emptyMineText}>
                    Drop your presets into constants/my-presets.ts
                  </Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function TabLabel({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.tabItem}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      <View style={[styles.tabUnderline, active && styles.tabUnderlineActive]} />
    </Pressable>
  );
}

function FilterList({
  data,
  selectedId,
  onSelect,
  onLongPress,
}: {
  data: FilterDefinition[];
  selectedId: string;
  onSelect: (filter: FilterDefinition) => void;
  onLongPress?: () => void;
}) {
  const layouts = useRef<Record<string, { x: number; width: number }>>({});
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const [ready, setReady] = useState(false);

  const moveIndicator = useCallback(
    (id: string) => {
      const l = layouts.current[id];
      if (!l) return;
      indicatorX.value = withSpring(l.x, { damping: 18, stiffness: 180 });
      indicatorWidth.value = withSpring(l.width, { damping: 18, stiffness: 180 });
    },
    [indicatorX, indicatorWidth]
  );

  useEffect(() => {
    if (ready) moveIndicator(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, ready]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
  }));

  const handleSelect = (filter: FilterDefinition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(filter);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    >
      {data.map((item) => {
        const selected = item.id === selectedId;
        return (
          <Pressable
            key={item.id}
            onPress={() => handleSelect(item)}
            onLongPress={onLongPress}
            delayLongPress={320}
            onLayout={(e: LayoutChangeEvent) => {
              layouts.current[item.id] = {
                x: e.nativeEvent.layout.x,
                width: e.nativeEvent.layout.width,
              };
              if (item.id === selectedId) {
                indicatorX.value = e.nativeEvent.layout.x;
                indicatorWidth.value = e.nativeEvent.layout.width;
                setReady(true);
              }
            }}
            style={styles.item}
          >
            <Text style={[styles.filterName, selected && styles.filterNameSelected]}>
              {item.name}
            </Text>
          </Pressable>
        );
      })}
      <Animated.View style={[styles.indicator, indicatorStyle]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 22,
    paddingHorizontal: 20,
    marginBottom: 6,
  },
  tabItem: {
    alignItems: 'flex-start',
  },
  tabText: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.gold,
  },
  tabUnderline: {
    marginTop: 4,
    height: 1.5,
    width: '100%',
    backgroundColor: 'transparent',
  },
  tabUnderlineActive: {
    backgroundColor: Colors.gold,
  },
  rowClip: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
  },
  list: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 26,
    alignItems: 'flex-start',
  },
  item: {
    paddingBottom: 8,
  },
  filterName: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textMuted,
  },
  filterNameSelected: {
    color: Colors.gold,
  },
  indicator: {
    position: 'absolute',
    bottom: 10,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.gold,
  },
  emptyMine: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyMineText: {
    fontFamily: 'PlayfairDisplay_400Regular_Italic',
    fontStyle: 'italic',
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
