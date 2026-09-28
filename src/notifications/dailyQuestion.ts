import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import type { Notification } from '@notifee/react-native';
import { Platform } from 'react-native';
import {
  ensureQuestionsSeeded,
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
      categoryId: IOS_CATEGORY_ID,
    },
  };
}

async function registerIosCategory(
  question: DailyQuestionRecord,
): Promise<void> {
  await notifee.setNotificationCategories([
    {
      id: IOS_CATEGORY_ID,
      actions: question.options.map((option, index) => ({
        id: buildAnswerActionId(question.id, index),
        title: option,
        foreground: false,
      })),
    },
  ]);
}

export async function refreshDailyNotification(
  hour = DEFAULT_HOUR,
  minute = DEFAULT_MINUTE,
): Promise<DailyQuestionRecord | null> {
  return runScheduledExclusively(async () => {
    await ensureQuestionsSeeded();
    const question = await getUnansweredDailyQuestion();
    if (!question) {
      logDebug(
        LOG_TAG,
        'no unanswered daily question available — nothing scheduled',
      );
      return null;
    }

    await registerIosCategory(question);
    await ensureAndroidChannel();
    await notifee.cancelTriggerNotifications([DAILY_NOTIFICATION_ID]);

    const timestamp = nextOccurrence(hour, minute);
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp,
      repeatFrequency: RepeatFrequency.DAILY,
    };

    await notifee.createTriggerNotification(
      questionNotification(DAILY_NOTIFICATION_ID, 'Daily grammar practice', question),
      trigger,
    );
    logDebug(
      LOG_TAG,
      `daily question scheduled at ${new Date(timestamp).toISOString()} `
        + `(repeats daily, question ${question.id})`,
    );
    await verifyTriggersRegistered(LOG_TAG);

    return question;
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
  await registerIosCategory(question);
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
    await notifee.cancelTriggerNotifications([DAILY_NOTIFICATION_ID]);
    logDebug(LOG_TAG, 'daily question notification cancelled');
  } catch (error) {
    logDebug(LOG_TAG, 'failed to cancel daily notification', error);
  }
}

export { EventType };
