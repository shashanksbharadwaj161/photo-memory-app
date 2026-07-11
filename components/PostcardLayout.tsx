import React from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Typography } from '@/constants/typography';
import { FilterDefinition } from '@/constants/filters';
import { FilteredImage } from './FilteredImage';
import { Stamp, Postmark } from './Stamp';

interface PostcardLayoutProps {
  photoUri: string;
  filterId: string;
  intensity?: number;
  filter?: FilterDefinition;
  side: 'front' | 'back';
  message: string;
  onChangeMessage?: (text: string) => void;
  partnerName: string;
  width: number;
  height: number;
  editable?: boolean;
  /** Shows a "✦ Suggest message" hint below the input when provided. */
  onSuggestMessage?: () => void;
  suggesting?: boolean;
}

export function PostcardLayout({
  photoUri,
  filterId,
  intensity = 1,
  filter,
  side,
  message,
  onChangeMessage,
  partnerName,
  width,
  height,
  editable = true,
  onSuggestMessage,
  suggesting,
}: PostcardLayoutProps) {
  if (side === 'front') {
    return (
      <View style={[styles.card, { width, height }]}>
        <FilteredImage
          uri={photoUri}
          filterId={filterId}
          intensity={intensity}
          filter={filter}
          style={{ width: '100%', height: height * 0.62 }}
        />
        <View style={styles.stampSlot}>
          <Stamp size={72} />
        </View>
        <View style={styles.frontFooter}>
          <Text style={styles.frontTitle}>Locket</Text>
          <Text style={styles.frontSub}>a memory, posted with love</Text>
        </View>
        <View style={styles.postmarkSlot}>
          <Postmark size={78} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.back, { width, height }]}>
      <View style={styles.backRow}>
        {/* Left — message */}
        <View style={styles.messageSide}>
          {editable ? (
            <TextInput
              value={message}
              onChangeText={onChangeMessage}
              placeholder="Write something…"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={280}
              style={styles.message}
              textAlignVertical="top"
            />
          ) : (
            <Text style={styles.message}>{message || 'Write something…'}</Text>
          )}
          {onSuggestMessage && (
            <View style={styles.suggestRow}>
              {suggesting ? (
                <ActivityIndicator size="small" color={Colors.goldDark} />
              ) : (
                <Pressable onPress={onSuggestMessage} hitSlop={6}>
                  <Text style={styles.suggestText}>✦ Suggest message</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Right — address */}
        <View style={styles.addressSide}>
          <Text style={styles.addressLabel}>TO</Text>
          <Text style={styles.addressName}>{partnerName}</Text>
          {['heart', 'star', 'heart-outline'].map((icon, i) => (
            <View key={i} style={styles.addressLine}>
              <Ionicons name={icon as any} size={13} color={Colors.gold} />
              <View style={styles.addressRule} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.paperTint,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  stampSlot: {
    position: 'absolute',
    top: 20,
    right: 20,
    transform: [{ rotate: '4deg' }],
  },
  postmarkSlot: {
    position: 'absolute',
    right: 22,
    bottom: 26,
    opacity: 0.9,
    transform: [{ rotate: '-8deg' }],
  },
  frontFooter: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 6,
  },
  frontTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 30,
    color: Colors.textOnPaper,
  },
  frontSub: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 2,
  },
  back: {
    padding: 18,
  },
  backRow: {
    flex: 1,
    flexDirection: 'row',
  },
  messageSide: {
    flex: 1.15,
    paddingRight: 14,
  },
  suggestRow: {
    marginTop: 4,
  },
  suggestText: {
    ...Typography.labelGold,
  },
  message: {
    flex: 1,
    fontFamily: Fonts.hand,
    fontSize: 24,
    lineHeight: 30,
    color: Colors.textHandwritten,
  },
  divider: {
    width: 1.5,
    backgroundColor: 'rgba(44,24,16,0.18)',
    marginHorizontal: 6,
  },
  addressSide: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'center',
  },
  addressLabel: {
    fontFamily: Fonts.serif,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.textMuted,
  },
  addressName: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    color: Colors.textOnPaper,
    marginTop: 2,
    marginBottom: 18,
  },
  addressLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  addressRule: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(44,24,16,0.25)',
  },
});
