import React from 'react';
import { FlatList, TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { FILTERS, FilterDefinition } from '@/constants/filters';

interface FilterStripProps {
  selectedId: string;
  onSelect: (filter: FilterDefinition) => void;
}

export function FilterStrip({ selectedId, onSelect }: FilterStripProps) {
  const handleSelect = (filter: FilterDefinition) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelect(filter);
  };

  return (
    <FlatList
      horizontal
      data={FILTERS}
      keyExtractor={(f) => f.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.strip}
      renderItem={({ item }) => {
        const selected = item.id === selectedId;
        return (
          <TouchableOpacity
            onPress={() => handleSelect(item)}
            style={styles.item}
            activeOpacity={0.75}
          >
            <View style={[styles.thumbnail, selected && styles.thumbnailSelected]}>
              <LinearGradient
                colors={['#8B7355', '#4A3728', '#2C1810']}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {item.tintForThumbnail !== 'transparent' && (
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: item.tintForThumbnail }]}
                />
              )}
            </View>
            {selected && <View style={styles.selectedDot} />}
            <Text style={[styles.filterName, selected && styles.filterNameSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  strip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  item: {
    alignItems: 'center',
    width: 66,
  },
  thumbnail: {
    width: 62,
    height: 62,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailSelected: {
    borderColor: Colors.gold,
  },
  selectedDot: {
    marginTop: 5,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.gold,
  },
  filterName: {
    fontFamily: Fonts.hand,
    fontSize: 15,
    lineHeight: 17,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  filterNameSelected: {
    color: Colors.gold,
  },
});
