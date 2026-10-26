import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AnswerChoices,
  AppText,
  Card,
  Chip,
  Row,
  SectionLabel,
  TipBox,
} from '../../components/ui';
import { spacing } from '../../theme';
import type { SessionSummary } from '../../navigation/types';

type Props = {
  session: SessionSummary;
  readOnly?: boolean;
};

type Tab = 'corrections' | 'rewrite' | 'strengths';

const TAB_LABELS: Record<Tab, string> = {
  corrections: 'Corrections',
  rewrite: 'Rewrite',
  strengths: 'Strengths',
};

export function FeedbackContent({ session, readOnly = false }: Props) {
  const [tab, setTab] = useState<Tab>('corrections');
  const [expanded, setExpanded] = useState<number | null>(null);
  const evaluation = session.evaluation;

  if (session.type === 'multiple_choice') {
    return <McqFeedback session={session} />;
  }

  if (!evaluation) {
    return (
      <Card>
        <AppText variant="bodySmall" tone="muted">
          Evaluation pending for this session.
        </AppText>
      </Card>
    );
  }

  const renderCorrections = () =>
    evaluation.corrections.length === 0 ? (
      <Card>
        <AppText variant="body" tone="success" style={styles.accent}>
          No mistakes found. Well done.
        </AppText>
      </Card>
    ) : (
      <View style={styles.list}>
        {evaluation.corrections.map((correction, index) => {
          const isOpen = expanded === index;
          return (
            <Pressable
              key={`${correction.original_phrase}-${index}`}
              onPress={() => setExpanded(isOpen ? null : index)}>
              <Card gap={spacing.sm}>
                <Row>
                  <Chip label={correction.error_type} />
                </Row>
                <Row wrap align="flex-start" gap={spacing.xs}>
                  <AppText variant="body" tone="danger" style={styles.original}>
                    {correction.original_phrase}
                  </AppText>
                  <AppText variant="body" tone="muted">
                    →
                  </AppText>
                  <AppText variant="body" tone="success" style={styles.corrected}>
                    {correction.corrected_phrase}
                  </AppText>
                </Row>
                <AppText
                  variant="bodySmall"
                  tone="muted"
                  style={styles.explanation}>
                  {correction.explanation}
                </AppText>
                {isOpen ? (
                  <View style={styles.detail}>
                    <TipBox label="Quick tip">{correction.quick_tip}</TipBox>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
      </View>
    );

  const renderRewrite = () => (
    <Card>
      <SectionLabel>Improved version</SectionLabel>
      <AppText variant="body" style={styles.rewrite}>
        {evaluation.improved_paragraph}
      </AppText>
      <AppText variant="bodySmall" tone="muted">
        Your original response:
      </AppText>
      <AppText variant="bodySmall" tone="muted">
        {session.response}
      </AppText>
    </Card>
  );

  const renderStrengths = () => (
    <Card>
      <SectionLabel>Strengths</SectionLabel>
      <AppText variant="body">{evaluation.strengths}</AppText>
    </Card>
  );

  if (readOnly) {
    return (
      <View style={styles.container}>
        <SectionLabel>Corrections</SectionLabel>
        {renderCorrections()}
        <View style={styles.sectionGap} />
        {renderRewrite()}
        <View style={styles.sectionGap} />
        {renderStrengths()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Row wrap>
        {(Object.keys(TAB_LABELS) as Tab[]).map(key => (
          <Chip
            key={key}
            label={TAB_LABELS[key]}
            selected={tab === key}
            onPress={() => setTab(key)}
          />
        ))}
      </Row>
      {tab === 'corrections' ? renderCorrections() : null}
      {tab === 'rewrite' ? renderRewrite() : null}
      {tab === 'strengths' ? renderStrengths() : null}
    </View>
  );
}

function McqFeedback({ session }: { session: SessionSummary }) {
  const exercise = session.exercise;
  if (!exercise) {
    return (
      <Card>
        <AppText variant="bodySmall" tone="muted">
          Exercise data missing for this session.
        </AppText>
      </Card>
    );
  }
  const correct = session.chosenIndex === exercise.answerIndex;
  return (
    <View style={styles.container}>
      <Card>
        <SectionLabel>Question</SectionLabel>
        <AppText variant="body">{exercise.question}</AppText>
      </Card>
      <AnswerChoices
        options={exercise.options}
        answerIndex={exercise.answerIndex}
        selected={session.chosenIndex}
        checked
      />
      <Card gap={spacing.sm}>
        <AppText variant="verdict" tone={correct ? 'success' : 'danger'}>
          {correct ? 'Correct!' : 'Not quite.'}
        </AppText>
        <TipBox>{exercise.explanation}</TipBox>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  sectionGap: {
    height: spacing.xs,
  },
  list: {
    gap: spacing.sm,
  },
  original: {
    flex: 1,
    textDecorationLine: 'line-through',
  },
  corrected: {
    flex: 1,
    fontWeight: '600',
  },
  accent: {
    fontWeight: '600',
  },
  explanation: {
    marginTop: 2,
  },
  detail: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  rewrite: {
    marginBottom: spacing.md,
  },
});
