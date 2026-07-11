import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

interface Props {
  children: React.ReactNode;
  /** Optional label shown in logs so we know which boundary tripped. */
  name?: string;
}
interface State {
  error: Error | null;
}

/**
 * Catches render/runtime errors in its subtree so a single broken screen shows
 * a friendly fallback (with a Try again button) instead of taking down the app
 * with a blank/white screen. Errors are also logged for debugging.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log(
      `[ErrorBoundary${this.props.name ? ':' + this.props.name : ''}] caught:`,
      error?.message,
      info?.componentStack
    );
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.root}>
          <Text style={styles.title}>Something went wrong here</Text>
          <Text style={styles.msg} numberOfLines={6}>
            {this.state.error.message || 'Unknown error'}
          </Text>
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text style={styles.btnText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  title: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    color: Colors.textOnInk,
    textAlign: 'center',
  },
  msg: {
    fontFamily: Fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  btn: {
    marginTop: 8,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  btnText: {
    fontFamily: Fonts.serifBold,
    fontSize: 16,
    color: Colors.ink,
  },
});
