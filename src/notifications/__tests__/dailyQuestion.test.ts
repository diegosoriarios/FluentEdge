import {
  TEST_NOTIFICATION_ID,
  buildAnswerActionId,
  buildOpenActionId,
  buildTestNotification,
  nextOccurrence,
  parsePressAction,
} from '../dailyQuestion';
import type { DailyQuestionRecord } from '../../data/questions';

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

const QUESTION: DailyQuestionRecord = {
  id: 'q_present_perfect_since',
  question: 'I ___ here since 2019.',
  options: ['am living', 'have lived', 'live'],
  answerIndex: 1,
  explanation: '"Since" marks a starting point — present perfect.',
  chosenIndex: null,
  answeredAt: null,
  viewedAt: null,
};

describe('buildTestNotification', () => {
  it('uses the test notification id and the standard title suffix', () => {
    const notification = buildTestNotification(QUESTION);
    expect(notification.id).toBe(TEST_NOTIFICATION_ID);
    expect(notification.title).toContain('(test)');
    expect(notification.body).toBe(QUESTION.question);
  });

  it('reuses the same press action ids as the scheduled notification', () => {
    const notification = buildTestNotification(QUESTION);
    expect(notification.android?.pressAction?.id).toBe(
      buildOpenActionId(QUESTION.id),
    );
    const actionIds = notification.android?.actions?.map(
      action => action.pressAction?.id,
    );
    expect(actionIds).toEqual(
      QUESTION.options.map((_, index) => buildAnswerActionId(QUESTION.id, index)),
    );
    expect(notification.ios?.categoryId).toBe('daily_question');
  });
});
