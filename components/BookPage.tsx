import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { BookPhoto } from '@/lib/book';
import { resolvePhotoFilter } from '@/lib/filters';
import { FilteredImage } from './FilteredImage';
import { PartnerAvatar } from './PartnerAvatar';
import PAPER from '@/assets/paper-texture.png';

interface BookPageProps {
  photo: BookPhoto;
  width: number;
  height: number;
  editable?: boolean;
  onPressPhoto?: () => void;
  onLongPress?: () => void;
  /** Fires when long-pressing the page outside the photo frame (caption/footer/margins). */
  onLongPressBackground?: () => void;
  onSaveCaption?: (caption: string) => void;
}

function formatDate(photo: BookPhoto): string {
  if (!photo.createdAt) return 'Just now';
  try {
    return format(photo.createdAt.toDate(), 'MMMM d, yyyy');
  } catch {
    return '';
  }
}

export function BookPage({
  photo,
  width,
  height,
  editable = true,
  onPressPhoto,
  onLongPress,
  onLongPressBackground,
  onSaveCaption,
}: BookPageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(photo.caption);

  const photoHeight = Math.round(height * 0.6);

  const commit = () => {
    setEditing(false);
    Keyboard.dismiss();
    const trimmed = draft.trim();
    if (trimmed !== photo.caption) onSaveCaption?.(trimmed);
  };

  return (
    <Pressable
      style={[styles.page, { width, height }]}
      onLongPress={onLongPressBackground}
      delayLongPress={500}
    >
      {/* Subtle paper fibre texture */}
      <View pointerEvents="none" style={styles.paper}>
        <Image source={PAPER} resizeMode="repeat" style={StyleSheet.absoluteFill} />
      </View>
      {/* Spine shadow down the left edge */}
      <LinearGradient
        colors={['rgba(44,24,16,0.18)', 'rgba(44,24,16,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.spine}
        pointerEvents="none"
      />

      <View style={styles.inner}>
        {/* Photo with film frame */}
        <Pressable
          onPress={onPressPhoto}
          onLongPress={onLongPress}
          delayLongPress={500}
          style={styles.frame}
        >
          <FilteredImage
            uri={photo.url}
            filterId={photo.filterId}
            intensity={photo.intensity}
            filter={resolvePhotoFilter(photo.filterId, photo.filterSnapshot)}
            radius={4}
            style={{ width: '100%', height: photoHeight }}
          />
          {photo.isPostcard && (
            <View style={styles.postcardBadge}>
              <Ionicons name="mail" size={13} color={Colors.paper} />
              <Text style={styles.postcardText}>Postcard</Text>
            </View>
          )}
          {photo.isFavorite && (
            <View style={styles.favBadge}>
              <Ionicons name="heart" size={15} color={Colors.coral} />
            </View>
          )}
        </Pressable>

        {/* Caption (tap to edit) */}
        {editing ? (
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            autoFocus
            multiline
            maxLength={140}
            placeholder="Say something…"
            placeholderTextColor={Colors.textMuted}
            style={styles.captionInput}
            returnKeyType="done"
            blurOnSubmit
          />
        ) : (
          <Pressable
            onPress={() => {
              if (editable) {
                setDraft(photo.caption);
                setEditing(true);
              }
            }}
            style={styles.captionWrap}
          >
            {photo.caption ? (
              <Text style={styles.caption} numberOfLines={3}>
                {photo.caption}
              </Text>
            ) : editable ? (
              <Text style={styles.captionPlaceholder}>Tap to add a caption…</Text>
            ) : null}
          </Pressable>
        )}

        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(photo)}</Text>
          <PartnerAvatar name={photo.addedByName} color={photo.addedByColor} size={30} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: Colors.paper,
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  paper: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  spine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 22,
  },
  inner: {
    flex: 1,
    padding: 18,
  },
  frame: {
    borderWidth: 3,
    borderColor: '#2C1810',
    borderRadius: 6,
    padding: 3,
    backgroundColor: '#2C1810',
  },
  postcardBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.coral,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  postcardText: {
    color: Colors.paper,
    fontFamily: Fonts.hand,
    fontSize: 13,
  },
  favBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(245,239,224,0.9)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  caption: {
    fontFamily: Fonts.hand,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.textHandwritten,
  },
  captionPlaceholder: {
    fontFamily: Fonts.hand,
    fontSize: 20,
    color: Colors.textMuted,
  },
  captionInput: {
    flex: 1,
    fontFamily: Fonts.hand,
    fontSize: 22,
    lineHeight: 26,
    color: Colors.textHandwritten,
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(44,24,16,0.1)',
    paddingTop: 12,
  },
  date: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.textMuted,
  },
});
