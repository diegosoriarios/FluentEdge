import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { AppText, Card } from '../../components/ui';
import { spacing } from '../../theme';
import { getWeeklyRecap } from '../../data';
import type { WeeklyRecap } from '../../data/sessionsRepo';

export function WeeklyRecapCard() {
  const [recap, setRecap] = useState<WeeklyRecap | null>(null);

  useEffect(() => {
    let cancelled = false;
    getWeeklyRecap()
      .then(next => {
        if (!cancelled) {
          setRecap(next);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!recap || recap.sessionCount === 0) {
    return null;
  }

  return (
    <Card tone="primary" gap={spacing.xs} style={styles.card}>
      <AppText variant="body" tone="primary" style={styles.accent}>
        Your last 7 days
      </AppText>
      <AppText variant="bodySmall">
        {recap.sessionCount} session{recap.sessionCount === 1 ? '' : 's'} ·{' '}
        {recap.correctionsFixed} mistake
        {recap.correctionsFixed === 1 ? '' : 's'} fixed · {recap.streakDays}
        -day streak
      </AppText>
      {recap.topErrorType ? (
        <AppText variant="caption">
          Most frequent issue: {recap.topErrorType}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  accent: {
    fontWeight: '600',
  },
});
