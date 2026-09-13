import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card, Chip } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { usePaginatedSessions } from '../../hooks/useSessionData';
import { formatDateTime } from '../../utils/format';
import type { MainTabParamList, RootStackParamList } from '../../navigation/types';

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

  return (
    <Screen title="Progress" subtitle={`${sessions.length} shown${hasMore ? ' · more available' : ''}`}>
      <View style={styles.rangeRow}>
        {(Object.keys(RANGE_LABELS) as Range[]).map(key => (
          <Chip
            key={key}
            label={RANGE_LABELS[key]}
            selected={range === key}
            onPress={() => setRange(key)}
          />
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => {
          const errorCount = item.evaluation?.corrections.length ?? 0;
          return (
            <Pressable
              onPress={() =>
                navigation.navigate('SessionDetail', { sessionId: item.id })
              }>
              <Card style={styles.sessionCard}>
                <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
                <Text style={styles.prompt} numberOfLines={2}>
                  {item.prompt}
                </Text>
                <View style={styles.metaRow}>
                  <Chip
                    label={
                      item.evaluation
                        ? `${errorCount} correction${errorCount === 1 ? '' : 's'}`
                        : 'Not evaluated'
                    }
                  />
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading
              ? 'Loading…'
              : 'No sessions yet. Complete an exercise to see it here.'}
          </Text>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footerRow}>
              {loadingMore ? (
                <Text style={styles.empty}>Loading more…</Text>
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
  rangeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  sessionCard: {
    gap: spacing.xs,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  prompt: {
    fontSize: 15,
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
  },
  empty: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  footerRow: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
});
