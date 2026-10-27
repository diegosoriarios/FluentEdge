import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, fonts, radius, spacing } from '../../theme';

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
});
