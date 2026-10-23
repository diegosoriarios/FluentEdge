import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card, Chip } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { useQuestionHistory } from '../../hooks/useSessionData';
import { getAnsweredDailyQuestionStats } from '../../data';
import type { AnsweredDailyQuestionStats } from '../../data/dailyQuestionsRepo';
import { formatDateTime } from '../../utils/format';
import type { DailyQuestionRecord } from '../../data/questions';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestionHistory'>;

const EMPTY_STATS: AnsweredDailyQuestionStats = { total: 0, correct: 0 };

export function QuestionHistoryScreen({ navigation }: Props) {
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
  const subtitle =
    stats.total > 0
      ? `${stats.total} answered · ${percentCorrect}% correct`
      : 'No questions answered yet';

  return (
    <Screen title="Question history" subtitle={subtitle}>
      <FlatList
        data={questions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <HistoryItem item={item} navigation={navigation} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading
              ? 'Loading…'
              : 'Answer a daily question from a notification to see it here.'}
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

function HistoryItem({ item, navigation }: {
  item: DailyQuestionRecord;
  navigation: Props['navigation'];
}) {
  const correct = item.chosenIndex === item.answerIndex;
  return (
    <Pressable
      onPress={() => navigation.navigate('Lesson', { questionId: item.id })}>
      <Card style={styles.questionCard}>
        <Text style={styles.date}>
          {item.answeredAt != null ? formatDateTime(item.answeredAt) : '—'}
        </Text>
        <Text style={styles.prompt} numberOfLines={2}>
          {item.question}
        </Text>
        <View style={styles.metaRow}>
          <Chip
            label={correct ? 'Correct' : 'Incorrect'}
            tone={correct ? 'success' : 'danger'}
          />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  questionCard: {
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
    flexWrap: 'wrap',
    gap: spacing.xs,
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
