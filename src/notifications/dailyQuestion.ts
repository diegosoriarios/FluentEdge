import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type { Notification } from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  ensureQuestionsSeeded,
  getDailyQuestionWindow,
  getUnansweredDailyQuestion,
} from '../data';
import type { DailyQuestionRecord } from '../data/questions';
import { logDebug } from '../services/debugLog';
import { runScheduledExclusively, verifyTriggersRegistered } from './scheduler';

export const DAILY_NOTIFICATION_ID = 'daily-practice';
export const TEST_NOTIFICATION_ID = 'daily-practice-test';
export const ANDROID_CHANNEL_ID = 'daily-practice';
export const IOS_CATEGORY_ID = 'daily_question';
export const DEFAULT_HOUR = 19;
export const DEFAULT_MINUTE = 0;
export const DAILY_WINDOW_DAYS = 14;
export const LOG_TAG = 'notifications';
export const STUDY_REMINDER_PRESS_ACTION_ID = 'open-study';

export function buildDailyTriggerId(dayIndex: number): string {
  return `${DAILY_NOTIFICATION_ID}-d${dayIndex}`;
}

export function buildIosCategoryId(dayIndex: number): string {
  return `${IOS_CATEGORY_ID}_${dayIndex}`;
}

export function isDailyTriggerId(id: string): boolean {
  return id === DAILY_NOTIFICATION_ID || /^daily-practice-d\d+$/.test(id);
}

export type PressActionPayload =
  | { kind: 'answer'; questionId: string; index: number }
  | { kind: 'open'; questionId: string }
  | { kind: 'study' };

export function buildAnswerActionId(
  questionId: string,
  index: number,
): string {
  return `answer|${questionId}|${index}`;
}

export function buildOpenActionId(questionId: string): string {
  return `open|${questionId}`;
}

export function parsePressAction(
  id: string | undefined,
): PressActionPayload | null {
  if (!id) {
    return null;
  }
  if (id === STUDY_REMINDER_PRESS_ACTION_ID) {
    return { kind: 'study' };
  }
  const parts = id.split('|');
  if (parts[0] === 'answer' && parts.length === 3) {
    const index = Number.parseInt(parts[2], 10);
    if (Number.isInteger(index) && index >= 0) {
      return { kind: 'answer', questionId: parts[1], index };
    }
  }
  if (parts[0] === 'open' && parts.length === 2) {
    return { kind: 'open', questionId: parts[1] };
  }
  return null;
}

function baseOccurrence(
  hour: number,
  minute: number,
  now: number,
): Date {
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= now) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

export function nextOccurrence(
  hour: number,
  minute: number,
  now = Date.now(),
): number {
  return baseOccurrence(hour, minute, now).getTime();
}

export function dailyTriggerTimestamp(
  hour: number,
  minute: number,
  dayOffset: number,
  now = Date.now(),
): number {
  const date = baseOccurrence(hour, minute, now);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.getTime();
}

export async function ensureNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

async function ensureAndroidChannel(): Promise<void> {
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Daily practice',
    importance: AndroidImportance.HIGH,
  });
}

function questionNotification(
  id: string,
  title: string,
  question: DailyQuestionRecord,
  categoryId: string = IOS_CATEGORY_ID,
): Notification {
  return {
    id,
    title,
    body: question.question,
    android: {
      channelId: ANDROID_CHANNEL_ID,
      smallIcon: 'ic_notification',
      pressAction: {
        id: buildOpenActionId(question.id),
        launchActivity: 'default',
      },
      actions: question.options.map((option, index) => ({
        title: option,
        pressAction: { id: buildAnswerActionId(question.id, index) },
      })),
    },
    ios: {
      categoryId,
    },
  };
}

async function registerIosCategories(
  entries: { id: string; question: DailyQuestionRecord }[],
): Promise<void> {
  if (Platform.OS !== 'ios' || entries.length === 0) {
    return;
  }
  await notifee.setNotificationCategories(
    entries.map(({ id, question }) => ({
      id,
      actions: question.options.map((option, index) => ({
        id: buildAnswerActionId(question.id, index),
        title: option,
        foreground: false,
      })),
    })),
  );
}

async function cancelDailyTriggers(): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    const dailyIds = ids.filter(isDailyTriggerId);
    if (dailyIds.length > 0) {
      await notifee.cancelTriggerNotifications(dailyIds);
    }
  } catch (error) {
    logDebug(LOG_TAG, 'failed to cancel previous daily triggers', error);
  }
}

export async function refreshDailyNotification(
  hour = DEFAULT_HOUR,
  minute = DEFAULT_MINUTE,
): Promise<DailyQuestionRecord | null> {
  return runScheduledExclusively(async () => {
    await ensureQuestionsSeeded();
    const window = await getDailyQuestionWindow(DAILY_WINDOW_DAYS);
    if (window.length === 0) {
      logDebug(
        LOG_TAG,
        'no daily questions available — nothing scheduled',
      );
      return null;
    }

    await registerIosCategories(
      window.map((question, index) => ({
        id: buildIosCategoryId(index),
        question,
      })),
    );
    await ensureAndroidChannel();
    await cancelDailyTriggers();

    const first: Date = new Date(
      dailyTriggerTimestamp(hour, minute, 0),
    );
    for (let day = 0; day < DAILY_WINDOW_DAYS; day += 1) {
      const question = window[day % window.length];
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: dailyTriggerTimestamp(hour, minute, day),
      };
      await notifee.createTriggerNotification(
        questionNotification(
          buildDailyTriggerId(day),
          'Daily grammar practice',
          question,
          buildIosCategoryId(day),
        ),
        trigger,
      );
    }
    logDebug(
      LOG_TAG,
      `daily question window scheduled: ${window.length} questions `
        + `over ${DAILY_WINDOW_DAYS} days, first at ${first.toISOString()} `
        + `(question ${window[0].id})`,
    );
    await verifyTriggersRegistered(LOG_TAG);

    return window[0];
  });
}

export function buildTestNotification(
  question: DailyQuestionRecord,
): Notification {
  return questionNotification(
    TEST_NOTIFICATION_ID,
    'Daily grammar practice (test)',
    question,
  );
}

export async function sendTestQuestionNotification(): Promise<DailyQuestionRecord> {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    throw new Error('Notification permission was not granted.');
  }
  await ensureAndroidChannel();
  await ensureQuestionsSeeded();
  const question = await getUnansweredDailyQuestion();
  if (!question) {
    throw new Error('No unanswered question left to send.');
  }
  await registerIosCategories([
    { id: IOS_CATEGORY_ID, question },
  ]);
  await notifee.displayNotification(buildTestNotification(question));
  return question;
}

export async function enableDailyNotifications(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    logDebug(LOG_TAG, 'enable skipped: notification permission not granted');
    return false;
  }
  await ensureAndroidChannel();
  await refreshDailyNotification();
  if (Platform.OS === 'android') {
    try {
      const batteryRestricted = await notifee.isBatteryOptimizationEnabled();
      if (batteryRestricted) {
        logDebug(
          LOG_TAG,
          'battery optimization is enabled — scheduled reminders may be '
            + 'delayed or dropped on this device. Disable it via Settings > '
            + 'Notification diagnostics.',
        );
      }
    } catch (error) {
      logDebug(LOG_TAG, 'battery optimization check failed', error);
    }
  }
  return true;
}

export async function disableDailyNotifications(): Promise<void> {
  try {
    await cancelDailyTriggers();
    logDebug(LOG_TAG, 'daily question notifications cancelled');
  } catch (error) {
    logDebug(LOG_TAG, 'failed to cancel daily notifications', error);
  }
}

export { EventType };
