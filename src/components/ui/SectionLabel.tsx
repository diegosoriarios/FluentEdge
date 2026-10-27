import { StyleSheet, Text } from 'react-native';
import { colors, fonts, spacing } from '../../theme';

type Props = {
  children: string;
  tone?: 'muted' | 'primary';
};

export function SectionLabel({ children, tone = 'muted' }: Props) {
  return (
    <Text style={[styles.label, tone === 'primary' && styles.labelPrimary]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    fontFamily: fonts.semibold,
  },
  labelPrimary: {
    color: colors.primary,
  },
});
