import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fonts, radius, spacing } from '../theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: ButtonProps) {
  const inert = disabled || loading;
  const label = (
    <Text
      style={[
        styles.buttonText,
        variant === 'secondary' && styles.buttonTextSecondary,
        variant === 'danger' && styles.buttonTextDanger,
      ]}>
      {title}
    </Text>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={inert}
      style={({ pressed }) => [
        styles.buttonWrap,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
        style,
      ]}>
      {variant === 'primary' ? (
        <LinearGradient
          colors={[colors.primary, colors.violet]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.buttonKinetic}>
          {loading ? <ActivityIndicator color={colors.text} /> : label}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.buttonFlat,
            variant === 'secondary' && styles.buttonSecondary,
            variant === 'danger' && styles.buttonDanger,
          ]}>
          {loading ? <ActivityIndicator color={colors.primary} /> : label}
        </View>
      )}
    </Pressable>
  );
}

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        onPress && pressed && styles.chipPressed,
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export function ProgressBar({ progress }: { progress: number }) {
  const flex = Math.max(progress, 0.02);
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={[colors.primary, colors.success]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.progressFill, { flex }]}>
        <View style={styles.progressTip} />
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonWrap: {
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  buttonKinetic: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: colors.primaryDark,
  },
  buttonFlat: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  buttonSecondary: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderBright,
  },
  buttonDanger: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger + '55',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.semibold,
  },
  buttonTextSecondary: {
    color: colors.text,
  },
  buttonTextDanger: {
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderTopColor: '#FFFFFF2E',
    borderColor: colors.border,
    padding: spacing.md,
    shadowColor: '#000000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
    fontFamily: fonts.semibold,
  },
  progressTrack: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    overflow: 'hidden',
  },
  progressFill: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  progressTip: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 2,
    backgroundColor: colors.text,
    opacity: 0.9,
  },
});
