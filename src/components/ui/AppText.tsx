import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import type { StyleProp, TextStyle } from 'react-native';
import { colors, fonts } from '../../theme';

export type AppTextVariant =
  | 'display'
  | 'stat'
  | 'hero'
  | 'heading'
  | 'title'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'micro'
  | 'label'
  | 'verdict'
  | 'mono';

export type AppTextTone =
  | 'text'
  | 'muted'
  | 'subdued'
  | 'primary'
  | 'success'
  | 'danger'
  | 'streak'
  | 'inverse';

type Props = {
  children: ReactNode;
  variant?: AppTextVariant;
  tone?: AppTextTone;
  numberOfLines?: number;
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
};

const MONO_FAMILY = Platform.select({ ios: 'Menlo', default: 'monospace' });

const variantStyles = StyleSheet.create({
  display: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: fonts.extrabold,
    letterSpacing: -0.5,
    color: colors.text,
  },
  stat: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fonts.extrabold,
    color: colors.text,
  },
  hero: {
    fontSize: 34,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.text,
  },
  heading: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  bodySmall: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.text,
  },
  caption: {
    fontSize: 13,
    color: colors.textMuted,
  },
  micro: {
    fontSize: 12,
    color: colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  verdict: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: fonts.bold,
    color: colors.text,
  },
  mono: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontFamily: MONO_FAMILY,
  },
});

const toneStyles: Record<AppTextTone, TextStyle> = {
  text: {},
  muted: { color: colors.textMuted },
  subdued: { color: colors.subdued },
  primary: { color: colors.primary },
  success: { color: colors.success },
  danger: { color: colors.danger },
  streak: { color: colors.streak },
  inverse: { color: colors.inverse },
};

export function AppText({
  children,
  variant = 'body',
  tone = 'text',
  numberOfLines,
  selectable,
  style,
}: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[variantStyles[variant], toneStyles[tone], style]}>
      {children}
    </Text>
  );
}
