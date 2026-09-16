import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { KeyboardEvent } from 'react-native';
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

function useKeyboardHeight(enabled: boolean) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const show = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);
  return keyboardHeight;
}

export function Screen({
  title,
  subtitle,
  children,
  scroll = true,
  avoidKeyboard = false,
  style,
}: Props) {
  const keyboardHeight = useKeyboardHeight(avoidKeyboard);
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
      <View
        style={[
          styles.fill,
          keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : null,
        ]}>
        {content}
      </View>
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
