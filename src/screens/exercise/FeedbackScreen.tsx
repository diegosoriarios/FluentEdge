import { useEffect, useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/ui';
import { spacing } from '../../theme';
import { getSession } from '../../data';
import { FeedbackContent } from './FeedbackContent';
import type { RootStackParamList, SessionSummary } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Feedback'>;

export function FeedbackScreen({ route, navigation }: Props) {
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
    return <Screen title="Feedback" />;
  }

  if (!session) {
    return (
      <Screen title="Feedback" subtitle="Session not found">
        <Button title="Back home" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  return (
    <Screen title="Feedback" subtitle="Review your corrections">
      <FeedbackContent session={session} />
      <Button
        title="Done"
        onPress={() => navigation.popToTop()}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}
