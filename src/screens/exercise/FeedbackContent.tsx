import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Chip, SectionLabel } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
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

  if (!evaluation) {
    return (
      <Card>
        <Text style={styles.muted}>Evaluation pending for this session.</Text>
      </Card>
    );
  }

  const renderCorrections = () =>
    evaluation.corrections.length === 0 ? (
      <Card>
        <Text style={styles.noErrors}>No mistakes found. Well done.</Text>
      </Card>
    ) : (
      <View style={styles.list}>
        {evaluation.corrections.map((correction, index) => {
          const isOpen = expanded === index;
          return (
            <Pressable
              key={`${correction.original_phrase}-${index}`}
              onPress={() => setExpanded(isOpen ? null : index)}>
              <Card style={styles.correctionCard}>
                <View style={styles.correctionHeader}>
                  <Chip label={correction.error_type} />
                </View>
                <View style={styles.phraseRow}>
                  <Text style={styles.original}>
                    {correction.original_phrase}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                  <Text style={styles.corrected}>
                    {correction.corrected_phrase}
                  </Text>
                </View>
                <Text style={styles.explanation}>
                  {correction.explanation}
                </Text>
                {isOpen ? (
                  <View style={styles.detail}>
                    <View style={styles.tipBox}>
                      <Text style={styles.tipLabel}>Quick tip</Text>
                      <Text style={styles.tipText}>{correction.quick_tip}</Text>
                    </View>
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
      <Text style={styles.rewrite}>{evaluation.improved_paragraph}</Text>
      <Text style={styles.muted}>Your original response:</Text>
      <Text style={styles.originalText}>{session.response}</Text>
    </Card>
  );

  const renderStrengths = () => (
    <Card>
      <SectionLabel>Strengths</SectionLabel>
      <Text style={styles.strengths}>{evaluation.strengths}</Text>
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
      <View style={styles.tabRow}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(key => (
          <Chip
            key={key}
            label={TAB_LABELS[key]}
            selected={tab === key}
            onPress={() => setTab(key)}
          />
        ))}
      </View>
      {tab === 'corrections' ? renderCorrections() : null}
      {tab === 'rewrite' ? renderRewrite() : null}
      {tab === 'strengths' ? renderStrengths() : null}
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  list: {
    gap: spacing.sm,
  },
  correctionCard: {
    gap: spacing.sm,
  },
  correctionHeader: {
    flexDirection: 'row',
  },
  phraseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  original: {
    fontSize: 15,
    color: colors.danger,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  arrow: {
    fontSize: 15,
    color: colors.textMuted,
  },
  corrected: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
  },
  explanation: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginTop: 2,
  },
  detail: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  tipBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
    gap: 2,
  },
  tipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
  },
  rewrite: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  originalText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  strengths: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  noErrors: {
    fontSize: 15,
    color: colors.success,
    fontWeight: '600',
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
