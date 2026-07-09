import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Logo } from '@/components/Logo';
import { BreathingDot } from '@/components/BreathingDot';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

export default function Index() {
  const { initializing, bookResolved, user, bookId, configured } = useAuth();

  if (!configured) return <ConfigNeeded />;
  if (initializing || !bookResolved) return <Splash />;
  if (!user) return <Redirect href={'/(auth)/login' as any} />;
  if (!bookId) return <Redirect href={'/onboarding' as any} />;
  return <Redirect href={'/(app)/book' as any} />;
}

function Splash() {
  return (
    <View style={styles.splash}>
      <Logo size={104} />
      <Text style={styles.title}>Locket</Text>
      <BreathingDot style={styles.dot} />
    </View>
  );
}

function ConfigNeeded() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.splash, { paddingTop: insets.top, paddingHorizontal: 32 }]}>
      <Logo size={92} />
      <Text style={styles.title}>Locket</Text>
      <Text style={styles.configHeading}>Almost there</Text>
      <Text style={styles.configBody}>
        Add your Firebase credentials in{' '}
        <Text style={styles.mono}>lib/firebase.ts</Text> to bring Locket to life. The full
        walkthrough is in <Text style={styles.mono}>SETUP.md</Text>.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 40,
    color: Colors.gold,
    marginTop: 16,
    letterSpacing: 1,
  },
  dot: {
    marginTop: 28,
  },
  configHeading: {
    fontFamily: Fonts.serifItalic,
    fontSize: 20,
    color: Colors.textOnInk,
    marginTop: 28,
  },
  configBody: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    lineHeight: 23,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
  },
  mono: {
    color: Colors.gold,
    fontFamily: Fonts.serifBold,
  },
});
