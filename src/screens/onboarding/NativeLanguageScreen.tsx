import { useState } from 'react';
import { StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Input } from '../../components/ui';
import { spacing } from '../../theme';
import { useOnboarding } from '../../context/OnboardingContext';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'NativeLanguage'>;

export function NativeLanguageScreen({ navigation }: Props) {
  const { draft, update } = useOnboarding();
  const [value, setValue] = useState(draft.nativeLanguage ?? '');

  const submit = () => {
    const trimmed = value.trim();
    update({ nativeLanguage: trimmed.length > 0 ? trimmed : null });
    navigation.navigate('FocusAreas');
  };

  return (
    <Screen
      title="Your native language"
      subtitle="Optional — helps anticipate typical mistakes"
      avoidKeyboard>
      <Input
        value={value}
        onChangeText={setValue}
        placeholder="e.g. Portuguese"
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="words"
      />
      <Button title="Continue" onPress={submit} />
      <Button title="Skip" variant="secondary" onPress={submit} style={styles.skip} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: spacing.lg,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
