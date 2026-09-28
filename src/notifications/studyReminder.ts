import notifee, {
  AndroidImportance,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type { Notification } from '@notifee/react-native';
import { getSessionStats, localDayKey } from '../data';
import { logDebug } from '../services/debugLog';
import {
  LOG_TAG,
  STUDY_REMINDER_PRESS_ACTION_ID,
  nextOccurrence,
} from './dailyQuestion';
import { runScheduledExclusively, verifyTriggersRegistered } from './scheduler';

export { STUDY_REMINDER_PRESS_ACTION_ID };

export const STUDY_REMINDER_NOTIFICATION_ID = 'study-reminder';
export const STUDY_REMINDER_CHANNEL_ID = 'study-reminder';
export const DEFAULT_REMINDER_HOUR = 10;
export const DEFAULT_REMINDER_MINUTE = 0;

export function hasPracticedToday(
  lastSessionAt: number | null,
  now = Date.now(),
): boolean {
  if (lastSessionAt == null) {
    return false;
  }
  return localDayKey(lastSessionAt) === localDayKey(now);
}

export function nextReminderTimestamp(
  hour: number,
  minute: number,
  lastSessionAt: number | null,
  now = Date.now(),
): number {
  const timestamp = nextOccurrence(hour, minute, now);
  if (!hasPracticedToday(lastSessionAt, now)) {
    return timestamp;
  }
  const scheduled = new Date(timestamp);
  if (localDayKey(scheduled.getTime()) === localDayKey(now)) {
    scheduled.setDate(scheduled.getDate() + 1);
  }
  return scheduled.getTime();
}

async function ensureReminderChannel(): Promise<void> {
  await notifee.createChannel({
    id: STUDY_REMINDER_CHANNEL_ID,
    name: 'Practice reminders',
    importance: AndroidImportance.HIGH,
  });
}

function reminderNotification(): Notification {
  return {
    id: STUDY_REMINDER_NOTIFICATION_ID,
    title: 'Time to practice',
    body: 'Keep your streak going — a quick English session takes just 5 minutes.',
    android: {
      channelId: STUDY_REMINDER_CHANNEL_ID,
      smallIcon: 'ic_notification',
      pressAction: { id: STUDY_REMINDER_PRESS_ACTION_ID },
    },
  };
}

export async function refreshStudyReminder(
  hour = DEFAULT_REMINDER_HOUR,
  minute = DEFAULT_REMINDER_MINUTE,
): Promise<void> {
  await runScheduledExclusively(async () => {
    const { lastSessionAt } = await getSessionStats();
    const timestamp = nextReminderTimestamp(hour, minute, lastSessionAt);

    await ensureReminderChannel();
    await notifee.cancelTriggerNotifications([STUDY_REMINDER_NOTIFICATION_ID]);

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: RepeatFrequency.DAILY,
    };
    await notifee.createTriggerNotification(reminderNotification(), trigger);
    logDebug(
      LOG_TAG,
      `study reminder scheduled at ${new Date(timestamp).toISOString()} `
        + `(repeats daily, practiced today=${hasPracticedToday(lastSessionAt)})`,
    );
    await verifyTriggersRegistered(LOG_TAG);
  });
}

export async function enableStudyReminder(
  hour = DEFAULT_REMINDER_HOUR,
  minute = DEFAULT_REMINDER_MINUTE,
): Promise<void> {
  await ensureReminderChannel();
  await refreshStudyReminder(hour, minute);
}

export async function disableStudyReminder(): Promise<void> {
  try {
    await notifee.cancelTriggerNotifications([STUDY_REMINDER_NOTIFICATION_ID]);
    logDebug(LOG_TAG, 'study reminder cancelled');
  } catch (error) {
    logDebug(LOG_TAG, 'failed to cancel study reminder', error);
  }
}
