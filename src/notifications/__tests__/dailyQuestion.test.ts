import {
  buildAnswerActionId,
  buildOpenActionId,
  nextOccurrence,
  parsePressAction,
} from '../dailyQuestion';

describe('press action ids', () => {
  it('round-trips answer ids', () => {
    const id = buildAnswerActionId('q_present_perfect_since', 2);
    expect(id).toBe('answer|q_present_perfect_since|2');
    expect(parsePressAction(id)).toEqual({
      kind: 'answer',
      questionId: 'q_present_perfect_since',
      index: 2,
    });
  });

  it('round-trips open ids', () => {
    const id = buildOpenActionId('q_articles_engineer');
    expect(parsePressAction(id)).toEqual({
      kind: 'open',
      questionId: 'q_articles_engineer',
    });
  });

  it('rejects malformed ids', () => {
    expect(parsePressAction(undefined)).toBeNull();
    expect(parsePressAction('')).toBeNull();
    expect(parsePressAction('answer|only-two')).toBeNull();
    expect(parsePressAction('answer|q|not-a-number')).toBeNull();
    expect(parsePressAction('answer|q|-1')).toBeNull();
    expect(parsePressAction('something|else')).toBeNull();
  });
});

describe('nextOccurrence', () => {
  it('returns today when the time is still ahead', () => {
    const now = new Date(2026, 8, 12, 10, 0, 0).getTime();
    const scheduled = nextOccurrence(19, 0, now);
    const expected = new Date(2026, 8, 12, 19, 0, 0).getTime();
    expect(scheduled).toBe(expected);
  });

  it('rolls to tomorrow when the time has passed', () => {
    const now = new Date(2026, 8, 12, 20, 30, 0).getTime();
    const scheduled = nextOccurrence(19, 0, now);
    const expected = new Date(2026, 8, 13, 19, 0, 0).getTime();
    expect(scheduled).toBe(expected);
  });

  it('rolls to tomorrow at the exact boundary', () => {
    const now = new Date(2026, 8, 12, 19, 0, 0).getTime();
    const scheduled = nextOccurrence(19, 0, now);
    const expected = new Date(2026, 8, 13, 19, 0, 0).getTime();
    expect(scheduled).toBe(expected);
  });
});
