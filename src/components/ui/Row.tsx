import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { spacing } from '../../theme';

type Props = {
  children: ReactNode;
  wrap?: boolean;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  gap?: number;
  style?: StyleProp<ViewStyle>;
};

export function Row({
  children,
  wrap = false,
  align = 'center',
  justify,
  gap = spacing.sm,
  style,
}: Props) {
  return (
    <View
      style={[
        styles.row,
        wrap && styles.wrap,
        { gap, alignItems: align },
        justify ? { justifyContent: justify } : undefined,
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  wrap: {
    flexWrap: 'wrap',
  },
});
