import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import notifee from '@notifee/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useProfile } from '../context/ProfileContext';
import {
  getAnsweredUnviewedDailyQuestion,
  recordDailyAnswer,
} from '../data';
import {
  EventType,
  parsePressAction,
  refreshDailyNotification,
} from '../notifications/dailyQuestion';
import { OnboardingStack } from './OnboardingStack';
import { MainTabs } from './MainTabs';
import { ExerciseScreen } from '../screens/exercise/ExerciseScreen';
import { FeedbackScreen } from '../screens/exercise/FeedbackScreen';
import { SessionDetailScreen } from '../screens/progress/SessionDetailScreen';
import { LessonScreen } from '../screens/lesson/LessonScreen';
import type { RootStackParamList } from './types';
import type { NavigationProp } from '@react-navigation/native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { loading, isComplete, profile } = useProfile();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const notificationsEnabled = profile?.notificationsEnabled ?? false;

  useEffect(() => {
    if (loading || !isComplete) {
      return undefined;
    }
    let cancelled = false;

    const openLesson = (questionId: string) => {
      if (!cancelled) {
        navigation.navigate('Lesson', { questionId });
      }
    };

    const openPendingLesson = async () => {
      try {
        const pending = await getAnsweredUnviewedDailyQuestion();
        if (!cancelled && pending) {
          openLesson(pending.id);
        }
      } catch (error) {
        console.warn('Failed to check pending lesson', error);
      }
    };

    const handleInitialNotification = async () => {
      try {
        const initial = await notifee.getInitialNotification();
        const action = parsePressAction(initial?.pressAction?.id);
        if (action?.kind === 'answer') {
          await recordDailyAnswer(action.questionId, action.index);
          openLesson(action.questionId);
        } else if (action?.kind === 'open') {
          openLesson(action.questionId);
        } else {
          await openPendingLesson();
        }
      } catch (error) {
        console.warn('Failed to handle initial notification', error);
      }
    };

    const init = async () => {
      if (notificationsEnabled) {
        try {
          await refreshDailyNotification();
        } catch (error) {
          console.warn('Failed to refresh daily notification', error);
        }
      }
      await handleInitialNotification();
    };

    init();

    const unsubscribeForeground = notifee.onForegroundEvent(event => {
      const action = parsePressAction(event.detail.pressAction?.id);
      if (event.type === EventType.ACTION_PRESS && action?.kind === 'answer') {
        recordDailyAnswer(action.questionId, action.index).catch(error => {
          console.warn('Failed to record answer', error);
        });
        openLesson(action.questionId);
      } else if (action?.kind === 'open') {
        openLesson(action.questionId);
      } else if (event.type === EventType.PRESS) {
        openPendingLesson();
      }
    });

    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        init();
      }
    });

    return () => {
      cancelled = true;
      unsubscribeForeground();
      appStateSubscription.remove();
    };
  }, [loading, isComplete, notificationsEnabled, navigation]);

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isComplete ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen
            name="Exercise"
            component={ExerciseScreen}
            options={{ headerShown: true, title: 'Exercise' }}
          />
          <Stack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{ headerShown: true, title: 'Feedback', headerLeft: () => null }}
          />
          <Stack.Screen
            name="SessionDetail"
            component={SessionDetailScreen}
            options={{ headerShown: true, title: 'Session' }}
          />
          <Stack.Screen
            name="Lesson"
            component={LessonScreen}
            options={{ headerShown: true, title: 'Daily lesson' }}
          />
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
      )}
    </Stack.Navigator>
  );
}
