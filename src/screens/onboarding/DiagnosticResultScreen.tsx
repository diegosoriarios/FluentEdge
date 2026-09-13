import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip } from '../../components/ui';
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
      <Card style={styles.levelCard}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{draft.level ?? score.level}</Text>
        </View>
        <Text style={styles.scoreText}>
          {score.correctCount} of {score.totalCount} correct
        </Text>
      </Card>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Areas to watch</Text>
        {score.weakAreas.length > 0 ? (
          <View style={styles.chipRow}>
            {score.weakAreas.map(area => (
              <Chip key={area} label={area} selected />
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>
            No recurring issues detected in the diagnostic.
          </Text>
        )}
        <Text style={styles.muted}>
          This estimate is refined as you complete real exercises.
        </Text>
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
    gap: spacing.md,
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
  levelText: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.primary,
  },
  scoreText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  card: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
