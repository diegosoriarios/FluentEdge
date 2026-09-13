import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../theme';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  message: string | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, message: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            The app hit an unexpected error. Your profile and progress are
            saved — try reloading.
          </Text>
          {this.state.message ? (
            <Text style={styles.detail}>{this.state.message}</Text>
          ) : null}
          <Pressable style={styles.button} onPress={this.reset}>
            <Text style={styles.buttonText}>Reload</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  body: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
  },
  detail: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '600',
  },
});
