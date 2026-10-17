import type { GeneratedExercise } from '../ai/tutor';

export type ExerciseBuffer = {
  readonly capacity: number;
  size: () => number;
  isEmpty: () => boolean;
  hasCapacity: () => boolean;
  peek: () => GeneratedExercise | null;
  take: () => GeneratedExercise | null;
  put: (exercise: GeneratedExercise) => void;
  clear: () => void;
};

export function createExerciseBuffer(capacity = 2): ExerciseBuffer {
  let items: GeneratedExercise[] = [];
  return {
    capacity,
    size: () => items.length,
    isEmpty: () => items.length === 0,
    hasCapacity: () => items.length < capacity,
    peek: () => (items.length > 0 ? items[0] : null),
    take: () => items.shift() ?? null,
    put: exercise => {
      if (capacity <= 0) {
        return;
      }
      while (items.length >= capacity) {
        items.shift();
      }
      items.push(exercise);
    },
    clear: () => {
      items = [];
    },
  };
}
