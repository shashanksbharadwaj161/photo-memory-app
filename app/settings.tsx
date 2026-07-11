import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Typography } from '@/constants/typography';
import { Spacing } from '@/constants/spacing';
import { useAuth } from '@/hooks/useAuth';
import { useBook } from '@/hooks/useBook';
import {
  UserProfile,
  getUserProfile,
  updateUserProfile,
  updateBookName,
  setNotificationPrefs,
  leaveBook,
  PARTNER_COLORS,
  PARTNER_COLOR_NAMES,
} from '@/lib/book';
import { savePhotosToDevice } from '@/lib/storage';
import { unregisterMemoryTask } from '@/lib/memories';
import {
  isClaudeEnabled,
  setClaudeEnabled,
  getClaudeApiKey,
  saveClaudeApiKey,
  clearClaudeApiKey,
  isValidClaudeKey,
} from '@/lib/claude';
import { getAmbientTimeout, setAmbientTimeout } from '@/lib/ambient';
import { isQuietSoundEnabled, setQuietSoundEnabled } from '@/lib/quietSound';
import { PartnerAvatar } from '@/components/PartnerAvatar';

const AMBIENT_OPTIONS: { label: string; ms: number }[] = [
  { label: 'Off', ms: 0 },
  { label: '30s', ms: 30000 },
  { label: '45s', ms: 45000 },
  { label: '60s', ms: 60000 },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, bookId, signOut, setBookId } = useAuth();
  const { book, partner, photos } = useBook(bookId, user?.uid);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [name, setName] = useState(user?.displayName ?? '');
  const [bookName, setBookName] = useState('');
  const [notifyMemories, setNotifyMemories] = useState(true);
  const [notifyPostcards, setNotifyPostcards] = useState(true);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<{ saved: number; total: number } | null>(null);

  // Claude AI
  const [claudeEnabled, setClaudeEnabledState] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [keyError, setKeyError] = useState(false);

  // Ambient mode + quiet sound
  const [ambientMs, setAmbientMs] = useState(45000);
  const [quietSound, setQuietSoundState] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      if (p) {
        setProfile(p);
        if (p.displayName) setName(p.displayName);
        setNotifyMemories(p.notifyMemories !== false);
        setNotifyPostcards(p.notifyPostcards !== false);
      }
    });
  }, [user]);

  useEffect(() => {
    if (book?.name) setBookName(book.name);
  }, [book?.name]);

  useEffect(() => {
    isClaudeEnabled().then(setClaudeEnabledState);
    getClaudeApiKey().then((k) => setApiKey(k ?? ''));
    getAmbientTimeout().then(setAmbientMs);
    isQuietSoundEnabled().then(setQuietSoundState);
  }, []);

  const myColor = profile?.color ?? PARTNER_COLORS[0];
  const keyIsValid = isValidClaudeKey(apiKey);

  const saveName = () => {
    if (!user) return;
    const trimmed = name.trim();
    if (trimmed && trimmed !== (profile?.displayName ?? user.displayName)) {
      updateUserProfile(user.uid, bookId, { displayName: trimmed }).catch(() => {});
      setProfile((p) => ({ ...(p ?? {}), displayName: trimmed }));
    }
  };

  const saveBookName = () => {
    if (bookId && bookName.trim() && bookName.trim() !== book?.name) {
      updateBookName(bookId, bookName).catch(() => {});
    }
  };

  const pickColor = (color: string) => {
    if (!user) return;
    Haptics.selectionAsync().catch(() => {});
    setProfile((p) => ({ ...(p ?? {}), color }));
    updateUserProfile(user.uid, bookId, { color }).catch(() => {});
  };

  const copyCode = async () => {
    if (!book?.inviteCode) return;
    await Clipboard.setStringAsync(book.inviteCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const toggleMemories = (v: boolean) => {
    setNotifyMemories(v);
    if (user) setNotificationPrefs(user.uid, { notifyMemories: v }).catch(() => {});
  };
  const togglePostcards = (v: boolean) => {
    setNotifyPostcards(v);
    if (user) setNotificationPrefs(user.uid, { notifyPostcards: v }).catch(() => {});
  };

  const toggleClaude = (v: boolean) => {
    setClaudeEnabledState(v);
    setClaudeEnabled(v).catch(() => {});
  };

  const commitApiKey = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setKeyError(false);
      return;
    }
    if (isValidClaudeKey(trimmed)) {
      setKeyError(false);
      saveClaudeApiKey(trimmed).catch(() => {});
    } else {
      setKeyError(true);
    }
  };

  const doClearKey = () => {
    setApiKey('');
    setKeyError(false);
    setClaudeEnabledState(false);
    clearClaudeApiKey().catch(() => {});
  };

  const pickAmbient = (ms: number) => {
    Haptics.selectionAsync().catch(() => {});
    setAmbientMs(ms);
    setAmbientTimeout(ms).catch(() => {});
  };

  const toggleQuietSound = (v: boolean) => {
    setQuietSoundState(v);
    setQuietSoundEnabled(v).catch(() => {});
  };

  const exportAll = async () => {
    if (photos.length === 0) {
      Alert.alert('Nothing to export yet', 'Add a few photos first.');
      return;
    }
    setExporting({ saved: 0, total: photos.length });
    const result = await savePhotosToDevice(
      photos.map((p) => p.url),
      (p) => setExporting(p)
    );
    setExporting(null);
    if (!result.permission) {
      Alert.alert('Permission needed', 'Allow photo access to export your book to your phone.');
    } else {
      Alert.alert('Export complete', `Saved ${result.saved} of ${result.total} photos to your gallery.`);
    }
  };

  const doSignOut = () => {
    Alert.alert('Sign out?', 'You can always sign back in.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.back();
        },
      },
    ]);
  };

  const doLeave = () => {
    Alert.alert(
      'Leave this book?',
      'Your photos stay in the book, but you’ll be disconnected from it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            if (user && bookId) {
              await leaveBook(user.uid, bookId).catch(() => {});
              await unregisterMemoryTask();
              setBookId(null);
              router.back();
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={26} color={Colors.textOnInk} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile */}
        <Section title="You">
          <View style={styles.profileRow}>
            <PartnerAvatar name={name || 'Me'} color={myColor} size={54} />
            <View style={styles.profileFields}>
              <Text style={styles.fieldLabel}>Display name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                onEndEditing={saveName}
                onBlur={saveName}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                style={styles.inlineInput}
              />
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Avatar colour</Text>
          <View style={styles.swatchRow}>
            {PARTNER_COLORS.map((c, i) => (
              <Pressable
                key={c}
                onPress={() => pickColor(c)}
                style={[styles.swatch, { backgroundColor: c }, myColor === c && styles.swatchActive]}
                accessibilityLabel={PARTNER_COLOR_NAMES[i]}
              >
                {myColor === c && <Ionicons name="checkmark" size={18} color={Colors.ink} />}
              </Pressable>
            ))}
          </View>
        </Section>

        {/* Partner */}
        <Section title="Your partner">
          {partner ? (
            <View style={styles.partnerRow}>
              <PartnerAvatar name={partner.name} color={partner.color} size={40} />
              <Text style={styles.partnerName}>{partner.name}</Text>
            </View>
          ) : (
            <Text style={styles.muted}>Waiting for your partner to join with your code.</Text>
          )}
        </Section>

        {/* Invite */}
        <Section title="Invite code">
          <Pressable onPress={copyCode} style={styles.codeBox}>
            <Text style={styles.code}>{book?.inviteCode ?? '••••••'}</Text>
          </Pressable>
          <View style={styles.copyRow}>
            <Text style={styles.muted}>Share this so your partner can join your book.</Text>
            <View style={styles.copyBtn}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={16}
                color={copied ? Colors.online : Colors.gold}
              />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </View>
          </View>
        </Section>

        {/* Book */}
        <Section title="Book">
          <Row label="Book name" last>
            <TextInput
              value={bookName}
              onChangeText={setBookName}
              onEndEditing={saveBookName}
              onBlur={saveBookName}
              placeholder="Our Book"
              placeholderTextColor={Colors.textMuted}
              style={styles.rowInput}
              textAlign="right"
            />
          </Row>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <Row label="Memory resurfacing">
            <ToggleSwitch value={notifyMemories} onValueChange={toggleMemories} />
          </Row>
          <Row label="Postcard alerts" last>
            <ToggleSwitch value={notifyPostcards} onValueChange={togglePostcards} />
          </Row>
        </Section>

        {/* Display */}
        <Section title="Display">
          <Row label="Quiet Page sound" last>
            <ToggleSwitch value={quietSound} onValueChange={toggleQuietSound} />
          </Row>
        </Section>

        {/* Ambient mode */}
        <Section title="Ambient mode">
          <Text style={styles.muted}>
            When the book sits idle, let it drift into a slideshow of your memories.
          </Text>
          <View style={styles.ambientRow}>
            {AMBIENT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => pickAmbient(opt.ms)}
                style={[styles.ambientChip, ambientMs === opt.ms && styles.ambientChipActive]}
              >
                <Text
                  style={[styles.ambientChipText, ambientMs === opt.ms && styles.ambientChipTextActive]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {/* Claude AI */}
        <Section title="Claude AI">
          <Row label="Enable Claude AI" last={!claudeEnabled}>
            <Switch
              value={claudeEnabled}
              onValueChange={toggleClaude}
              trackColor={{ true: Colors.gold, false: Colors.inkLight }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={Colors.inkLight}
            />
          </Row>

          {claudeEnabled && (
            <View style={styles.claudeBlock}>
              <View style={styles.claudeKeyHeader}>
                <Text style={styles.fieldLabel}>API key</Text>
                {keyIsValid && (
                  <View style={styles.connectedRow}>
                    <View style={styles.connectedDot} />
                    <Text style={styles.connectedText}>Connected</Text>
                  </View>
                )}
              </View>
              <TextInput
                value={apiKey}
                onChangeText={(t) => {
                  setApiKey(t);
                  setKeyError(false);
                }}
                onBlur={commitApiKey}
                onEndEditing={commitApiKey}
                placeholder="sk-ant-…"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.inlineInput}
              />
              {keyError && <Text style={styles.keyError}>Should start with sk-ant-</Text>}

              <Text style={styles.claudeExplainer}>
                Your key is stored only on this device. Claude suggests captions, writes memory
                stories, and helps with postcards. The app works fully without it.
              </Text>

              {!!apiKey && (
                <Pressable onPress={doClearKey} hitSlop={8}>
                  <Text style={styles.clearKey}>Clear key</Text>
                </Pressable>
              )}
            </View>
          )}
        </Section>

        {/* Export */}
        <Section title="Your memories">
          <Pressable onPress={exportAll} disabled={!!exporting} style={styles.rowBtn}>
            <Ionicons name="download-outline" size={20} color={Colors.gold} />
            <Text style={styles.rowBtnText}>
              {exporting
                ? `Exporting ${exporting.saved}/${exporting.total}…`
                : 'Export all photos to phone'}
            </Text>
          </Pressable>
        </Section>

        {/* Account */}
        <Section title="Account" last>
          <Pressable onPress={doSignOut} style={styles.rowBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textOnInk} />
            <Text style={[styles.rowBtnText, { color: Colors.textOnInk }]}>Sign out</Text>
          </Pressable>
          <Pressable onPress={doLeave} style={styles.rowBtn}>
            <Ionicons name="exit-outline" size={20} color={Colors.coral} />
            <Text style={[styles.rowBtnText, { color: Colors.coral }]}>Leave book</Text>
          </Pressable>
        </Section>

        <Text style={styles.version}>Locket · v2.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  children,
  last,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.section, last && { marginBottom: 8 }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionRule} />
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowRule]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValue}>{children}</View>
    </View>
  );
}

function ToggleSwitch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ true: Colors.gold, false: Colors.inkLight }}
      thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
      ios_backgroundColor={Colors.inkLight}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.ink },
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
    fontSize: 20,
    color: Colors.textOnInk,
  },
  scroll: {
    paddingHorizontal: Spacing.pageMargin,
    paddingTop: Spacing.lg,
  },
  section: {
    marginTop: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    ...Typography.labelGold,
  },
  sectionRule: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.separator,
  },
  sectionBody: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowRule: {
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.separator,
  },
  rowLabel: {
    ...Typography.body,
    fontSize: 15,
  },
  rowValue: {
    alignItems: 'flex-end',
  },
  rowInput: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textWarm,
    minWidth: 100,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 10,
  },
  profileFields: {
    flex: 1,
  },
  fieldLabel: {
    ...Typography.label,
  },
  inlineInput: {
    ...Typography.body,
    fontSize: 17,
    color: Colors.textWarm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.separator,
    paddingVertical: 8,
    marginTop: 4,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    paddingBottom: 6,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Colors.paper,
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 6,
  },
  partnerName: {
    fontFamily: Fonts.serifBold,
    fontSize: 18,
    color: Colors.textWarm,
  },
  muted: {
    ...Typography.bodyMuted,
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: Colors.surfaceSunken,
    borderRadius: Spacing.radiusMd,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.goldBorder,
    paddingVertical: 22,
    alignItems: 'center',
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 28,
    letterSpacing: 8,
    color: Colors.gold,
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 10,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    ...Typography.labelGold,
  },
  ambientRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  ambientChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Spacing.radiusPill,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  ambientChipActive: {
    borderColor: Colors.gold,
    backgroundColor: Colors.goldSubtle,
  },
  ambientChipText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textMuted,
  },
  ambientChipTextActive: {
    color: Colors.gold,
  },
  claudeBlock: {
    paddingBottom: 16,
  },
  claudeKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.online,
  },
  connectedText: {
    ...Typography.label,
    color: Colors.online,
  },
  keyError: {
    ...Typography.bodyMuted,
    color: Colors.coral,
    marginTop: 6,
  },
  claudeExplainer: {
    ...Typography.bodyMuted,
    lineHeight: 19,
    marginTop: 14,
  },
  clearKey: {
    ...Typography.labelGold,
    marginTop: 14,
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  rowBtnText: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.gold,
  },
  version: {
    fontFamily: Fonts.serifItalic,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 30,
  },
});
