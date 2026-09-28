import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import notifee from '@notifee/react-native';
import { Screen } from '../../components/Screen';
import { Button, Card, Chip, ProgressBar, SectionLabel } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { useProfile } from '../../context/ProfileContext';
import { useModel } from '../../context/ModelContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { FOCUS_AREA_LABELS, GOAL_LABELS } from '../../data/prompts';
import { LANGUAGES } from '../../ai/languages';
import type { LanguageCode } from '../../ai/languages';
import { MODEL_VARIANTS } from '../../ai/modelConfig';
import { getModelInfo } from '../../services/modelManager';
import type { ModelInfo } from '../../services/modelManager';
import {
  clearDebugLogs,
  getDebugLogText,
  logDebug,
} from '../../services/debugLog';
import { formatBytes } from '../../utils/format';
import {
  DEFAULT_HOUR,
  disableDailyNotifications,
  enableDailyNotifications,
  sendTestQuestionNotification,
} from '../../notifications/dailyQuestion';
import {
  DEFAULT_REMINDER_HOUR,
  DEFAULT_REMINDER_MINUTE,
  disableStudyReminder,
  enableStudyReminder,
  refreshStudyReminder,
} from '../../notifications/studyReminder';
import type { FocusArea } from '../../navigation/types';

const FOCUS_AREAS: FocusArea[] = ['grammar', 'vocabulary', 'tone', 'fluency'];

const LANGUAGE_CODES: LanguageCode[] = ['en', 'es'];

const MODEL_STATE_LABELS: Record<string, string> = {
  'not-downloaded': 'Not downloaded',
  downloading: 'Downloading',
  paused: 'Paused',
  verifying: 'Verifying',
  ready: 'Ready',
  error: 'Download failed',
};

export function SettingsScreen() {
  const { profile, saveProfile, startRetake } = useProfile();
  const {
    modelState,
    progress,
    errorMessage,
    activeVariant,
    deviceCapability,
    pauseSupported,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteModel,
  } = useModel();
  const { reset: resetDraft } = useOnboarding();
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [togglingReminder, setTogglingReminder] = useState(false);
  const [adjustingReminder, setAdjustingReminder] = useState(false);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [testNotificationStatus, setTestNotificationStatus] = useState<
    string | null
  >(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [debugLogText, setDebugLogText] = useState('');
  const [batteryOptimization, setBatteryOptimization] = useState<
    boolean | null
  >(null);
  const [powerManagerActivity, setPowerManagerActivity] = useState<
    string | null
  >(null);

  useEffect(() => {
    const refresh = () => setDebugLogText(getDebugLogText());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const refreshDiagnostics = () => {
      Promise.all([
        notifee.isBatteryOptimizationEnabled(),
        notifee.getPowerManagerInfo(),
      ])
        .then(([battery, power]) => {
          setBatteryOptimization(battery);
          setPowerManagerActivity(power.activity ?? null);
        })
        .catch(error => {
          console.warn('Failed to read notification diagnostics', error);
        });
    };
    refreshDiagnostics();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        refreshDiagnostics();
      }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (modelState === 'ready') {
      getModelInfo(activeVariant)
        .then(info => {
          if (!cancelled) {
            setModelInfo(info);
          }
        })
        .catch(() => {});
    } else {
      setModelInfo(null);
    }
    return () => {
      cancelled = true;
    };
  }, [modelState, activeVariant]);

  if (!profile) {
    return <Screen title="Settings" />;
  }

  const toggleFocusArea = (area: FocusArea) => {
    const selected = profile.focusAreas.includes(area);
    saveProfile({
      ...profile,
      focusAreas: selected
        ? profile.focusAreas.filter(item => item !== area)
        : [...profile.focusAreas, area],
    });
  };

  const setTargetLanguage = (code: LanguageCode) => {
    saveProfile({ ...profile, targetLanguage: code });
  };

  const setExplanationLanguage = (code: LanguageCode) => {
    saveProfile({ ...profile, explanationLanguage: code });
  };

  const confirmDeleteModel = () => {
    Alert.alert(
      'Delete AI model?',
      'This frees storage now, but exercises will need the model again — you '
        + 'can re-download it later. Your profile and progress are kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteModel(activeVariant);
          },
        },
      ],
    );
  };

  const retakeDiagnostic = () => {
    resetDraft();
    startRetake();
  };

  const handleShareLogs = async () => {
    try {
      await Share.share({ message: debugLogText || 'No log entries yet.' });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  };

  const handleClearLogs = () => {
    clearDebugLogs();
    setDebugLogText('');
  };

  const handleSendTestNotification = async () => {
    if (sendingTestNotification) {
      return;
    }
    setSendingTestNotification(true);
    setTestNotificationStatus(null);
    try {
      const question = await sendTestQuestionNotification();
      logDebug(
        'app',
        `test question notification sent (${question.id})`,
      );
      setTestNotificationStatus(
        'Sent. Answer it from the notification itself.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not send notification.';
      logDebug('app', `test question notification failed: ${message}`);
      setTestNotificationStatus(message);
    } finally {
      setSendingTestNotification(false);
    }
  };

  const toggleNotifications = async (enabled: boolean) => {
    setTogglingNotifications(true);
    try {
      if (enabled) {
        const granted = await enableDailyNotifications();
        await saveProfile({ ...profile, notificationsEnabled: granted });
      } else {
        await disableDailyNotifications();
        await disableStudyReminder();
        await saveProfile({ ...profile, notificationsEnabled: false });
      }
    } catch (error) {
      logDebug('notifications', 'failed to toggle notifications', error);
    } finally {
      setTogglingNotifications(false);
    }
  };

  const reminderHour = profile.reminderHour ?? DEFAULT_REMINDER_HOUR;
  const reminderMinute = profile.reminderMinute ?? DEFAULT_REMINDER_MINUTE;
  const reminderOn =
    (profile.notificationsEnabled ?? false)
    && (profile.reminderEnabled ?? true);

  const toggleReminder = async (enabled: boolean) => {
    setTogglingReminder(true);
    try {
      if (enabled) {
        let notificationsOn = profile.notificationsEnabled ?? false;
        if (!notificationsOn) {
          notificationsOn = await enableDailyNotifications();
        }
        if (notificationsOn) {
          await enableStudyReminder(reminderHour, reminderMinute);
        }
        await saveProfile({
          ...profile,
          notificationsEnabled: notificationsOn,
          reminderEnabled: notificationsOn,
        });
      } else {
        await disableStudyReminder();
        await saveProfile({ ...profile, reminderEnabled: false });
      }
    } catch (error) {
      logDebug('notifications', 'failed to toggle study reminder', error);
    } finally {
      setTogglingReminder(false);
    }
  };

  const formatReminderTime = (hour: number, minute: number): string => {
    const hh = `${hour}`.padStart(2, '0');
    const mm = `${minute}`.padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const adjustReminderTime = async (hourDelta: number, minuteDelta: number) => {
    if (adjustingReminder) {
      return;
    }
    setAdjustingReminder(true);
    try {
      const hour = ((reminderHour + hourDelta) % 24 + 24) % 24;
      const minute = ((reminderMinute + minuteDelta) % 60 + 60) % 60;
      await saveProfile({
        ...profile,
        reminderHour: hour,
        reminderMinute: minute,
      });
      if (reminderOn) {
        await refreshStudyReminder(hour, minute);
      }
    } catch (error) {
      logDebug('notifications', 'failed to update reminder time', error);
    } finally {
      setAdjustingReminder(false);
    }
  };

  const openBatteryOptimizationSettings = () => {
    notifee.openBatteryOptimizationSettings().catch(() => {});
  };

  const openPowerManagerSettings = () => {
    notifee.openPowerManagerSettings().catch(() => {});
  };

  const openAlarmPermissionSettings = () => {
    notifee.openAlarmPermissionSettings().catch(() => {});
  };

  return (
    <Screen title="Settings">
      <Card style={styles.card}>
        <SectionLabel>Profile</SectionLabel>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Level</Text>
          <Text style={styles.rowValue}>{profile.level}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Goal</Text>
          <Text style={styles.rowValue}>{GOAL_LABELS[profile.goal]}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Native language</Text>
          <Text style={styles.rowValue}>{profile.nativeLanguage ?? 'Not set'}</Text>
        </View>
        <SectionLabel>Focus areas</SectionLabel>
        <View style={styles.chipRow}>
          {FOCUS_AREAS.map(area => (
            <Chip
              key={area}
              label={FOCUS_AREA_LABELS[area]}
              selected={profile.focusAreas.includes(area)}
              onPress={() => toggleFocusArea(area)}
            />
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionLabel>Languages</SectionLabel>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Practicing</Text>
          <View style={styles.chipRowRight}>
            {LANGUAGE_CODES.map(code => (
              <Chip
                key={code}
                label={LANGUAGES[code].name}
                selected={(profile.targetLanguage ?? 'en') === code}
                onPress={() => setTargetLanguage(code)}
              />
            ))}
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Explanations in</Text>
          <View style={styles.chipRowRight}>
            {LANGUAGE_CODES.map(code => (
              <Chip
                key={code}
                label={LANGUAGES[code].name}
                selected={(
                  profile.explanationLanguage
                  ?? profile.targetLanguage
                  ?? 'en'
                ) === code}
                onPress={() => setExplanationLanguage(code)}
              />
            ))}
          </View>
        </View>
        <Text style={styles.muted}>
          Prompts and grading adapt to the practice language.
        </Text>
      </Card>

      <Card style={styles.card}>
        <SectionLabel>AI model</SectionLabel>
        <Text
          style={[
            styles.modelState,
            modelState === 'ready' && { color: colors.success },
            modelState === 'error' && { color: colors.danger },
          ]}>
          {MODEL_STATE_LABELS[modelState]}
        </Text>
        {modelState === 'ready' && modelInfo ? (
          <View style={styles.modelInfoWrap}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Model</Text>
              <Text style={styles.rowValue}>{modelInfo.label}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Size on disk</Text>
              <Text style={styles.rowValue}>
                {modelInfo.sizeBytes != null
                  ? formatBytes(modelInfo.sizeBytes)
                  : 'Unknown'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Checksum</Text>
              <Text style={styles.rowValue}>
                {modelInfo.sha256.slice(0, 12)}…
              </Text>
            </View>
          </View>
        ) : null}
        {(modelState === 'downloading' || modelState === 'paused') && (
          <View style={styles.progressColumn}>
            <ProgressBar progress={progress} />
            <Text style={styles.progressText}>
              {modelState === 'paused' ? 'Paused at ' : 'Downloading… '}
              {Math.round(progress * 100)}%
            </Text>
          </View>
        )}
        {modelState === 'error' && errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {deviceCapability ? (
          <Text style={styles.muted}>
            Free storage: {formatBytes(deviceCapability.freeSpaceBytes)}
            {deviceCapability.ramBytes != null
              ? ` · RAM: ${formatBytes(deviceCapability.ramBytes)}`
              : ''}
          </Text>
        ) : null}
        {modelState === 'not-downloaded' || modelState === 'error' ? (
          <>
            <Button
              title={`Download over Wi-Fi (${MODEL_VARIANTS[deviceCapability?.recommendation === 'small' ? 'small' : 'full'].shortLabel})`}
              onPress={() =>
                startDownload(
                  'wifi',
                  deviceCapability?.recommendation === 'small'
                    ? 'small'
                    : 'full',
                )
              }
              style={styles.action}
            />
            <Button
              title="Download over cellular"
              variant="secondary"
              onPress={() =>
                startDownload(
                  'all',
                  deviceCapability?.recommendation === 'small'
                    ? 'small'
                    : 'full',
                )
              }
              style={styles.action}
            />
          </>
        ) : null}
        {modelState === 'downloading' ? (
          pauseSupported ? (
            <View style={styles.buttonRow}>
              <Button
                title="Pause"
                variant="secondary"
                onPress={pauseDownload}
                style={styles.half}
              />
              <Button
                title="Cancel"
                variant="danger"
                onPress={cancelDownload}
                style={styles.half}
              />
            </View>
          ) : (
            <Button
              title="Cancel"
              variant="danger"
              onPress={cancelDownload}
              style={styles.action}
            />
          )
        ) : null}
        {modelState === 'paused' ? (
          <View style={styles.buttonRow}>
            <Button title="Resume" onPress={resumeDownload} style={styles.half} />
            <Button
              title="Cancel"
              variant="danger"
              onPress={cancelDownload}
              style={styles.half}
            />
          </View>
        ) : null}
        {modelState === 'ready' ? (
          <Button
            title="Delete model"
            variant="danger"
            onPress={confirmDeleteModel}
            style={styles.action}
          />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <SectionLabel>Practice reminders</SectionLabel>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Daily grammar question</Text>
            <Text style={styles.muted}>
              A question with 3 answer options at {DEFAULT_HOUR}:00.
            </Text>
          </View>
          <Switch
            value={profile.notificationsEnabled ?? false}
            onValueChange={toggleNotifications}
            disabled={togglingNotifications}
            trackColor={{ true: colors.primary }}
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Study reminder</Text>
            <Text style={styles.muted}>
              A nudge to open the app and take a practice — skipped
              automatically on days you already practiced.
            </Text>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={toggleReminder}
            disabled={togglingReminder}
            trackColor={{ true: colors.primary }}
          />
        </View>
        {reminderOn ? (
          <View style={styles.timeRow}>
            <Text style={styles.rowLabel}>Reminder time</Text>
            <View style={styles.timeControls}>
              <Button
                title="−"
                variant="secondary"
                onPress={() => adjustReminderTime(-1, 0)}
                disabled={adjustingReminder}
                style={styles.stepper}
              />
              <Text style={styles.timeText}>
                {formatReminderTime(reminderHour, reminderMinute)}
              </Text>
              <Button
                title="+"
                variant="secondary"
                onPress={() => adjustReminderTime(1, 0)}
                disabled={adjustingReminder}
                style={styles.stepper}
              />
              <Button
                title="−15m"
                variant="secondary"
                onPress={() => adjustReminderTime(0, -15)}
                disabled={adjustingReminder}
                style={styles.stepper}
              />
              <Button
                title="+15m"
                variant="secondary"
                onPress={() => adjustReminderTime(0, 15)}
                disabled={adjustingReminder}
                style={styles.stepper}
              />
            </View>
          </View>
        ) : null}
      </Card>

      {Platform.OS === 'android' ? (
        <Card style={styles.card}>
          <SectionLabel>Notification diagnostics</SectionLabel>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Battery optimization</Text>
            <Text
              style={[
                styles.rowValue,
                batteryOptimization && { color: colors.danger },
              ]}>
              {batteryOptimization == null
                ? 'Checking…'
                : batteryOptimization
                  ? 'Restricted'
                  : 'OK'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Power manager</Text>
            <Text style={styles.rowValue}>
              {powerManagerActivity ?? 'Normal'}
            </Text>
          </View>
          {batteryOptimization ? (
            <Button
              title="Allow unrestricted battery use"
              variant="secondary"
              onPress={openBatteryOptimizationSettings}
              style={styles.action}
            />
          ) : null}
          {powerManagerActivity ? (
            <Button
              title="Open power manager settings"
              variant="secondary"
              onPress={openPowerManagerSettings}
              style={styles.action}
            />
          ) : null}
          <Button
            title="Open alarm & reminder settings"
            variant="secondary"
            onPress={openAlarmPermissionSettings}
            style={styles.action}
          />
          <Text style={styles.muted}>
            If reminders arrive late or not at all, allow exact alarms and
            remove battery restrictions for FluentEdge.
          </Text>
        </Card>
      ) : null}

      <Card style={styles.card}>
        <SectionLabel>Debug</SectionLabel>
        <Button
          title={
            sendingTestNotification
              ? 'Sending…'
              : 'Send test question notification'
          }
          variant="secondary"
          onPress={handleSendTestNotification}
          disabled={sendingTestNotification}
          loading={sendingTestNotification}
        />
        {testNotificationStatus ? (
          <Text style={styles.debugStatus}>{testNotificationStatus}</Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <SectionLabel>Download diagnostics</SectionLabel>
        <ScrollView style={styles.debugLogBox} nestedScrollEnabled>
          <Text style={styles.debugLogText} selectable>
            {debugLogText || 'No log entries yet.'}
          </Text>
        </ScrollView>
        <View style={styles.buttonRow}>
          <Button
            title="Share logs"
            variant="secondary"
            onPress={handleShareLogs}
            style={styles.half}
          />
          <Button
            title="Clear"
            variant="secondary"
            onPress={handleClearLogs}
            style={styles.half}
          />
        </View>
      </Card>

      <Button
        title="Re-take diagnostic"
        variant="danger"
        onPress={retakeDiagnostic}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.textMuted,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  timeRow: {
    gap: spacing.xs,
  },
  timeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    minWidth: 48,
    textAlign: 'center',
  },
  stepper: {
    paddingHorizontal: spacing.sm,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modelState: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  modelInfoWrap: {
    gap: spacing.xs,
  },
  chipRowRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  progressColumn: {
    gap: spacing.xs,
  },
  progressText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  errorText: {
    fontSize: 13,
    color: colors.danger,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
  },
  action: {
    marginTop: spacing.xs,
  },
  half: {
    flex: 1,
  },
  debugLogBox: {
    maxHeight: 220,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    padding: spacing.sm,
    backgroundColor: colors.inverse,
  },
  debugLogText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  debugStatus: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
