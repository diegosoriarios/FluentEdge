import { createExerciseBuffer } from '../exerciseBuffer';
import type { GeneratedExercise } from '../../ai/tutor';

function exercise(type: GeneratedExercise['type'], prompt: string): GeneratedExercise {
  return { type, prompt, exercise: null };
}

describe('createExerciseBuffer', () => {
  it('returns items in FIFO order', () => {
    const buffer = createExerciseBuffer(2);
    buffer.put(exercise('paragraph', 'first'));
    buffer.put(exercise('short_answer', 'second'));
    expect(buffer.take()?.prompt).toBe('first');
    expect(buffer.take()?.prompt).toBe('second');
    expect(buffer.take()).toBeNull();
  });

  it('drops the oldest item when capacity is exceeded', () => {
    const buffer = createExerciseBuffer(2);
    buffer.put(exercise('paragraph', 'first'));
    buffer.put(exercise('paragraph', 'second'));
    buffer.put(exercise('paragraph', 'third'));
    expect(buffer.size()).toBe(2);
    expect(buffer.take()?.prompt).toBe('second');
    expect(buffer.take()?.prompt).toBe('third');
  });

  it('reports capacity state', () => {
    const buffer = createExerciseBuffer(2);
    expect(buffer.hasCapacity()).toBe(true);
    expect(buffer.isEmpty()).toBe(true);
    buffer.put(exercise('paragraph', 'first'));
    expect(buffer.isEmpty()).toBe(false);
    expect(buffer.hasCapacity()).toBe(true);
    buffer.put(exercise('short_answer', 'second'));
    expect(buffer.hasCapacity()).toBe(false);
  });

  it('peeks without removing', () => {
    const buffer = createExerciseBuffer(2);
    buffer.put(exercise('multiple_choice', 'first'));
    expect(buffer.peek()?.prompt).toBe('first');
    expect(buffer.size()).toBe(1);
    expect(buffer.take()?.prompt).toBe('first');
    expect(buffer.peek()).toBeNull();
  });

  it('clears all buffered items', () => {
    const buffer = createExerciseBuffer(2);
    buffer.put(exercise('paragraph', 'first'));
    buffer.put(exercise('short_answer', 'second'));
    buffer.clear();
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.take()).toBeNull();
  });
});
