import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

type Props = {
  options: string[];
  answerIndex: number;
  selected: number | null;
  checked: boolean;
  onSelect?: (index: number) => void;
};

const LETTERS = ['A', 'B', 'C'];

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
        let container = styles.choice;
        let pill = styles.pill;
        let pillText = styles.pillText;
        let label = styles.choiceText;
        if (!checked) {
          if (index === selected) {
            container = styles.choiceSelected;
            pill = styles.pillSelected;
            pillText = styles.pillTextSelected;
          }
        } else if (index === answerIndex) {
          container = styles.choiceCorrect;
          pill = styles.pillCorrect;
          pillText = styles.pillTextCorrect;
          label = styles.choiceTextCorrect;
        } else if (index === selected) {
          container = styles.choiceWrong;
          pill = styles.pillWrong;
          pillText = styles.pillTextWrong;
          label = styles.choiceTextWrong;
        } else {
          container = styles.choiceMuted;
          pillText = styles.pillTextMuted;
          label = styles.choiceTextMuted;
        }
        return (
          <Pressable
            key={`${option}-${index}`}
            disabled={checked || !onSelect}
            onPress={() => onSelect?.(index)}>
            <View style={container}>
              <View style={pill}>
                <Text style={pillText}>{LETTERS[index]}</Text>
              </View>
              <Text style={label}>{option}</Text>
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
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  choiceSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceCorrect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  choiceWrong: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  choiceMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBorder,
  },
  pillSelected: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pillCorrect: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
  },
  pillWrong: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  pillTextSelected: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inverse,
  },
  pillTextCorrect: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inverse,
  },
  pillTextWrong: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.inverse,
  },
  pillTextMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.subdued,
  },
  choiceText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  choiceTextCorrect: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
    lineHeight: 21,
  },
  choiceTextWrong: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
    lineHeight: 21,
  },
  choiceTextMuted: {
    flex: 1,
    fontSize: 15,
    color: colors.subdued,
    lineHeight: 21,
  },
});
