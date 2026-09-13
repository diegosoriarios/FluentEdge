import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
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
      subtitle="Optional — helps anticipate typical mistakes">
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder="e.g. Portuguese"
        placeholderTextColor={colors.textMuted}
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
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
