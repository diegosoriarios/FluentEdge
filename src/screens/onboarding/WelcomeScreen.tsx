import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText, Button, Card, Row } from '../../components/ui';
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
      <Card gap={spacing.md} style={styles.card}>
        {HIGHLIGHTS.map(highlight => (
          <Row key={highlight} align="center">
            <View style={styles.dot} />
            <AppText variant="body" style={styles.highlightText}>
              {highlight}
            </AppText>
          </Row>
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
  },
});
