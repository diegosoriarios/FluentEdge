import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, spacing } from '../../theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'success' | 'danger';
};

export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'default',
}: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        tone === 'success' && styles.chipSuccess,
        tone === 'danger' && styles.chipDanger,
        selected && styles.chipSelected,
        onPress && pressed && styles.chipPressed,
      ]}>
      <Text
        style={[
          styles.chipText,
          tone === 'success' && styles.chipTextSuccess,
          tone === 'danger' && styles.chipTextDanger,
          selected && styles.chipTextSelected,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: colors.glass,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderBright,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipSuccess: {
    backgroundColor: colors.successSoft,
    borderColor: colors.success,
  },
  chipDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  chipPressed: {
    opacity: 0.75,
  },
  chipText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: fonts.medium,
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
    fontFamily: fonts.semibold,
  },
  chipTextSuccess: {
    color: colors.success,
  },
  chipTextDanger: {
    color: colors.danger,
  },
});
