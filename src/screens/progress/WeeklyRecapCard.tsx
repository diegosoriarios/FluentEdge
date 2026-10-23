import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card } from '../../components/ui';
import { colors, spacing } from '../../theme';
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
    <Card style={styles.card}>
      <Text style={styles.title}>Your last 7 days</Text>
      <Text style={styles.line}>
        {recap.sessionCount} session{recap.sessionCount === 1 ? '' : 's'} ·{' '}
        {recap.correctionsFixed} mistake
        {recap.correctionsFixed === 1 ? '' : 's'} fixed · {recap.streakDays}
        -day streak
      </Text>
      {recap.topErrorType ? (
        <Text style={styles.muted}>
          Most frequent issue: {recap.topErrorType}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.xs,
    borderColor: colors.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  line: {
    fontSize: 14,
    color: colors.text,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
