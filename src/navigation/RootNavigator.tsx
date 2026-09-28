import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import notifee, { AuthorizationStatus, EventType } from '@notifee/react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useProfile } from '../context/ProfileContext';
import {
  getAnsweredUnviewedDailyQuestion,
  recordDailyAnswer,
} from '../data';
import {
  enableDailyNotifications,
  parsePressAction,
  refreshDailyNotification,
} from '../notifications/dailyQuestion';
import { refreshStudyReminder } from '../notifications/studyReminder';
import { logDebug } from '../services/debugLog';
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
  const { loading, isComplete, profile, retaking, saveProfile } = useProfile();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const notificationsEnabled = profile?.notificationsEnabled ?? false;
  const reminderEnabled =
    notificationsEnabled && (profile?.reminderEnabled ?? true);
  const showMainApp = isComplete && !retaking;

  useEffect(() => {
    if (loading || !showMainApp) {
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
        logDebug('notifications', 'failed to check pending lesson', error);
      }
    };

    const handleInitialNotification = async () => {
      try {
        const initial = await notifee.getInitialNotification();
        const action = parsePressAction(initial?.pressAction?.id);
        if (action?.kind === 'answer') {
          await recordDailyAnswer(action.questionId, action.index);
          const notificationId = initial?.notification?.id;
          if (notificationId) {
            await notifee
              .cancelDisplayedNotification(notificationId)
              .catch(() => {});
          }
          openLesson(action.questionId);
        } else if (action?.kind === 'open') {
          openLesson(action.questionId);
        } else if (action?.kind === 'study') {
          if (!cancelled) {
            navigation.navigate('Main');
          }
        } else {
          await openPendingLesson();
        }
      } catch (error) {
        logDebug('notifications', 'failed to handle initial notification', error);
      }
    };

    const decideNotificationsEnabled = async () => {
      if (!profile || profile.notificationsEnabled !== undefined) {
        return;
      }
      try {
        const settings = await notifee.getNotificationSettings();
        const granted =
          settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
          settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
        if (granted) {
          logDebug(
            'notifications',
            'permission already granted but never opted in — enabling daily notifications',
          );
          const ok = await enableDailyNotifications();
          if (!cancelled) {
            await saveProfile({ ...profile, notificationsEnabled: ok });
          }
        } else {
          if (!cancelled) {
            await saveProfile({ ...profile, notificationsEnabled: false });
          }
        }
      } catch (error) {
        logDebug(
          'notifications',
          'failed to decide initial notifications state',
          error,
        );
      }
    };

    const init = async () => {
      if (notificationsEnabled) {
        try {
          await refreshDailyNotification();
        } catch (error) {
          logDebug('notifications', 'failed to refresh daily notification', error);
        }
      }
      if (reminderEnabled) {
        try {
          await refreshStudyReminder(
            profile?.reminderHour,
            profile?.reminderMinute,
          );
        } catch (error) {
          logDebug('notifications', 'failed to refresh study reminder', error);
        }
      }
      await handleInitialNotification();
    };

    decideNotificationsEnabled();
    init();

    const unsubscribeForeground = notifee.onForegroundEvent(event => {
      const action = parsePressAction(event.detail.pressAction?.id);
      if (event.type === EventType.ACTION_PRESS && action?.kind === 'answer') {
        recordDailyAnswer(action.questionId, action.index).catch(error => {
          logDebug('notifications', 'failed to record answer', error);
        });
        const notificationId = event.detail.notification?.id;
        if (notificationId) {
          notifee.cancelDisplayedNotification(notificationId).catch(() => {});
        }
        openLesson(action.questionId);
      } else if (action?.kind === 'open') {
        openLesson(action.questionId);
      } else if (action?.kind === 'study') {
        if (!cancelled) {
          navigation.navigate('Main');
        }
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
  }, [
    loading,
    showMainApp,
    notificationsEnabled,
    reminderEnabled,
    profile,
    saveProfile,
    navigation,
  ]);

  if (loading) {
    return null;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showMainApp ? (
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
