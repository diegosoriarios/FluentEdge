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
  } catch (error) {
    console.warn('Failed to record background answer', error);
  }
});
