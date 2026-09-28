import {
  hasPracticedToday,
  nextReminderTimestamp,
} from '../studyReminder';

const NOW = new Date(2026, 8, 28, 8, 0, 0).getTime();
const SAME_DAY_MORNING = new Date(2026, 8, 28, 7, 30, 0).getTime();
const PREVIOUS_DAY = new Date(2026, 8, 27, 21, 0, 0).getTime();

describe('hasPracticedToday', () => {
  it('returns false when there is no session yet', () => {
    expect(hasPracticedToday(null, NOW)).toBe(false);
  });

  it('returns true for a session on the same local day', () => {
    expect(hasPracticedToday(SAME_DAY_MORNING, NOW)).toBe(true);
  });

  it('returns false for a session on the previous day', () => {
    expect(hasPracticedToday(PREVIOUS_DAY, NOW)).toBe(false);
  });
});

describe('nextReminderTimestamp', () => {
  it('schedules today when the time is ahead and user did not practice', () => {
    const timestamp = nextReminderTimestamp(10, 0, null, NOW);
    const expected = new Date(2026, 8, 28, 10, 0, 0).getTime();
    expect(timestamp).toBe(expected);
  });

  it('skips to tomorrow when the user already practiced today', () => {
    const timestamp = nextReminderTimestamp(10, 0, SAME_DAY_MORNING, NOW);
    const expected = new Date(2026, 8, 29, 10, 0, 0).getTime();
    expect(timestamp).toBe(expected);
  });

  it('rolls to tomorrow when the time already passed, practice or not', () => {
    const evening = new Date(2026, 8, 28, 20, 0, 0).getTime();
    expect(nextReminderTimestamp(10, 0, null, evening)).toBe(
      new Date(2026, 8, 29, 10, 0, 0).getTime(),
    );
    expect(nextReminderTimestamp(10, 0, SAME_DAY_MORNING, evening)).toBe(
      new Date(2026, 8, 29, 10, 0, 0).getTime(),
    );
  });

  it('schedules today when the user only practiced yesterday', () => {
    const timestamp = nextReminderTimestamp(10, 0, PREVIOUS_DAY, NOW);
    const expected = new Date(2026, 8, 28, 10, 0, 0).getTime();
    expect(timestamp).toBe(expected);
  });

  it('honors custom minutes', () => {
    const timestamp = nextReminderTimestamp(18, 30, null, NOW);
    const expected = new Date(2026, 8, 28, 18, 30, 0).getTime();
    expect(timestamp).toBe(expected);
  });
});
