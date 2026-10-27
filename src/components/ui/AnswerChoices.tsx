import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type Props = {
  options: string[];
  answerIndex: number;
  selected: number | null;
  checked: boolean;
  onSelect?: (index: number) => void;
};

const LETTERS = ['A', 'B', 'C'];

type ChoiceState = 'idle' | 'selected' | 'correct' | 'wrong' | 'muted';

const STATE_STYLES: Record<
  ChoiceState,
  {
    card: TextStyle;
    pill: TextStyle;
    pillText: TextStyle;
    label: TextStyle;
  }
> = {
  idle: {
    card: { backgroundColor: colors.surface2, borderColor: colors.border },
    pill: { backgroundColor: colors.inputBorder },
    pillText: { color: colors.textMuted },
    label: {},
  },
  selected: {
    card: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    pill: { backgroundColor: colors.primary },
    pillText: { color: colors.inverse },
    label: {},
  },
  correct: {
    card: { backgroundColor: colors.successSoft, borderColor: colors.success },
    pill: { backgroundColor: colors.success },
    pillText: { color: colors.inverse },
    label: { color: colors.success, fontWeight: '600' },
  },
  wrong: {
    card: { backgroundColor: colors.dangerSoft, borderColor: colors.danger },
    pill: { backgroundColor: colors.danger },
    pillText: { color: colors.inverse },
    label: { color: colors.danger, fontWeight: '600' },
  },
  muted: {
    card: { backgroundColor: colors.card, borderColor: colors.border },
    pill: { backgroundColor: colors.inputBorder },
    pillText: { color: colors.subdued },
    label: { color: colors.subdued },
  },
};

function getState(
  index: number,
  selected: number | null,
  checked: boolean,
  answerIndex: number,
): ChoiceState {
  if (!checked) {
    return index === selected ? 'selected' : 'idle';
  }
  if (index === answerIndex) {
    return 'correct';
  }
  if (index === selected) {
    return 'wrong';
  }
  return 'muted';
}

export function AnswerChoices({
  options,
  answerIndex,
  selected,
  checked,
  onSelect,
}: Props) {
  return (
    <View style={styles.list}>
      {options.map((option, index) => {
        const state = getState(index, selected, checked, answerIndex);
        const stateStyle = STATE_STYLES[state];
        return (
          <Pressable
            key={`${option}-${index}`}
            disabled={checked || !onSelect}
            onPress={() => onSelect?.(index)}>
            <View style={[styles.choice, stateStyle.card]}>
              <View style={[styles.pill, stateStyle.pill]}>
                <Text style={[styles.pillText, stateStyle.pillText]}>
                  {LETTERS[index]}
                </Text>
              </View>
              <Text style={[styles.choiceText, stateStyle.label]}>{option}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
});
