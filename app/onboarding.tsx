import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Typography } from '@/constants/typography';
import { BreathingLogo } from '@/components/BreathingLogo';
import { GlassPanel } from '@/components/GlassPanel';
import { PressableScale } from '@/components/PressableScale';
import { RadialBackdrop } from '@/components/RadialBackdrop';
import { GoldButton } from '@/components/GoldButton';
import { useAuth } from '@/hooks/useAuth';
import { createBook, joinBook } from '@/lib/book';
import { friendlyErrorMessage } from '@/lib/errors';

type Mode = 'choose' | 'creating' | 'created' | 'join';

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { user, bookId, bookResolved, refreshBookId } = useAuth();
  const [mode, setMode] = useState<Mode>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return <Redirect href={'/(auth)/login' as any} />;
  if (bookResolved && bookId) return <Redirect href={'/(app)/book' as any} />;

  const displayName = user.displayName || 'Me';

  const startNewBook = async (isRetry = false) => {
    setMode('creating');
    setError(null);
    try {
      const { inviteCode: code } = await createBook(user.uid, displayName);
      setInviteCode(code);
      setMode('created');
    } catch (err) {
      // Freshly-deployed Firestore rules can take a moment — retry once quietly.
      const code = (err as { code?: string })?.code;
      if (code === 'permission-denied' && !isRetry) {
        setTimeout(() => startNewBook(true), 2000);
        return;
      }
      setError(friendlyErrorMessage(err, "We couldn't create your book. Check your connection and try again."));
      setMode('choose');
    }
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openBook = async () => {
    setBusy(true);
    await refreshBookId();
  };

  const joinExisting = async () => {
    setError(null);
    if (codeInput.trim().length < 4) {
      setError('Enter the 6-character code your partner shared.');
      return;
    }
    setBusy(true);
    try {
      const id = await joinBook(user.uid, displayName, codeInput);
      if (!id) {
        setError("That code didn't match any book. Double-check it with your partner.");
        setBusy(false);
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refreshBookId();
    } catch (err) {
      setError(friendlyErrorMessage(err, "We couldn't join that book. Check your connection and try again."));
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <RadialBackdrop />
      <LinearGradient
        colors={['rgba(232,200,126,0.08)', 'rgba(0,0,0,0)']}
        style={styles.lamp}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 36 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <BreathingLogo size={72} />
          <Text style={styles.kicker}>LOCKET</Text>
          <Text style={styles.title}>
            {mode === 'created' ? 'Your book is open.' : 'Two people.\nOne book.'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'created'
              ? 'This code is the only key. Give it to the one person it belongs to.'
              : mode === 'join'
                ? 'Enter the code your partner gave you.'
                : 'Everything you capture lands on the same pages, at the same moment, on both phones.'}
          </Text>
        </View>

        {(mode === 'choose' || mode === 'creating') && (
          <Animated.View entering={FadeIn} style={styles.cardsCol}>
            <PressableScale
              onPress={() => {
                if (mode !== 'creating') startNewBook();
              }}
              haptic="medium"
            >
              <GlassPanel tone="gold" style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIconGold}>
                    <Ionicons name="book" size={22} color={Colors.ink} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>
                      {mode === 'creating' ? 'Binding your book…' : 'Start a new book'}
                    </Text>
                    <Text style={styles.cardBody}>
                      {mode === 'creating'
                        ? 'A moment — stitching the spine.'
                        : 'Open to the first page, then invite them in.'}
                    </Text>
                  </View>
                </View>
              </GlassPanel>
            </PressableScale>

            <PressableScale
              onPress={() => {
                if (mode !== 'creating') {
                  setError(null);
                  setMode('join');
                }
              }}
            >
              <GlassPanel style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIconGhost}>
                    <Ionicons name="key-outline" size={22} color={Colors.gold} />
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.cardTitle}>Join with a code</Text>
                    <Text style={styles.cardBody}>Your partner already started one.</Text>
                  </View>
                </View>
              </GlassPanel>
            </PressableScale>

            {error && <Text style={styles.error}>{error}</Text>}
          </Animated.View>
        )}

        {mode === 'created' && (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.codeBlock}>
            <PressableScale onPress={copyCode}>
              <GlassPanel tone="gold" style={styles.codeCard} radius={24}>
                <View style={styles.codeInner}>
                  <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
                  <Text style={styles.code}>{inviteCode}</Text>
                  <View style={styles.copyRow}>
                    <Ionicons
                      name={copied ? 'checkmark-circle' : 'copy-outline'}
                      size={15}
                      color={copied ? Colors.online : Colors.gold}
                    />
                    <Text style={styles.copyText}>{copied ? 'Copied' : 'Tap to copy'}</Text>
                  </View>
                </View>
              </GlassPanel>
            </PressableScale>
            <GoldButton label="Open our book" onPress={openBook} loading={busy} style={styles.cta} />
          </Animated.View>
        )}

        {mode === 'join' && (
          <Animated.View entering={FadeInDown.springify().damping(16)} style={styles.joinBlock}>
            <GlassPanel style={styles.joinCard} radius={24}>
              <TextInput
                value={codeInput}
                onChangeText={(t) => setCodeInput(t.toUpperCase().replace(/\s/g, ''))}
                placeholder="••••••"
                placeholderTextColor={'rgba(140,123,107,0.6)'}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                style={styles.codeInput}
              />
            </GlassPanel>
            {error && <Text style={styles.error}>{error}</Text>}
            <GoldButton label="Join their book" onPress={joinExisting} loading={busy} style={styles.cta} />
            <Pressable onPress={() => setMode('choose')} style={styles.back} hitSlop={8}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ink },
  lamp: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 240,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  kicker: {
    ...Typography.label,
    letterSpacing: 4,
    marginTop: 2,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 34,
    lineHeight: 42,
    color: Colors.gold,
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textMuted,
    marginTop: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  cardsCol: {
    gap: 14,
  },
  card: {
    alignSelf: 'stretch',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIconGold: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconGhost: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 19,
    color: Colors.textOnInk,
  },
  cardBody: {
    ...Typography.bodyMuted,
    marginTop: 3,
    lineHeight: 19,
  },
  codeBlock: {
    alignItems: 'center',
  },
  codeCard: {
    alignSelf: 'stretch',
  },
  codeInner: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  codeLabel: {
    ...Typography.label,
    letterSpacing: 3,
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 44,
    letterSpacing: 12,
    color: Colors.gold,
    marginTop: 12,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  copyText: {
    ...Typography.labelGold,
  },
  cta: {
    marginTop: 22,
    alignSelf: 'stretch',
  },
  joinBlock: {
    alignItems: 'center',
  },
  joinCard: {
    alignSelf: 'stretch',
  },
  codeInput: {
    textAlign: 'center',
    fontFamily: 'Courier New',
    fontSize: 38,
    letterSpacing: 12,
    color: Colors.textOnInk,
    paddingVertical: 10,
  },
  error: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.coral,
    textAlign: 'center',
    marginTop: 14,
  },
  back: {
    marginTop: 18,
  },
  backText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.gold,
  },
});
