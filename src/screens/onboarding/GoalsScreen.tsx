import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, OptionRow } from '../../components/ui';
import { spacing } from '../../theme';
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
        {GOALS.map(goal => (
          <OptionRow
            key={goal}
            title={GOAL_TITLES[goal]}
            subtitle={GOAL_DESCRIPTIONS[goal]}
            selected={draft.goal === goal}
            onPress={() => update({ goal })}
          />
        ))}
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
});
