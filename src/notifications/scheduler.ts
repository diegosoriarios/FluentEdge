import notifee from '@notifee/react-native';
import { logDebug } from '../services/debugLog';

let scheduleQueue: Promise<unknown> = Promise.resolve();

export function runScheduledExclusively<T>(task: () => Promise<T>): Promise<T> {
  const result = scheduleQueue.then(task, task);
  scheduleQueue = result.catch(() => {});
  return result;
}

export async function verifyTriggersRegistered(tag: string): Promise<void> {
  try {
    const ids = await notifee.getTriggerNotificationIds();
    logDebug(
      tag,
      `registered trigger notifications: ${ids.length > 0 ? ids.join(', ') : 'none'}`,
    );
  } catch (error) {
    logDebug(tag, 'failed to read registered trigger notifications', error);
  }
}
