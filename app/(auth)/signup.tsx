import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { Logo } from '@/components/Logo';
import { Field } from '@/components/Field';
import { GoldButton } from '@/components/GoldButton';
import { useAuth, authErrorMessage } from '@/hooks/useAuth';

export default function Signup() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('What should we call you?');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, name);
      // No book yet → the auth gate sends the user to onboarding.
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Logo size={76} />
          <Text style={styles.title}>Create your book</Text>
          <Text style={styles.subtitle}>Two people, one shared album</Text>
        </Animated.View>

        <View style={styles.form}>
          <Field
            label="Your name"
            icon="person-outline"
            value={name}
            onChangeText={setName}
            placeholder="Shown on every photo you add"
            autoCapitalize="words"
            textContentType="name"
          />
          <Field
            label="Email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secure
            autoCapitalize="none"
            textContentType="newPassword"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <GoldButton label="Create account" onPress={onSubmit} loading={loading} style={styles.button} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href={'/(auth)/login' as any} asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.ink },
  container: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 30,
    color: Colors.gold,
    marginTop: 14,
  },
  subtitle: {
    fontFamily: Fonts.serifItalic,
    fontSize: 16,
    color: Colors.textMuted,
    marginTop: 6,
  },
  form: {
    marginBottom: 20,
  },
  error: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.coral,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    color: Colors.textMuted,
  },
  footerLink: {
    fontFamily: Fonts.serifBold,
    fontSize: 15,
    color: Colors.gold,
  },
});
