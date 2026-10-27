import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText, Button, Card, Chip, Row } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import { scoreDiagnostic } from '../../data/diagnostic';
import { useOnboarding } from '../../context/OnboardingContext';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DiagnosticResult'>;

export function DiagnosticResultScreen({ navigation }: Props) {
  const { draft } = useOnboarding();
  const score = scoreDiagnostic(draft.answers);

  return (
    <Screen title="Your starting point" subtitle="Provisional estimate from the diagnostic">
      <Card gap={spacing.md} style={styles.levelCard}>
        <View style={styles.levelBadge}>
          <AppText variant="hero" tone="primary">
            {draft.level ?? score.level}
          </AppText>
        </View>
        <AppText variant="body" tone="muted">
          {score.correctCount} of {score.totalCount} correct
        </AppText>
      </Card>
      <Card gap={spacing.sm} style={styles.card}>
        <AppText variant="title">Areas to watch</AppText>
        {score.weakAreas.length > 0 ? (
          <Row wrap>
            {score.weakAreas.map(area => (
              <Chip key={area} label={area} selected />
            ))}
          </Row>
        ) : (
          <AppText variant="bodySmall" tone="muted">
            No recurring issues detected in the diagnostic.
          </AppText>
        )}
        <AppText variant="bodySmall" tone="muted">
          This estimate is refined as you complete real exercises.
        </AppText>
      </Card>
      <Button
        title="Continue"
        onPress={() => navigation.navigate('Goals')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  levelCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  levelBadge: {
    width: 96,
    height: 96,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: spacing.lg,
  },
});
