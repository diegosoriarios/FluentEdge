import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, ProgressBar } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import { DIAGNOSTIC_QUESTIONS, scoreDiagnostic } from '../../data/diagnostic';
import { useOnboarding } from '../../context/OnboardingContext';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'DiagnosticTest'>;

export function DiagnosticTestScreen({ navigation }: Props) {
  const { draft, update } = useOnboarding();
  const [index, setIndex] = useState(0);

  const total = DIAGNOSTIC_QUESTIONS.length;
  const question = DIAGNOSTIC_QUESTIONS[index];
  const selectedIndex = draft.answers[question.id];

  const select = (optionIndex: number) => {
    update({ answers: { ...draft.answers, [question.id]: optionIndex } });
  };

  const goNext = () => {
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    const score = scoreDiagnostic(draft.answers);
    update({ level: score.level, weakAreas: score.weakAreas });
    navigation.navigate('DiagnosticResult');
  };

  const goBack = () => {
    if (index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <Screen title="Quick diagnostic" subtitle={`Question ${index + 1} of ${total}`}>
      <ProgressBar progress={(index + 1) / total} />
      <Text style={styles.prompt}>{question.prompt}</Text>
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => {
          const selected = selectedIndex === optionIndex;
          return (
            <Pressable
              key={option}
              style={({ pressed }) => [
                styles.option,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
              onPress={() => select(optionIndex)}>
              <View
                style={[styles.radio, selected && styles.radioSelected]}
              />
              <Text style={styles.optionText}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        {index > 0 ? (
          <Button title="Back" variant="secondary" onPress={goBack} style={styles.half} />
        ) : null}
        <Button
          title={index < total - 1 ? 'Next' : 'See results'}
          onPress={goNext}
          disabled={selectedIndex == null}
          style={styles.half}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  optionPressed: {
    opacity: 0.75,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.inputBorder,
    marginRight: spacing.sm + 2,
  },
  radioSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  half: {
    flex: 1,
  },
});
