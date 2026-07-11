import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { BookPhoto } from '@/lib/book';
import { resolvePhotoFilter } from '@/lib/filters';
import { FilteredImage } from './FilteredImage';
import { PartnerAvatar } from './PartnerAvatar';

interface MemoryCardProps {
  photo: BookPhoto;
  label: string;
  height?: number;
  rotate?: number;
  onPress?: () => void;
}

/** The full-width "On this day" hero card. */
export function MemoryCard({ photo, label, height = 360, rotate = 0, onPress }: MemoryCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        rotate ? { transform: [{ rotate: `${rotate}deg` }] } : null,
        pressed && { opacity: 0.95 },
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.imageWrap, { height }]}>
        <FilteredImage
          uri={photo.url}
          filterId={photo.filterId}
          intensity={photo.intensity}
          filter={resolvePhotoFilter(photo.filterId, photo.filterSnapshot)}
          radius={12}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['transparent', 'rgba(26,20,16,0.75)']}
          style={styles.gradient}
          pointerEvents="none"
        />
        <View style={styles.overlay}>
          <PartnerAvatar name={photo.addedByName} color={photo.addedByColor} size={26} />
          {!!photo.caption && (
            <Text style={styles.caption} numberOfLines={2}>
              {photo.caption}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paper,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  label: {
    fontFamily: Fonts.serifItalic,
    fontSize: 18,
    color: Colors.textOnPaper,
    marginBottom: 10,
    marginLeft: 4,
  },
  imageWrap: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  caption: {
    flex: 1,
    color: Colors.paper,
    fontFamily: Fonts.hand,
    fontSize: 20,
  },
});
