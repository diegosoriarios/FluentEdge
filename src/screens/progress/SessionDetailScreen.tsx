import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, StyleSheet, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText, Button, Card, Chip, Row } from '../../components/ui';
import { spacing } from '../../theme';
import { deleteSession, getSession } from '../../data';
import { exerciseTypeLabel } from '../../utils/exercises';
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
        <AppText variant="body" tone="muted">
          This session no longer exists.
        </AppText>
      </Screen>
    );
  }

  const unanswered = session.evaluation == null && session.response.trim().length === 0;
  const unevaluated = session.evaluation == null && !unanswered;

  const confirmDelete = () => {
    Alert.alert(
      'Delete session?',
      'This removes the exercise, your response and its feedback.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSession(session.id)
              .then(() => navigation.goBack())
              .catch(error => {
                console.warn('Failed to delete session', error);
              });
          },
        },
      ],
    );
  };

  return (
    <Screen title="Session" subtitle={formatDateTime(session.createdAt)}>
      <Row style={styles.metaRow}>
        <Chip label={exerciseTypeLabel(session.type)} />
        {session.mistakeId ? <Chip label="Review" /> : null}
      </Row>
      <Card gap={spacing.xs} style={{ marginBottom: spacing.md }}>
        <AppText variant="label">Prompt</AppText>
        <AppText variant="body">{session.prompt}</AppText>
      </Card>
      {unanswered ? (
        <Card gap={spacing.sm}>
          <AppText variant="body" tone="muted">
            You haven&apos;t answered this exercise yet.
          </AppText>
          <Button
            title="Continue exercise"
            onPress={() =>
              navigation.navigate('Exercise', { sessionId: session.id })
            }
          />
        </Card>
      ) : unevaluated ? (
        <Card gap={spacing.sm}>
          <AppText variant="body" tone="muted">
            This response hasn&apos;t been evaluated yet.
          </AppText>
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
      <View style={styles.deleteRow}>
        <Button title="Delete session" variant="danger" onPress={confirmDelete} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  deleteRow: {
    marginTop: spacing.lg,
  },
  metaRow: {
    marginBottom: spacing.sm,
    alignItems: 'stretch',
  },
});
