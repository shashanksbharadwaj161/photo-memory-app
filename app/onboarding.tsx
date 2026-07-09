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
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Logo } from '@/components/Logo';
import { GoldButton } from '@/components/GoldButton';
import { useAuth } from '@/hooks/useAuth';
import { createBook, joinBook } from '@/lib/book';

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

  const startNewBook = async () => {
    setMode('creating');
    setError(null);
    try {
      const { inviteCode: code } = await createBook(user.uid, displayName);
      setInviteCode(code);
      setMode('created');
    } catch {
      setError("We couldn't create your book. Check your connection and try again.");
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
    } catch {
      setError("We couldn't join that book. Check your connection and try again.");
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 44 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size={76} />
          <Text style={styles.title}>Locket</Text>
          <Text style={styles.subtitle}>
            {mode === 'created'
              ? 'Share this code with your partner'
              : 'Start a book, or join your partner’s'}
          </Text>
        </View>

        {(mode === 'choose' || mode === 'creating') && (
          <Animated.View entering={FadeIn}>
            <Pressable
              disabled={mode === 'creating'}
              onPress={startNewBook}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Ionicons name="book-outline" size={30} color={Colors.gold} />
              <Text style={styles.cardTitle}>Start a new book</Text>
              <Text style={styles.cardBody}>
                {mode === 'creating' ? 'Creating your book…' : 'Create a fresh album and invite your partner.'}
              </Text>
            </Pressable>

            <Pressable
              disabled={mode === 'creating'}
              onPress={() => {
                setError(null);
                setMode('join');
              }}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <Ionicons name="enter-outline" size={30} color={Colors.gold} />
              <Text style={styles.cardTitle}>Join with a code</Text>
              <Text style={styles.cardBody}>Already have a 6-character invite code? Enter it here.</Text>
            </Pressable>
          </Animated.View>
        )}

        {mode === 'created' && (
          <Animated.View entering={FadeInDown} style={styles.codeBlock}>
            <Pressable onPress={copyCode} style={styles.codeBox}>
              <Text style={styles.code}>{inviteCode}</Text>
              <View style={styles.copyRow}>
                <Ionicons
                  name={copied ? 'checkmark-circle' : 'copy-outline'}
                  size={16}
                  color={copied ? Colors.online : Colors.gold}
                />
                <Text style={styles.copyText}>{copied ? 'Copied!' : 'Tap to copy'}</Text>
              </View>
            </Pressable>
            <Text style={styles.hint}>
              Your partner installs Locket, taps “Join with a code”, and enters this. Every photo
              either of you adds appears in both books instantly.
            </Text>
            <GoldButton label="Open our book" onPress={openBook} loading={busy} style={styles.cta} />
          </Animated.View>
        )}

        {mode === 'join' && (
          <Animated.View entering={FadeInDown} style={styles.joinBlock}>
            <TextInput
              value={codeInput}
              onChangeText={(t) => setCodeInput(t.toUpperCase().replace(/\s/g, ''))}
              placeholder="ABC123"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              style={styles.codeInput}
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <GoldButton label="Join book" onPress={joinExisting} loading={busy} style={styles.cta} />
            <Pressable onPress={() => setMode('choose')} style={styles.back} hitSlop={8}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
          </Animated.View>
        )}

        {mode === 'choose' && error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ink },
  container: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 34,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 38,
    color: Colors.gold,
    marginTop: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.inkLight,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: 22,
    marginBottom: 16,
  },
  cardPressed: {
    backgroundColor: Colors.inkLighter,
    borderColor: Colors.fieldBorder,
  },
  cardTitle: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    color: Colors.textOnInk,
    marginTop: 12,
  },
  cardBody: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textMuted,
    marginTop: 6,
  },
  codeBlock: {
    alignItems: 'center',
  },
  codeBox: {
    backgroundColor: Colors.inkLight,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 40,
    alignItems: 'center',
    width: '100%',
  },
  code: {
    fontFamily: Fonts.serifBold,
    fontSize: 46,
    letterSpacing: 10,
    color: Colors.gold,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  copyText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.textMuted,
  },
  hint: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 21,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  cta: {
    marginTop: 24,
    alignSelf: 'stretch',
  },
  joinBlock: {
    alignItems: 'center',
  },
  codeInput: {
    backgroundColor: Colors.inkLight,
    borderWidth: 1.5,
    borderColor: Colors.fieldBorder,
    borderRadius: 18,
    width: '100%',
    textAlign: 'center',
    fontFamily: Fonts.serifBold,
    fontSize: 34,
    letterSpacing: 10,
    color: Colors.textOnInk,
    paddingVertical: 20,
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
