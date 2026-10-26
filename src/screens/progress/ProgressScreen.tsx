import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText, Button, Card, Chip, Row } from '../../components/ui';
import { spacing } from '../../theme';
import { usePaginatedSessions } from '../../hooks/useSessionData';
import { deleteSession } from '../../data';
import { exerciseTypeLabel } from '../../utils/exercises';
import { formatDateTime } from '../../utils/format';
import { WeeklyRecapCard } from './WeeklyRecapCard';
import type {
  MainTabParamList,
  RootStackParamList,
  SessionSummary,
} from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Progress'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Range = 'week' | 'month' | 'all';

const RANGE_MS: Record<Range, number> = {
  week: 7 * 86400000,
  month: 30 * 86400000,
  all: Number.POSITIVE_INFINITY,
};

const RANGE_LABELS: Record<Range, string> = {
  week: 'Week',
  month: 'Month',
  all: 'All',
};

export function ProgressScreen({ navigation }: Props) {
  const { sessions, loading, loadingMore, hasMore, reload, loadMore } =
    usePaginatedSessions();
  const [range, setRange] = useState<Range>('all');

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const filtered = sessions.filter(
    session => Date.now() - session.createdAt <= RANGE_MS[range],
  );

  const confirmDelete = (session: SessionSummary) => {
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
              .then(reload)
              .catch(error => {
                console.warn('Failed to delete session', error);
              });
          },
        },
      ],
    );
  };

  return (
    <Screen title="Progress" subtitle={`${sessions.length} shown${hasMore ? ' · more available' : ''}`}>
      <Button
        title="Question history"
        variant="secondary"
        onPress={() => navigation.navigate('QuestionHistory')}
        style={styles.historyButton}
      />
      <WeeklyRecapCard />
      <Row wrap style={styles.rangeRow}>
        {(Object.keys(RANGE_LABELS) as Range[]).map(key => (
          <Chip
            key={key}
            label={RANGE_LABELS[key]}
            selected={range === key}
            onPress={() => setRange(key)}
          />
        ))}
      </Row>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const errorCount = item.evaluation?.corrections.length ?? 0;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate('SessionDetail', { sessionId: item.id })
              }
              onLongPress={() => confirmDelete(item)}>
              <Card gap={spacing.xs}>
                <AppText variant="micro">
                  {formatDateTime(item.createdAt)}
                </AppText>
                <AppText variant="body" numberOfLines={2}>
                  {item.prompt}
                </AppText>
                <Row wrap gap={spacing.xs}>
                  <Chip label={exerciseTypeLabel(item.type)} />
                  {item.mistakeId ? <Chip label="Review" /> : null}
                  <Chip
                    label={
                      item.evaluation
                        ? `${errorCount} correction${errorCount === 1 ? '' : 's'}`
                        : 'Not evaluated'
                    }
                  />
                </Row>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <AppText variant="body" tone="muted" style={styles.empty}>
            {loading
              ? 'Loading…'
              : 'No sessions yet. Complete an exercise to see it here.'}
          </AppText>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerRow}>
              {loadingMore ? (
                <AppText variant="body" tone="muted" style={styles.empty}>
                  Loading more…
                </AppText>
              ) : (
                <Chip label="Load more" onPress={loadMore} />
              )}
            </View>
          ) : undefined
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.listContent}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  historyButton: {
    marginBottom: spacing.md,
  },
  rangeRow: {
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
