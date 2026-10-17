import {
  QUEUE_LENGTH,
  TEST_NOTIFICATION_ID,
  buildAnswerActionId,
  buildOpenActionId,
  buildTestNotification,
  dailyQueueCategoryId,
  dailyQueueNotificationId,
  dailyQueueNotificationIds,
  nextOccurrence,
  parsePressAction,
  planQueue,
  upcomingOccurrences,
} from '../dailyQuestion';
import type { DailyQuestionRecord } from '../../data/questions';

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

  it('recognizes the study reminder press action', () => {
    expect(parsePressAction('open-study')).toEqual({ kind: 'study' });
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

describe('upcomingOccurrences', () => {
  it('returns one timestamp per day at the requested local time', () => {
    const now = new Date(2026, 8, 12, 10, 0, 0).getTime();
    const timestamps = upcomingOccurrences(19, 30, 3, now);
    expect(timestamps).toEqual([
      new Date(2026, 8, 12, 19, 30, 0).getTime(),
      new Date(2026, 8, 13, 19, 30, 0).getTime(),
      new Date(2026, 8, 14, 19, 30, 0).getTime(),
    ]);
  });

  it('keeps the local hour across month boundaries', () => {
    const now = new Date(2026, 9, 30, 21, 0, 0).getTime();
    const timestamps = upcomingOccurrences(8, 0, 3, now);
    expect(timestamps).toEqual([
      new Date(2026, 9, 31, 8, 0, 0).getTime(),
      new Date(2026, 10, 1, 8, 0, 0).getTime(),
      new Date(2026, 10, 2, 8, 0, 0).getTime(),
    ]);
  });
});

describe('queue ids', () => {
  it('builds a unique trigger id per day', () => {
    expect(dailyQueueNotificationId(0)).toBe('daily-practice-d0');
    expect(dailyQueueNotificationId(QUEUE_LENGTH - 1)).toBe(
      `daily-practice-d${QUEUE_LENGTH - 1}`,
    );
    expect(new Set(dailyQueueNotificationIds()).size).toBe(QUEUE_LENGTH);
  });

  it('builds a unique ios category per day', () => {
    expect(dailyQueueCategoryId(0)).toBe('daily_question-0');
    expect(dailyQueueCategoryId(1)).toBe('daily_question-1');
  });
});

describe('planQueue', () => {
  const questions = [
    QUESTION,
    {
      ...QUESTION,
      id: 'q_second',
      question: 'Second?',
    },
  ];

  it('cycles the pool to fill every day', () => {
    const plan = planQueue(questions, 5);
    expect(plan.map(entry => entry.question.id)).toEqual([
      'q_present_perfect_since',
      'q_second',
      'q_present_perfect_since',
      'q_second',
      'q_present_perfect_since',
    ]);
    expect(plan.map(entry => entry.day)).toEqual([0, 1, 2, 3, 4]);
  });

  it('truncates the pool when it exceeds the requested days', () => {
    const plan = planQueue(questions, 1);
    expect(plan).toHaveLength(1);
    expect(plan[0].question.id).toBe('q_present_perfect_since');
  });

  it('returns an empty plan for an empty pool', () => {
    expect(planQueue([], 7)).toEqual([]);
  });
});

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
