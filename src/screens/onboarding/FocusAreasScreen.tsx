import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Chip } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { useOnboarding } from '../../context/OnboardingContext';
import type {
  FocusArea,
  OnboardingStackParamList,
} from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'FocusAreas'>;

const FOCUS_AREAS: FocusArea[] = ['grammar', 'vocabulary', 'tone', 'fluency'];

const FOCUS_TITLES: Record<FocusArea, string> = {
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  tone: 'Tone & style',
  fluency: 'Fluency',
};

const FOCUS_DESCRIPTIONS: Record<FocusArea, string> = {
  grammar: 'Agreement, tenses, articles, word order',
  vocabulary: 'Word choice and precision',
  tone: 'Register, formality, clarity',
  fluency: 'Natural phrasing and flow',
};

export function FocusAreasScreen({ navigation }: Props) {
  const { draft, update } = useOnboarding();

  const toggle = (area: FocusArea) => {
    const selected = draft.focusAreas.includes(area);
    update({
      focusAreas: selected
        ? draft.focusAreas.filter(item => item !== area)
        : [...draft.focusAreas, area],
    });
  };

  return (
    <Screen title="Focus areas" subtitle="Select one or more to prioritize">
      <View style={styles.chipRow}>
        {FOCUS_AREAS.map(area => (
          <Chip
            key={area}
            label={FOCUS_TITLES[area]}
            selected={draft.focusAreas.includes(area)}
            onPress={() => toggle(area)}
          />
        ))}
      </View>
      <View style={styles.descriptions}>
        {FOCUS_AREAS.map(area => (
          <Text key={area} style={styles.description}>
            {FOCUS_TITLES[area]}: {FOCUS_DESCRIPTIONS[area]}
          </Text>
        ))}
      </View>
      <Button
        title="Continue"
        disabled={draft.focusAreas.length === 0}
        onPress={() => navigation.navigate('ModelDownload')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  descriptions: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
