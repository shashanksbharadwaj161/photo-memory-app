import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import {
  BookPhoto,
  getPhoto,
  getUserProfile,
  addPostcardToBook,
  fetchUserPushToken,
  PARTNER_COLORS,
} from '@/lib/book';
import { sendPostcardNotification } from '@/lib/notifications';
import { PostcardLayout } from '@/components/PostcardLayout';
import { GoldButton } from '@/components/GoldButton';
import { BreathingDot } from '@/components/BreathingDot';

export default function PostcardScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { user, bookId } = useAuth();
  const { book, partner } = useBook(bookId, user?.uid);
  const params = useLocalSearchParams<{ photoId?: string }>();

  const [photo, setPhoto] = useState<BookPhoto | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const flip = useSharedValue(0); // 0 = front, 1 = back
  const send = useSharedValue(0); // 0 = resting, 1 = flown away

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!bookId || !params.photoId) {
        setNotFound(true);
        return;
      }
      const p = await getPhoto(bookId, params.photoId);
      if (alive) {
        if (p) setPhoto(p);
        else setNotFound(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [bookId, params.photoId]);

  const cardW = width - 40;
  const cardH = Math.min(height * 0.6, cardW * 1.35);

  const flipCard = () => {
    Haptics.selectionAsync().catch(() => {});
    flip.value = withSpring(flip.value > 0.5 ? 0 : 1, { damping: 15, stiffness: 90 });
  };

  const close = () => router.back();

  const doSend = async () => {
    if (!photo || !user || !bookId || !partner) return;
    setSending(true);
    try {
      const profile = await getUserProfile(user.uid);
      const senderName = user.displayName || profile?.displayName || 'Me';
      const newId = await addPostcardToBook(
        bookId,
        photo,
        {
          uid: user.uid,
          name: senderName,
          color: profile?.color || PARTNER_COLORS[0],
        },
        message
      );

      const token = await fetchUserPushToken(partner.uid);
      if (token) {
        await sendPostcardNotification(token, senderName, newId, bookId);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Fly the card away, then close.
      send.value = withTiming(1, { duration: 620 }, (finished) => {
        if (finished) runOnJS(close)();
      });
    } catch {
      setSending(false);
    }
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value * 180}deg` }],
    opacity: flip.value < 0.5 ? 1 : 0,
    backfaceVisibility: 'hidden',
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1200 }, { rotateY: `${flip.value * 180 + 180}deg` }],
    opacity: flip.value >= 0.5 ? 1 : 0,
    backfaceVisibility: 'hidden',
  }));
  const flyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(send.value, [0, 1], [0, -height]) },
      { scale: interpolate(send.value, [0, 1], [1, 0.4]) },
      { rotate: `${interpolate(send.value, [0, 1], [0, 12])}deg` },
    ],
    opacity: interpolate(send.value, [0, 0.8, 1], [1, 1, 0]),
  }));

  if (notFound) {
    return (
      <View style={styles.root}>
        <Header onClose={close} title="Postcard" insetTop={insets.top} />
        <View style={styles.center}>
          <Text style={styles.missing}>We couldn’t find that photo.</Text>
          <GoldButton label="Close" variant="ghost" onPress={close} style={{ marginTop: 18 }} />
        </View>
      </View>
    );
  }

  if (!photo) {
    return (
      <View style={styles.root}>
        <Header onClose={close} title="Postcard" insetTop={insets.top} />
        <View style={styles.center}>
          <BreathingDot />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header onClose={close} title="Send a postcard" insetTop={insets.top} onFlip={flipCard} />

      <View style={styles.stage}>
        <Animated.View style={[styles.cardHolder, { width: cardW, height: cardH }, flyStyle]}>
          <Animated.View style={[styles.cardLayer, frontStyle]}>
            <PostcardLayout
              side="front"
              photoUri={photo.url}
              filterId={photo.filterId}
              intensity={photo.intensity}
              message={message}
              partnerName={partner?.name ?? 'your partner'}
              width={cardW}
              height={cardH}
            />
          </Animated.View>
          <Animated.View style={[styles.cardLayer, backStyle]}>
            <PostcardLayout
              side="back"
              photoUri={photo.url}
              filterId={photo.filterId}
              intensity={photo.intensity}
              message={message}
              onChangeMessage={setMessage}
              partnerName={partner?.name ?? 'your partner'}
              width={cardW}
              height={cardH}
            />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable onPress={flipCard} style={styles.flipHint} hitSlop={8}>
          <Ionicons name="sync-outline" size={16} color={Colors.gold} />
          <Text style={styles.flipText}>
            {"Tap to flip · write on the back"}
          </Text>
        </Pressable>
        <GoldButton
          label={partner ? `Send to ${partner.name} ❤` : 'Waiting for your partner…'}
          icon="paper-plane"
          onPress={doSend}
          loading={sending}
          disabled={!partner}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Header({
  onClose,
  title,
  insetTop,
  onFlip,
}: {
  onClose: () => void;
  title: string;
  insetTop: number;
  onFlip?: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: insetTop + 8 }]}>
      <Pressable onPress={onClose} hitSlop={10} style={styles.headerBtn}>
        <Ionicons name="close" size={26} color={Colors.textOnInk} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onFlip ? (
        <Pressable onPress={onFlip} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="sync-outline" size={22} color={Colors.gold} />
        </Pressable>
      ) : (
        <View style={styles.headerBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 18,
    color: Colors.textOnInk,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHolder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  footer: {
    paddingHorizontal: 20,
    gap: 14,
  },
  flipHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  flipText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: Colors.textMuted,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missing: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.textMuted,
  },
});
