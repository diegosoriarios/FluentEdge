import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card, SectionLabel } from '../../components/ui';
import { AnswerChoices } from '../../components/AnswerChoices';
import { colors, spacing } from '../../theme';
import {
  getDailyQuestion,
  markDailyQuestionViewed,
  recordDailyAnswer,
} from '../../data';
import type { DailyQuestionRecord } from '../../data/questions';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export function LessonScreen({ route }: Props) {
  const { questionId } = route.params;
  const [question, setQuestion] = useState<DailyQuestionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSelected(null);
    getDailyQuestion(questionId)
      .then(async record => {
        if (!cancelled && record) {
          setQuestion(record);
          await markDailyQuestionViewed(record.id);
        }
      })
      .catch(error => {
        console.warn('Failed to load lesson', error);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [questionId]);

  const checkAnswer = async () => {
    if (!question || selected == null || checking) {
      return;
    }
    setChecking(true);
    try {
      await recordDailyAnswer(question.id, selected);
      await markDailyQuestionViewed(question.id);
      setQuestion({
        ...question,
        chosenIndex: selected,
        answeredAt: Date.now(),
      });
    } catch (error) {
      console.warn('Failed to record answer', error);
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return <Screen title="Daily lesson" />;
  }

  if (!question) {
    return (
      <Screen title="Daily lesson" subtitle="Question not found">
        <Text style={styles.muted}>
          This question is no longer available on this device.
        </Text>
      </Screen>
    );
  }

  const answered = question.chosenIndex != null;
  const correct = question.chosenIndex === question.answerIndex;

  return (
    <Screen title="Daily lesson">
      <Card style={styles.card}>
        <SectionLabel>Question</SectionLabel>
        <Text style={styles.questionText}>{question.question}</Text>
        <AnswerChoices
          options={question.options}
          answerIndex={question.answerIndex}
          selected={answered ? question.chosenIndex : selected}
          checked={answered}
          onSelect={answered ? undefined : setSelected}
        />
        {answered ? (
          <Text style={correct ? styles.resultCorrect : styles.resultWrong}>
            {correct ? 'Correct!' : 'Not quite — see below.'}
          </Text>
        ) : null}
      </Card>
      {answered ? (
        <Card style={styles.card}>
          <SectionLabel>Why</SectionLabel>
          <Text style={styles.explanation}>{question.explanation}</Text>
        </Card>
      ) : (
        <Button
          title="Check answer"
          onPress={checkAnswer}
          disabled={selected == null}
          loading={checking}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  resultCorrect: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
  resultWrong: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  explanation: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
