import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type {
  IOSNotificationCategory,
  Notification,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  ensureQuestionsSeeded,
  getAnsweredDailyQuestions,
  getUnansweredDailyQuestions,
  insertGeneratedDailyQuestion,
} from '../data';
import type { DailyQuestionRecord } from '../data/questions';
import { generateDailyQuestion } from '../ai/tutor';
import type { Profile } from '../navigation/types';
import { logDebug } from '../services/debugLog';
import { runScheduledExclusively, verifyTriggersRegistered } from './scheduler';

export const DAILY_NOTIFICATION_ID = 'daily-practice';
export const TEST_NOTIFICATION_ID = 'daily-practice-test';
export const ANDROID_CHANNEL_ID = 'daily-practice';
export const IOS_CATEGORY_ID = 'daily_question';
export const DEFAULT_HOUR = 19;
export const DEFAULT_MINUTE = 0;
export const QUEUE_LENGTH = 7;
export const MAX_GENERATED_PER_REPLENISH = 3;
export const LOG_TAG = 'notifications';
export const STUDY_REMINDER_PRESS_ACTION_ID = 'open-study';

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

export function nextOccurrence(
  hour: number,
  minute: number,
  now = Date.now(),
): number {
  const date = new Date(now);
  date.setHours(hour, minute, 0, 0);
  if (date.getTime() <= now) {
    date.setDate(date.getDate() + 1);
  }
  return date.getTime();
}

export function upcomingOccurrences(
  hour: number,
  minute: number,
  count: number,
  now = Date.now(),
): number[] {
  const first = new Date(nextOccurrence(hour, minute, now));
  const timestamps: number[] = [];
  for (let day = 0; day < count; day += 1) {
    const occurrence = new Date(first);
    occurrence.setDate(occurrence.getDate() + day);
    timestamps.push(occurrence.getTime());
  }
  return timestamps;
}

export function dailyQueueNotificationId(day: number): string {
  return `${DAILY_NOTIFICATION_ID}-d${day}`;
}

export function dailyQueueNotificationIds(): string[] {
  return Array.from({ length: QUEUE_LENGTH }, (_, day) =>
    dailyQueueNotificationId(day),
  );
}

export function dailyQueueCategoryId(day: number): string {
  return `${IOS_CATEGORY_ID}-${day}`;
}

export type QueueDay = { day: number; question: DailyQuestionRecord };

export function planQueue(
  pool: DailyQuestionRecord[],
  days: number,
): QueueDay[] {
  const plan: QueueDay[] = [];
  if (pool.length === 0) {
    return plan;
  }
  for (let day = 0; day < days; day += 1) {
    plan.push({ day, question: pool[day % pool.length] });
  }
  return plan;
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
      pressAction: { id: buildOpenActionId(question.id) },
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

function buildIosCategory(
  id: string,
  question: DailyQuestionRecord,
): IOSNotificationCategory {
  return {
    id,
    actions: question.options.map((option, index) => ({
      id: buildAnswerActionId(question.id, index),
      title: option,
      foreground: false,
    })),
  };
}

let activeQueueCategories: IOSNotificationCategory[] = [];

async function topUpQuestionPool(
  profile: Profile,
  deficit: number,
): Promise<number> {
  const target = Math.min(deficit, MAX_GENERATED_PER_REPLENISH);
  let inserted = 0;
  for (let attempt = 0; attempt < target; attempt += 1) {
    try {
      const question = await generateDailyQuestion(profile);
      if (!question) {
        logDebug(LOG_TAG, 'model did not return a multiple-choice question');
        break;
      }
      const insertedRow = await insertGeneratedDailyQuestion(question);
      if (!insertedRow) {
        logDebug(LOG_TAG, 'generated question duplicates an existing one');
        break;
      }
      inserted += 1;
    } catch (error) {
      logDebug(LOG_TAG, 'daily question generation failed', error);
      break;
    }
  }
  if (inserted > 0) {
    logDebug(LOG_TAG, `generated ${inserted} new daily question(s)`);
  }
  return inserted;
}

async function buildQuestionPool(
  profile: Profile | null,
): Promise<DailyQuestionRecord[]> {
  let pool = await getUnansweredDailyQuestions(QUEUE_LENGTH);
  if (pool.length < QUEUE_LENGTH && profile) {
    const generated = await topUpQuestionPool(
      profile,
      QUEUE_LENGTH - pool.length,
    );
    if (generated > 0) {
      pool = await getUnansweredDailyQuestions(QUEUE_LENGTH);
    }
  }
  if (pool.length < QUEUE_LENGTH) {
    const seen = new Set(pool.map(question => question.id));
    const answered = await getAnsweredDailyQuestions(QUEUE_LENGTH);
    for (const question of answered) {
      if (pool.length >= QUEUE_LENGTH) {
        break;
      }
      if (!seen.has(question.id)) {
        pool.push(question);
        seen.add(question.id);
      }
    }
  }
  return pool;
}

export async function cancelDailyQueueTriggers(): Promise<void> {
  await notifee.cancelTriggerNotifications(dailyQueueNotificationIds());
}

export async function refreshDailyQueue(
  profile: Profile | null,
  hour = DEFAULT_HOUR,
  minute = DEFAULT_MINUTE,
): Promise<DailyQuestionRecord[]> {
  return runScheduledExclusively(async () => {
    await ensureQuestionsSeeded();
    const pool = await buildQuestionPool(profile);
    const plan = planQueue(pool, QUEUE_LENGTH);

    await ensureAndroidChannel();
    await cancelDailyQueueTriggers();

    if (plan.length === 0) {
      activeQueueCategories = [];
      logDebug(LOG_TAG, 'no questions available — daily queue cleared');
      return [];
    }

    const categories = plan.map(({ day, question }) =>
      buildIosCategory(dailyQueueCategoryId(day), question),
    );
    await notifee.setNotificationCategories(categories);
    activeQueueCategories = categories;

    const timestamps = upcomingOccurrences(hour, minute, QUEUE_LENGTH);
    for (const { day, question } of plan) {
      const trigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: timestamps[day],
      };
      await notifee.createTriggerNotification(
        questionNotification(
          dailyQueueNotificationId(day),
          'Daily grammar practice',
          question,
          dailyQueueCategoryId(day),
        ),
        trigger,
      );
    }
    logDebug(
      LOG_TAG,
      `daily queue scheduled: ${plan.length} notification(s) starting `
        + `${new Date(timestamps[0]).toISOString()}, pool=${pool.length}`,
    );
    await verifyTriggersRegistered(LOG_TAG);

    return plan.map(entry => entry.question);
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
  const question =
    (await getUnansweredDailyQuestions(1))[0] ??
    (await getAnsweredDailyQuestions(1))[0] ??
    null;
  if (!question) {
    throw new Error('No question available to send.');
  }
  await notifee.setNotificationCategories([
    buildIosCategory(IOS_CATEGORY_ID, question),
    ...activeQueueCategories,
  ]);
  await notifee.displayNotification(buildTestNotification(question));
  return question;
}

export async function enableDailyNotifications(
  profile: Profile | null,
): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    logDebug(LOG_TAG, 'enable skipped: notification permission not granted');
    return false;
  }
  await ensureAndroidChannel();
  await refreshDailyQueue(profile);
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
    await cancelDailyQueueTriggers();
    logDebug(LOG_TAG, 'daily question queue cancelled');
  } catch (error) {
    logDebug(LOG_TAG, 'failed to cancel daily question queue', error);
  }
}

export { EventType };
