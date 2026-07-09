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

export default function Login() {
  const insets = useSafeAreaInsets();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      // The auth gate handles navigation once the session resolves.
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError('Enter your email above, then tap “Forgot password”.');
      return;
    }
    try {
      await resetPassword(email);
      setInfo('Check your inbox — we sent a reset link.');
    } catch (e) {
      setError(authErrorMessage(e));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
          <Logo size={84} />
          <Text style={styles.title}>Locket</Text>
          <Text style={styles.subtitle}>Welcome back to your shared book</Text>
        </Animated.View>

        <View style={styles.form}>
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
            placeholder="Your password"
            secure
            autoCapitalize="none"
            textContentType="password"
          />

          <Pressable onPress={onForgot} style={styles.forgot} hitSlop={8}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <GoldButton label="Sign in" onPress={onSubmit} loading={loading} style={styles.button} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here? </Text>
          <Link href={'/(auth)/signup' as any} asChild>
            <Pressable hitSlop={8}>
              <Text style={styles.footerLink}>Create a book</Text>
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
    marginBottom: 36,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 42,
    color: Colors.gold,
    marginTop: 14,
    letterSpacing: 1,
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
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 8,
    marginTop: 2,
  },
  forgotText: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.gold,
  },
  error: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.coral,
    marginBottom: 12,
    textAlign: 'center',
  },
  info: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    color: Colors.online,
    marginBottom: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 6,
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
