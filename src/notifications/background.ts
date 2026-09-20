import notifee, { EventType } from '@notifee/react-native';
import { recordDailyAnswer } from '../data';
import { parsePressAction } from './dailyQuestion';

notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.ACTION_PRESS) {
    return;
  }
  const action = parsePressAction(detail.pressAction?.id);
  if (action?.kind !== 'answer') {
    return;
  }
  try {
    await recordDailyAnswer(action.questionId, action.index);
    const notificationId = detail.notification?.id;
    if (notificationId) {
      await notifee.cancelDisplayedNotification(notificationId);
    }
  } catch (error) {
    console.warn('Failed to record background answer', error);
  }
});
