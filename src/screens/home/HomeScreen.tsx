import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip, SectionLabel } from '../../components/ui';
import { colors, fonts, spacing } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { useModel } from '../../context/ModelContext';
import { useSessionStats, useWeakSpots } from '../../hooks/useSessionData';
import { GOAL_LABELS } from '../../data/prompts';
import { getPromptForProfile } from '../../data/prompts';
import { insertSession } from '../../data';
import { createId } from '../../utils/id';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const { profile } = useProfile();
  const { modelState, generatePrompt } = useModel();
  const { stats, reload: reloadStats } = useSessionStats();
  const { summary: weakSpotsSummary, topErrorTypes, reload: reloadWeakSpots } =
    useWeakSpots();
  const [generating, setGenerating] = useState(false);

  useFocusEffect(
    useCallback(() => {
      reloadStats();
      reloadWeakSpots();
    }, [reloadStats, reloadWeakSpots]),
  );

  const modelReady = modelState === 'ready';

  const startExercise = async () => {
    if (!profile || !modelReady || generating) {
      return;
    }
    setGenerating(true);
    try {
      let promptText: string;
      try {
        promptText = await generatePrompt(profile, weakSpotsSummary);
      } catch {
        promptText = getPromptForProfile(profile);
      }
      const sessionId = createId('s_');
      await insertSession(sessionId, promptText);
      navigation.navigate('Exercise', { sessionId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen title="FluentEdge" subtitle="Practice makes progress">
      {!modelReady ? (
        <Card style={styles.banner}>
          <Text style={styles.bannerTitle}>AI model not downloaded</Text>
          <Text style={styles.bannerText}>
            Download the on-device model in Settings to start practicing.
          </Text>
        </Card>
      ) : null}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalSessions}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.streak }]}>
            {stats.streakDays}
          </Text>
          <Text style={styles.statLabel}>Day streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {profile?.level ?? '—'}
          </Text>
          <Text style={styles.statLabel}>Level</Text>
        </Card>
      </View>
      {topErrorTypes.length > 0 ? (
        <View style={styles.section}>
          <SectionLabel>Weak spots</SectionLabel>
          <View style={styles.chipRow}>
            {topErrorTypes.map(error => (
              <Chip
                key={error.type}
                label={`${error.type} (${error.count})`}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Card style={styles.promptCard}>
        <SectionLabel>Today&apos;s focus</SectionLabel>
        <Text style={styles.focusText}>
          {profile ? GOAL_LABELS[profile.goal] : '—'}
        </Text>
        {stats.totalSessions > 0 ? (
          <Text style={styles.muted}>
            Last session: {formatLastSeen(stats.lastSessionAt ?? undefined)}
          </Text>
        ) : (
          <Text style={styles.muted}>Complete your first exercise.</Text>
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
    borderColor: colors.primary,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  bannerText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    fontFamily: fonts.extrabold,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  section: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  promptCard: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  focusText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
