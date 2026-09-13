import notifee, {
  AndroidImportance,
  AuthorizationStatus,
  EventType,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {
  ensureQuestionsSeeded,
  getUnansweredDailyQuestion,
} from '../data';
import type { DailyQuestionRecord } from '../data/questions';

export const DAILY_NOTIFICATION_ID = 'daily-practice';
export const ANDROID_CHANNEL_ID = 'daily-practice';
export const IOS_CATEGORY_ID = 'daily_question';
export const DEFAULT_HOUR = 19;
export const DEFAULT_MINUTE = 0;

export type PressActionPayload =
  | { kind: 'answer'; questionId: string; index: number }
  | { kind: 'open'; questionId: string };

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
    importance: AndroidImportance.DEFAULT,
  });
}

export async function refreshDailyNotification(
  hour = DEFAULT_HOUR,
  minute = DEFAULT_MINUTE,
): Promise<DailyQuestionRecord | null> {
  await ensureQuestionsSeeded();
  const question = await getUnansweredDailyQuestion();
  if (!question) {
    return null;
  }

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

  await notifee.cancelTriggerNotifications([DAILY_NOTIFICATION_ID]);

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: nextOccurrence(hour, minute),
    repeatFrequency: RepeatFrequency.DAILY,
  };

  await notifee.createTriggerNotification(
    {
      id: DAILY_NOTIFICATION_ID,
      title: 'Daily grammar practice',
      body: question.question,
      android: {
        channelId: ANDROID_CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: buildOpenActionId(question.id) },
        actions: question.options.map((option, index) => ({
          title: option,
          pressAction: { id: buildAnswerActionId(question.id, index) },
        })),
      },
      ios: {
        categoryId: IOS_CATEGORY_ID,
      },
    },
    trigger,
  );

  return question;
}

export async function enableDailyNotifications(): Promise<boolean> {
  const granted = await ensureNotificationPermission();
  if (!granted) {
    return false;
  }
  await ensureAndroidChannel();
  await refreshDailyNotification();
  return true;
}

export async function disableDailyNotifications(): Promise<void> {
  try {
    await notifee.cancelTriggerNotifications([DAILY_NOTIFICATION_ID]);
  } catch (error) {
    console.warn('Failed to cancel daily notification', error);
  }
}

export { EventType };
