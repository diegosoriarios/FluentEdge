import {
  ALL_EXERCISE_TYPES,
  createTypeRotation,
  exerciseTypeLabel,
} from '../exercises';

describe('createTypeRotation', () => {
  it('emits every type exactly once per bag', () => {
    const next = createTypeRotation();
    const drawn = [next(), next(), next()];
    expect([...drawn].sort()).toEqual([...ALL_EXERCISE_TYPES].sort());
    expect(new Set(drawn).size).toBe(3);
  });

  it('refills the bag and never repeats within a bag', () => {
    const next = createTypeRotation();
    const drawn = Array.from({ length: 9 }, () => next());
    for (let i = 0; i < 9; i += 3) {
      expect(new Set(drawn.slice(i, i + 3)).size).toBe(3);
    }
  });

  it('covers all types over multiple full bags', () => {
    const next = createTypeRotation();
    const drawn = Array.from({ length: 12 }, () => next());
    expect(new Set(drawn)).toEqual(new Set(ALL_EXERCISE_TYPES));
  });
});

describe('exerciseTypeLabel', () => {
  it('labels every exercise type', () => {
    expect(exerciseTypeLabel('multiple_choice')).toBe('Multiple choice');
    expect(exerciseTypeLabel('short_answer')).toBe('Short answer');
    expect(exerciseTypeLabel('paragraph')).toBe('Paragraph');
  });
});
