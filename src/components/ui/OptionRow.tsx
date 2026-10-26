import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../../theme';

type Props = {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  radioPosition?: 'left' | 'right';
};

export function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
  disabled = false,
  radioPosition = 'right',
}: Props) {
  const radio = (
    <View style={[styles.radio, selected && styles.radioSelected]} />
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.container,
        selected && styles.containerSelected,
        disabled && styles.containerDisabled,
        pressed && styles.containerPressed,
      ]}>
      {radioPosition === 'left' ? radio : null}
      <View style={styles.textWrap}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="bodySmall" tone="muted" style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {radioPosition === 'right' ? radio : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  containerSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  containerPressed: {
    opacity: 0.75,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  textWrap: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.inputBorder,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});
