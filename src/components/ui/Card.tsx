import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: 'default' | 'primary' | 'danger';
  gap?: number;
};

export function Card({ children, style, tone = 'default', gap }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        gap != null && { gap },
        tone === 'primary' && styles.cardPrimary,
        tone === 'danger' && styles.cardDanger,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
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
  cardPrimary: {
    borderColor: colors.primary,
  },
  cardDanger: {
    borderColor: colors.danger,
  },
});
