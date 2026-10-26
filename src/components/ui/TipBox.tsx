import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { colors, radius, spacing } from '../../theme';

type Props = {
  label?: string;
  children: ReactNode;
};

export function TipBox({ label, children }: Props) {
  return (
    <View style={styles.box}>
      {label ? (
        <AppText variant="micro" tone="primary" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <AppText variant="bodySmall">{children}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    gap: 2,
  },
  label: {
    color: colors.primary,
  },
});
