import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card } from '../../components/ui';
import { colors, spacing } from '../../theme';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

const HIGHLIGHTS = [
  'Writing exercises tailored to your level and goals',
  'Corrections with explanations, powered by an on-device model',
  'Fully offline — your writing never leaves the phone',
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <Screen title="FluentEdge" subtitle="Your offline English writing tutor">
      <Card style={styles.card}>
        {HIGHLIGHTS.map(highlight => (
          <View key={highlight} style={styles.highlightRow}>
            <View style={styles.dot} />
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </Card>
      <Button
        title="Get started"
        onPress={() => navigation.navigate('DiagnosticTest')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: spacing.sm + 2,
  },
  highlightText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
});
