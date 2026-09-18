import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card, SectionLabel } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import { getDailyQuestion, markDailyQuestionViewed } from '../../data';
import type { DailyQuestionRecord } from '../../data/questions';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

export function LessonScreen({ route }: Props) {
  const { questionId } = route.params;
  const [question, setQuestion] = useState<DailyQuestionRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
        <View style={styles.options}>
          {question.options.map((option, index) => {
            const isChosen = question.chosenIndex === index;
            const isCorrect = question.answerIndex === index;
            return (
              <View
                key={option}
                style={[
                  styles.option,
                  isCorrect && styles.optionCorrect,
                  isChosen && !isCorrect && styles.optionWrong,
                ]}>
                <Text
                  style={[
                    styles.optionText,
                    isCorrect && styles.optionTextCorrect,
                    isChosen && !isCorrect && styles.optionTextWrong,
                  ]}>
                  {option}
                </Text>
              </View>
            );
          })}
        </View>
        {answered ? (
          <Text style={correct ? styles.resultCorrect : styles.resultWrong}>
            {correct ? 'Correct!' : 'Not quite — see below.'}
          </Text>
        ) : (
          <Text style={styles.muted}>
            You have not answered this question yet.
          </Text>
        )}
      </Card>
      <Card style={styles.card}>
        <SectionLabel>Why</SectionLabel>
        <Text style={styles.explanation}>{question.explanation}</Text>
      </Card>
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
  options: {
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface2,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  optionWrong: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  optionText: {
    fontSize: 15,
    color: colors.text,
  },
  optionTextCorrect: {
    color: colors.success,
    fontWeight: '600',
  },
  optionTextWrong: {
    color: colors.danger,
    fontWeight: '600',
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
