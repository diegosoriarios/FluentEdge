import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { Button, Card } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { getSession } from '../../data';
import { FeedbackContent } from '../exercise/FeedbackContent';
import { formatDateTime } from '../../utils/format';
import type { RootStackParamList, SessionSummary } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

export function SessionDetailScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getSession(sessionId)
      .then(next => {
        if (!cancelled) {
          setSession(next);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return <Screen title="Session" />;
  }

  if (!session) {
    return (
      <Screen title="Session" subtitle="Session not found">
        <Text style={{ color: colors.textMuted }}>This session no longer exists.</Text>
      </Screen>
    );
  }

  const unanswered = session.evaluation == null && session.response.trim().length === 0;
  const unevaluated = session.evaluation == null && !unanswered;

  return (
    <Screen title="Session" subtitle={formatDateTime(session.createdAt)}>
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={styles.promptLabel}>Prompt</Text>
        <Text style={styles.promptText}>{session.prompt}</Text>
      </Card>
      {unanswered ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingText}>
            You haven&apos;t answered this exercise yet.
          </Text>
          <Button
            title="Continue exercise"
            onPress={() =>
              navigation.navigate('Exercise', { sessionId: session.id })
            }
          />
        </Card>
      ) : unevaluated ? (
        <Card style={styles.pendingCard}>
          <Text style={styles.pendingText}>
            This response hasn&apos;t been evaluated yet.
          </Text>
          <Button
            title="Review & submit"
            onPress={() =>
              navigation.navigate('Exercise', { sessionId: session.id })
            }
          />
        </Card>
      ) : (
        <FeedbackContent session={session} readOnly />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  promptText: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  pendingCard: {
    gap: spacing.sm,
  },
  pendingText: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
