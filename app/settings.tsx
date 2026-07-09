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
import { PartnerAvatar } from '@/components/PartnerAvatar';

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

  const myColor = profile?.color ?? PARTNER_COLORS[0];

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

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Avatar colour</Text>
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
          <Pressable onPress={copyCode} style={styles.codeRow}>
            <Text style={styles.code}>{book?.inviteCode ?? '••••••'}</Text>
            <View style={styles.copyBtn}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? Colors.online : Colors.gold}
              />
              <Text style={styles.copyText}>{copied ? 'Copied' : 'Copy'}</Text>
            </View>
          </Pressable>
          <Text style={styles.muted}>
            Share this with your partner so they can join your book.
          </Text>
        </Section>

        {/* Book */}
        <Section title="Book">
          <Text style={styles.fieldLabel}>Book name</Text>
          <TextInput
            value={bookName}
            onChangeText={setBookName}
            onEndEditing={saveBookName}
            onBlur={saveBookName}
            placeholder="Our Book"
            placeholderTextColor={Colors.textMuted}
            style={styles.inlineInput}
          />
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <ToggleRow
            label="Memory resurfacing"
            value={notifyMemories}
            onValueChange={toggleMemories}
          />
          <ToggleRow label="Postcard alerts" value={notifyPostcards} onValueChange={togglePostcards} />
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
        <Section title="Account">
          <Pressable onPress={doSignOut} style={styles.rowBtn}>
            <Ionicons name="log-out-outline" size={20} color={Colors.textOnInk} />
            <Text style={[styles.rowBtnText, { color: Colors.textOnInk }]}>Sign out</Text>
          </Pressable>
          <Pressable onPress={doLeave} style={styles.rowBtn}>
            <Ionicons name="exit-outline" size={20} color={Colors.coral} />
            <Text style={[styles.rowBtnText, { color: Colors.coral }]}>Leave book</Text>
          </Pressable>
        </Section>

        <Text style={styles.version}>Locket · v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: Colors.gold, false: Colors.inkLighter }}
        thumbColor={Platform.OS === 'android' ? (value ? Colors.paper : Colors.textMuted) : undefined}
        ios_backgroundColor={Colors.inkLighter}
      />
    </View>
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
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  section: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 14,
    color: Colors.gold,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  sectionBody: {
    backgroundColor: Colors.inkLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.separator,
    padding: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileFields: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  inlineInput: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    color: Colors.textOnInk,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separator,
    paddingVertical: 6,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
  },
  partnerName: {
    fontFamily: Fonts.serifBold,
    fontSize: 18,
    color: Colors.textOnInk,
  },
  muted: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    marginTop: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  code: {
    fontFamily: Fonts.serifBold,
    fontSize: 30,
    letterSpacing: 6,
    color: Colors.gold,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.gold,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  toggleLabel: {
    fontFamily: Fonts.serif,
    fontSize: 16,
    color: Colors.textOnInk,
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
    marginTop: 4,
  },
});
