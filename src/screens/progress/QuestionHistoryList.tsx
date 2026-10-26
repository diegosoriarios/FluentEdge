import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { AppText, Card, Chip, Row } from '../../components/ui';
import { spacing } from '../../theme';
import { useQuestionHistory } from '../../hooks/useSessionData';
import { getAnsweredDailyQuestionStats } from '../../data';
import type { AnsweredDailyQuestionStats } from '../../data/dailyQuestionsRepo';
import { formatDateTime } from '../../utils/format';
import type { DailyQuestionRecord } from '../../data/questions';
import type { RootStackParamList } from '../../navigation/types';

const EMPTY_STATS: AnsweredDailyQuestionStats = { total: 0, correct: 0 };

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function QuestionHistoryList() {
  const navigation = useNavigation<Navigation>();
  const { questions, loading, loadingMore, hasMore, reload, loadMore } =
    useQuestionHistory();
  const [stats, setStats] = useState<AnsweredDailyQuestionStats>(EMPTY_STATS);

  useFocusEffect(
    useCallback(() => {
      reload();
      getAnsweredDailyQuestionStats()
        .then(setStats)
        .catch(error => {
          console.warn('Failed to load question stats', error);
        });
    }, [reload]),
  );

  const percentCorrect =
    stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
  const summary =
    stats.total > 0
      ? `${stats.total} answered · ${percentCorrect}% correct`
      : 'No questions answered yet';

  return (
    <FlatList
      data={questions}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <HistoryItem item={item} navigation={navigation} />
      )}
      ListHeaderComponent={
        <AppText variant="bodySmall" tone="muted" style={styles.summary}>
          {summary}
        </AppText>
      }
      ListEmptyComponent={
        <AppText variant="body" tone="muted" style={styles.empty}>
          {loading
            ? 'Loading…'
            : 'Answer a daily question from a notification to see it here.'}
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
  );
}

function HistoryItem({ item, navigation }: {
  item: DailyQuestionRecord;
  navigation: Navigation;
}) {
  const correct = item.chosenIndex === item.answerIndex;
  return (
    <Pressable
      onPress={() => navigation.navigate('Lesson', { questionId: item.id })}>
      <Card gap={spacing.xs}>
        <AppText variant="micro">
          {item.answeredAt != null ? formatDateTime(item.answeredAt) : '—'}
        </AppText>
        <AppText variant="body" numberOfLines={2}>
          {item.question}
        </AppText>
        <Row wrap gap={spacing.xs}>
          <Chip
            label={correct ? 'Correct' : 'Incorrect'}
            tone={correct ? 'success' : 'danger'}
          />
        </Row>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  summary: {
    marginBottom: spacing.sm,
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
