import { useCallback, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { StreakCard } from '../../components/StreakCard';
import {
  AppText,
  Button,
  Card,
  Chip,
  Row,
  SectionLabel,
} from '../../components/ui';
import { spacing } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { useModel } from '../../context/ModelContext';
import { useSessionStats, useWeakSpots } from '../../hooks/useSessionData';
import { GOAL_LABELS } from '../../data/prompts';
import { getPromptForProfile } from '../../data/prompts';
import {
  countDueMistakes,
  insertSession,
  listDueMistakes,
} from '../../data';
import { nextExerciseType } from '../../utils/exercises';
import {
  prefetchNextExercise,
  takeCachedExercise,
} from '../../services/exerciseCache';
import {
  prefetchReviewQuestion,
  takeCachedReviewQuestion,
} from '../../services/reviewCache';
import { createId } from '../../utils/id';
import type { GeneratedExercise } from '../../ai/tutor';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const {
    modelState,
    generateExercise,
    generateClozeReviewQuestion,
  } = useModel();
  const { stats, reload: reloadStats } = useSessionStats();
  const { summary: weakSpotsSummary, topErrorTypes, reload: reloadWeakSpots } =
    useWeakSpots();
  const [generating, setGenerating] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [startingReview, setStartingReview] = useState(false);
  const modelReady = modelState === 'ready';

  useFocusEffect(
    useCallback(() => {
      reloadStats();
      countDueMistakes()
        .then(setDueCount)
        .catch(() => {});
      let cancelled = false;
      (async () => {
        const summary = await reloadWeakSpots();
        if (!cancelled && modelReady && profile) {
          prefetchNextExercise(profile, summary).catch(() => {});
          const [mistake] = await listDueMistakes(1).catch(() => []);
          if (mistake && !cancelled) {
            prefetchReviewQuestion(
              {
                id: mistake.id,
                errorType: mistake.errorType,
                originalPhrase: mistake.originalPhrase,
                correctedPhrase: mistake.correctedPhrase,
                explanation: mistake.explanation,
              },
              profile,
            ).catch(() => {});
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [reloadStats, reloadWeakSpots, modelReady, profile]),
  );

  const startReview = async () => {
    if (!profile || !modelReady || startingReview) {
      return;
    }
    setStartingReview(true);
    try {
      const [mistake] = await listDueMistakes(1);
      if (!mistake) {
        setDueCount(0);
        return;
      }
      const mistakeInput = {
        errorType: mistake.errorType,
        originalPhrase: mistake.originalPhrase,
        correctedPhrase: mistake.correctedPhrase,
        explanation: mistake.explanation,
      };
      const exercise =
        takeCachedReviewQuestion(mistake.id, profile) ??
        (await generateClozeReviewQuestion(mistakeInput, profile));
      const sessionId = createId('s_');
      await insertSession(
        sessionId,
        exercise.question,
        'multiple_choice',
        exercise,
        mistake.id,
      );
      navigation.navigate('Exercise', { sessionId });
    } catch (error) {
      Alert.alert(
        'Review unavailable',
        error instanceof Error
          ? error.message
          : 'Could not prepare the review question. Try again.',
      );
    } finally {
      setStartingReview(false);
    }
  };

  const startExercise = async () => {
    if (!profile || !modelReady || generating) {
      return;
    }
    setGenerating(true);
    const sessionId = createId('s_');
    try {
      let generated =
        takeCachedExercise(profile, weakSpotsSummary) ?? (await generateNew());
      await insertSession(
        sessionId,
        generated.prompt,
        generated.type,
        generated.exercise,
      );
      navigation.navigate('Exercise', { sessionId });
    } finally {
      setGenerating(false);
    }
  };

  const generateNew = async (): Promise<GeneratedExercise> => {
    if (!profile) {
      throw new Error('Profile is missing.');
    }
    try {
      return await generateExercise(
        profile,
        nextExerciseType(),
        weakSpotsSummary,
      );
    } catch {
      return {
        type: 'paragraph',
        prompt: getPromptForProfile(profile),
        exercise: null,
      };
    }
  };

  return (
    <Screen title="FluentEdge" subtitle="Practice makes progress">
      {!modelReady ? (
        <Card tone="primary" gap={spacing.xs} style={styles.banner}>
          <AppText variant="body" tone="primary" style={styles.accent}>
            AI model not downloaded
          </AppText>
          <AppText variant="bodySmall" tone="muted">
            Download the on-device model in Settings to start practicing.
          </AppText>
        </Card>
      ) : null}
      <StreakCard
        streakDays={stats.streakDays}
        practiceDays={stats.practiceDays}
        style={styles.streakCard}
      />
      <View style={styles.statsRow}>
        <Card gap={2} style={styles.statCard}>
          <AppText variant="stat">{stats.totalSessions}</AppText>
          <AppText variant="micro">Sessions</AppText>
        </Card>
        <Card gap={2} style={styles.statCard}>
          <AppText variant="stat" tone="primary">
            {profile?.level ?? '—'}
          </AppText>
          <AppText variant="micro">Level</AppText>
        </Card>
      </View>
      {dueCount > 0 ? (
        <Card tone="primary" style={styles.reviewCard}>
          <View style={styles.reviewText}>
            <AppText variant="body" tone="primary" style={styles.accent}>
              Review due
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              {dueCount} mistake{dueCount === 1 ? '' : 's'}{' '}
              {dueCount === 1 ? 'is' : 'are'} ready — fix it before it sticks.
            </AppText>
          </View>
          <Button
            title={startingReview ? 'Preparing…' : 'Review'}
            onPress={startReview}
            disabled={!modelReady || profile == null}
            loading={startingReview}
            style={styles.reviewButton}
          />
        </Card>
      ) : null}
      {topErrorTypes.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>Weak spots</SectionLabel>
          <Row wrap>
            {topErrorTypes.map(error => (
              <Chip
                key={error.type}
                label={`${error.type} (${error.count})`}
              />
            ))}
          </Row>
        </View>
      ) : null}
      <Card gap={spacing.sm} style={styles.promptCard}>
        <SectionLabel>Today&apos;s focus</SectionLabel>
        <AppText variant="heading">
          {profile ? GOAL_LABELS[profile.goal] : '—'}
        </AppText>
        {stats.totalSessions > 0 ? (
          <AppText variant="bodySmall" tone="muted">
            Last session: {formatLastSeen(stats.lastSessionAt ?? undefined)}
          </AppText>
        ) : (
          <AppText variant="bodySmall" tone="muted">
            Complete your first exercise.
          </AppText>
        )}
      </Card>
      <Button
        title={generating ? 'Preparing…' : 'Start exercise'}
        onPress={startExercise}
        disabled={!modelReady || profile == null}
        loading={generating}
      />
    </Screen>
  );
}

function formatLastSeen(timestamp: number | undefined): string {
  if (timestamp == null) {
    return '—';
  }
  const days = Math.floor((Date.now() - timestamp) / 86400000);
  if (days === 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  return `${days} days ago`;
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: spacing.md,
  },
  accent: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  reviewText: {
    flex: 1,
    gap: 2,
  },
  reviewButton: {
    paddingHorizontal: spacing.md,
  },
  streakCard: {
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.md,
  },
  promptCard: {
    marginBottom: spacing.lg,
  },
});
