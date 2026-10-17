import type { ExerciseType } from '../navigation/types';

export const ALL_EXERCISE_TYPES: ExerciseType[] = [
  'multiple_choice',
  'short_answer',
  'paragraph',
];

const TYPE_LABELS: Record<ExerciseType, string> = {
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
  paragraph: 'Paragraph',
};

export function exerciseTypeLabel(type: ExerciseType): string {
  return TYPE_LABELS[type];
}

export function createTypeRotation(
  random: () => number = Math.random,
): () => ExerciseType {
  let bag: ExerciseType[] = [];
  return () => {
    if (bag.length === 0) {
      bag = [...ALL_EXERCISE_TYPES];
      for (let i = bag.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop() as ExerciseType;
  };
}

const sharedRotation = createTypeRotation();

export function nextExerciseType(): ExerciseType {
  return sharedRotation();
}
