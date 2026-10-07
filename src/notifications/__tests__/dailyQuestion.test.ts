import notifee from '@notifee/react-native';
import {
  DAILY_WINDOW_DAYS,
  TEST_NOTIFICATION_ID,
  buildAnswerActionId,
  buildDailyTriggerId,
  buildIosCategoryId,
  buildOpenActionId,
  buildTestNotification,
  dailyTriggerTimestamp,
  isDailyTriggerId,
  nextOccurrence,
  parsePressAction,
  refreshDailyNotification,
} from '../dailyQuestion';
import type { DailyQuestionRecord } from '../../data/questions';
import { clearSqlResponses, mockSqlResponse, sqlCalls } from '../../test/sqlMock';

const notifeeMock = notifee as unknown as Record<string, jest.Mock>;

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

describe('dailyTriggerTimestamp', () => {
  it('matches nextOccurrence for day 0', () => {
    const now = new Date(2026, 8, 12, 10, 0, 0).getTime();
    expect(dailyTriggerTimestamp(19, 0, 0, now)).toBe(
      nextOccurrence(19, 0, now),
    );
  });

  it('lands on consecutive calendar days without collisions', () => {
    const now = new Date(2026, 8, 12, 20, 30, 0).getTime();
    expect(new Date(dailyTriggerTimestamp(19, 0, 0, now))).toEqual(
      new Date(2026, 8, 13, 19, 0, 0),
    );
    expect(new Date(dailyTriggerTimestamp(19, 0, 1, now))).toEqual(
      new Date(2026, 8, 14, 19, 0, 0),
    );
    expect(new Date(dailyTriggerTimestamp(19, 0, 13, now))).toEqual(
      new Date(2026, 8, 26, 19, 0, 0),
    );
  });
});

describe('daily trigger ids', () => {
  it('builds stable per-day trigger and category ids', () => {
    expect(buildDailyTriggerId(0)).toBe('daily-practice-d0');
    expect(buildDailyTriggerId(13)).toBe('daily-practice-d13');
    expect(buildIosCategoryId(3)).toBe('daily_question_3');
  });

  it('recognizes daily trigger ids including the legacy id', () => {
    expect(isDailyTriggerId('daily-practice')).toBe(true);
    expect(isDailyTriggerId('daily-practice-d0')).toBe(true);
    expect(isDailyTriggerId('daily-practice-d42')).toBe(true);
    expect(isDailyTriggerId('daily-practice-test')).toBe(false);
    expect(isDailyTriggerId('daily-practice-dx')).toBe(false);
    expect(isDailyTriggerId('other')).toBe(false);
  });
});

describe('refreshDailyNotification', () => {
  const row = (id: string, question: string, options: string[]) => ({
    id,
    question,
    options_json: JSON.stringify(options),
    answer_index: 1,
    explanation: 'e',
    chosen_index: null,
    answered_at: null,
    viewed_at: null,
  });

  beforeEach(() => {
    clearSqlResponses();
    notifeeMock.createTriggerNotification = jest.fn().mockResolvedValue(undefined);
    notifeeMock.cancelTriggerNotifications = jest.fn().mockResolvedValue(undefined);
    notifeeMock.getTriggerNotificationIds = jest.fn().mockResolvedValue([]);
    notifeeMock.setNotificationCategories = jest.fn().mockResolvedValue(undefined);
    notifeeMock.createChannel = jest.fn().mockResolvedValue(undefined);
  });

  it('schedules a distinct question for each day of the window', async () => {
    mockSqlResponse(
      'SELECT * FROM daily_questions',
      [
        row('q_a', 'Question A?', ['a1', 'a2', 'a3']),
        row('q_b', 'Question B?', ['b1', 'b2', 'b3']),
      ],
    );
    const first = await refreshDailyNotification();
    expect(first?.id).toBe('q_a');
    expect(notifeeMock.createTriggerNotification).toHaveBeenCalledTimes(
      DAILY_WINDOW_DAYS,
    );
    const calls = notifeeMock.createTriggerNotification.mock.calls as [
      { id: string; body: string; ios?: { categoryId?: string } },
      { timestamp: number },
    ][];
    const ids = calls.map(([notification]) => notification.id);
    expect(ids[0]).toBe('daily-practice-d0');
    expect(ids[13]).toBe('daily-practice-d13');
    expect(calls[0][0].body).toBe('Question A?');
    expect(calls[1][0].body).toBe('Question B?');
    expect(calls[2][0].body).toBe('Question A?');
    expect(calls[0][0].ios?.categoryId).toBe('daily_question_0');
    for (const [, trigger] of calls) {
      expect(trigger).not.toHaveProperty('repeatFrequency');
    }
    const timestamps = calls.map(([, trigger]) => trigger.timestamp);
    for (let i = 1; i < timestamps.length; i += 1) {
      expect(timestamps[i]).toBeGreaterThan(timestamps[i - 1]);
      expect(new Date(timestamps[i]).getHours()).toBe(19);
    }
  });

  it('queries the pool with the window size and replaces old triggers', async () => {
    mockSqlResponse(
      'SELECT * FROM daily_questions',
      [row('q_a', 'Question A?', ['a1', 'a2', 'a3'])],
    );
    notifeeMock.getTriggerNotificationIds.mockResolvedValue([
      'daily-practice',
      'daily-practice-d3',
      'other-trigger',
    ]);
    await refreshDailyNotification();
    const select = sqlCalls().find(([sql]) =>
      sql.includes('SELECT * FROM daily_questions'),
    );
    expect(select?.[1]).toEqual([DAILY_WINDOW_DAYS]);
    expect(notifeeMock.cancelTriggerNotifications).toHaveBeenCalledWith([
      'daily-practice',
      'daily-practice-d3',
    ]);
  });

  it('schedules nothing when the pool is empty', async () => {
    const first = await refreshDailyNotification();
    expect(first).toBeNull();
    expect(notifeeMock.createTriggerNotification).not.toHaveBeenCalled();
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

  it('launches the default activity when the notification body is pressed', () => {
    const notification = buildTestNotification(QUESTION);
    expect(notification.android?.pressAction?.launchActivity).toBe('default');
  });

  it('does not launch the app when an answer button is pressed', () => {
    const notification = buildTestNotification(QUESTION);
    for (const action of notification.android?.actions ?? []) {
      expect(action.pressAction?.launchActivity).toBeUndefined();
    }
  });
});
