import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type Props = {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  scroll?: boolean;
  avoidKeyboard?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  avoidKeyboard = false,
  style,
}: Props) {
  const header =
    title || subtitle ? (
      <View style={styles.header}>
        {title ? <Text style={styles.title}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    ) : null;

  let content: ReactNode =
    scroll ? (
      <ScrollView
        style={styles.fill}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {header}
        <View style={[styles.content, style]}>{children}</View>
      </ScrollView>
    ) : (
      <View style={styles.fill}>
        {header}
        <View style={[styles.content, styles.contentFill, style]}>
          {children}
        </View>
      </View>
    );

  if (avoidKeyboard) {
    content = (
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {content}
      </KeyboardAvoidingView>
    );
  }

  return <SafeAreaView style={styles.safe}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: 15,
    color: colors.textMuted,
  },
  content: {
    padding: spacing.lg,
  },
  contentFill: {
    flex: 1,
  },
});
