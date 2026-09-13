import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import { useOnboarding } from '../../context/OnboardingContext';
import type { Goal, OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Goals'>;

const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  business: 'Emails, reports, and workplace communication',
  academic: 'Essays, summaries, and formal writing',
  exam: 'IELTS and TOEFL writing tasks',
  casual: 'Everyday messages and conversations',
  creative: 'Stories, descriptions, and voice',
};

const GOALS: Goal[] = ['business', 'academic', 'exam', 'casual', 'creative'];

const GOAL_TITLES: Record<Goal, string> = {
  business: 'Business',
  academic: 'Academic',
  exam: 'Exam prep',
  casual: 'Casual',
  creative: 'Creative writing',
};

export function GoalsScreen({ navigation }: Props) {
  const { draft, update } = useOnboarding();

  return (
    <Screen title="What is your goal?" subtitle="Pick the one that fits best for now">
      <View style={styles.list}>
        {GOALS.map(goal => {
          const selected = draft.goal === goal;
          return (
            <Pressable
              key={goal}
              style={({ pressed }) => [
                styles.row,
                selected && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
              onPress={() => update({ goal })}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{GOAL_TITLES[goal]}</Text>
                <Text style={styles.rowSubtitle}>{GOAL_DESCRIPTIONS[goal]}</Text>
              </View>
              <View style={[styles.radio, selected && styles.radioSelected]} />
            </Pressable>
          );
        })}
      </View>
      <Button
        title="Continue"
        disabled={draft.goal == null}
        onPress={() => navigation.navigate('NativeLanguage')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  rowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textMuted,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
    marginLeft: spacing.sm + 2,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
});
