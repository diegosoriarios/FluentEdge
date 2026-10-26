import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { AppText, Button, OptionRow, ProgressBar, Row } from '../../components/ui';
import { spacing } from '../../theme';
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
      <AppText variant="heading" style={styles.prompt}>
        {question.prompt}
      </AppText>
      <View style={styles.options}>
        {question.options.map((option, optionIndex) => (
          <OptionRow
            key={option}
            title={option}
            selected={selectedIndex === optionIndex}
            onPress={() => select(optionIndex)}
            radioPosition="left"
          />
        ))}
      </View>
      <Row style={styles.actions}>
        {index > 0 ? (
          <Button
            title="Back"
            variant="secondary"
            onPress={goBack}
            style={styles.half}
          />
        ) : null}
        <Button
          title={index < total - 1 ? 'Next' : 'See results'}
          onPress={goNext}
          disabled={selectedIndex == null}
          style={styles.half}
        />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  options: {
    gap: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
  },
  half: {
    flex: 1,
  },
});
