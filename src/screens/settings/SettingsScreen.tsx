import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import notifee from '@notifee/react-native';
import { Screen } from '../../components/Screen';
import { AppText, Button, Card, Chip, ProgressBar, Row, SectionLabel } from '../../components/ui';
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
  const [devPanelsVisible, setDevPanelsVisible] = useState(false);
  const [batteryOptimization, setBatteryOptimization] = useState<
    boolean | null
  >(null);
  const [powerManagerActivity, setPowerManagerActivity] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!devPanelsVisible) {
      setDebugLogText('');
      return undefined;
    }
    const refresh = () => setDebugLogText(getDebugLogText());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [devPanelsVisible]);

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
        const granted = await enableDailyNotifications(profile);
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
          notificationsOn = await enableDailyNotifications(profile);
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
    <Screen
      title="Settings"
      onTitleLongPress={() => setDevPanelsVisible(visible => !visible)}>
      <Card gap={spacing.sm} style={styles.card}>
        <SectionLabel>Profile</SectionLabel>
        <Row justify="space-between">
          <AppText variant="body" tone="muted">
            Level
          </AppText>
          <AppText variant="body" style={styles.rowValue}>
            {profile.level}
          </AppText>
        </Row>
        <Row justify="space-between">
          <AppText variant="body" tone="muted">
            Goal
          </AppText>
          <AppText variant="body" style={styles.rowValue}>
            {GOAL_LABELS[profile.goal]}
          </AppText>
        </Row>
        <Row justify="space-between">
          <AppText variant="body" tone="muted">
            Native language
          </AppText>
          <AppText variant="body" style={styles.rowValue}>
            {profile.nativeLanguage ?? 'Not set'}
          </AppText>
        </Row>
        <SectionLabel>Focus areas</SectionLabel>
        <Row wrap>
          {FOCUS_AREAS.map(area => (
            <Chip
              key={area}
              label={FOCUS_AREA_LABELS[area]}
              selected={profile.focusAreas.includes(area)}
              onPress={() => toggleFocusArea(area)}
            />
          ))}
        </Row>
      </Card>

      <Card gap={spacing.sm} style={styles.card}>
        <SectionLabel>Languages</SectionLabel>
        <Row justify="space-between">
          <AppText variant="body" tone="muted">
            Practicing
          </AppText>
          <Row wrap justify="flex-end">
            {LANGUAGE_CODES.map(code => (
              <Chip
                key={code}
                label={LANGUAGES[code].name}
                selected={(profile.targetLanguage ?? 'en') === code}
                onPress={() => setTargetLanguage(code)}
              />
            ))}
          </Row>
        </Row>
        <Row justify="space-between">
          <AppText variant="body" tone="muted">
            Explanations in
          </AppText>
          <Row wrap justify="flex-end">
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
          </Row>
        </Row>
        <AppText variant="bodySmall" tone="muted">
          Prompts and grading adapt to the practice language.
        </AppText>
      </Card>

      <Card gap={spacing.sm} style={styles.card}>
        <SectionLabel>AI model</SectionLabel>
        <AppText
          variant="body"
          tone={
            modelState === 'ready'
              ? 'success'
              : modelState === 'error'
                ? 'danger'
                : 'text'
          }
          style={styles.rowValue}>
          {MODEL_STATE_LABELS[modelState]}
        </AppText>
        {modelState === 'ready' && modelInfo ? (
          <View style={styles.modelInfoWrap}>
            <Row justify="space-between">
              <AppText variant="body" tone="muted">
                Model
              </AppText>
              <AppText variant="body" style={styles.rowValue}>
                {modelInfo.label}
              </AppText>
            </Row>
            <Row justify="space-between">
              <AppText variant="body" tone="muted">
                Size on disk
              </AppText>
              <AppText variant="body" style={styles.rowValue}>
                {modelInfo.sizeBytes != null
                  ? formatBytes(modelInfo.sizeBytes)
                  : 'Unknown'}
              </AppText>
            </Row>
            <Row justify="space-between">
              <AppText variant="body" tone="muted">
                Checksum
              </AppText>
              <AppText variant="body" style={styles.rowValue}>
                {modelInfo.sha256.slice(0, 12)}…
              </AppText>
            </Row>
          </View>
        ) : null}
        {(modelState === 'downloading' || modelState === 'paused') && (
          <View style={styles.progressColumn}>
            <ProgressBar progress={progress} />
            <AppText variant="caption">
              {modelState === 'paused' ? 'Paused at ' : 'Downloading… '}
              {Math.round(progress * 100)}%
            </AppText>
          </View>
        )}
        {modelState === 'error' && errorMessage ? (
          <AppText variant="caption" tone="danger">
            {errorMessage}
          </AppText>
        ) : null}
        {deviceCapability ? (
          <AppText variant="bodySmall" tone="muted">
            Free storage: {formatBytes(deviceCapability.freeSpaceBytes)}
            {deviceCapability.ramBytes != null
              ? ` · RAM: ${formatBytes(deviceCapability.ramBytes)}`
              : ''}
          </AppText>
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
            <Row>
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
            </Row>
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
          <Row>
            <Button title="Resume" onPress={resumeDownload} style={styles.half} />
            <Button
              title="Cancel"
              variant="danger"
              onPress={cancelDownload}
              style={styles.half}
            />
          </Row>
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

      <Card gap={spacing.sm} style={styles.card}>
        <SectionLabel>Practice reminders</SectionLabel>
        <Row align="center" gap={spacing.sm}>
          <View style={styles.toggleText}>
            <AppText variant="body" style={styles.rowValue}>
              Daily grammar question
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              A question with 3 answer options at {DEFAULT_HOUR}:00.
            </AppText>
          </View>
          <Switch
            value={profile.notificationsEnabled ?? false}
            onValueChange={toggleNotifications}
            disabled={togglingNotifications}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        <Row align="center" gap={spacing.sm}>
          <View style={styles.toggleText}>
            <AppText variant="body" style={styles.rowValue}>
              Study reminder
            </AppText>
            <AppText variant="bodySmall" tone="muted">
              A nudge to open the app and take a practice — skipped
              automatically on days you already practiced.
            </AppText>
          </View>
          <Switch
            value={reminderOn}
            onValueChange={toggleReminder}
            disabled={togglingReminder}
            trackColor={{ true: colors.primary }}
          />
        </Row>
        {reminderOn ? (
          <View style={styles.timeRow}>
            <AppText variant="body" tone="muted">
              Reminder time
            </AppText>
            <Row align="center" gap={spacing.xs}>
              <Button
                title="−"
                variant="secondary"
                onPress={() => adjustReminderTime(-1, 0)}
                disabled={adjustingReminder}
                style={styles.stepper}
              />
              <AppText variant="body" style={styles.timeText}>
                {formatReminderTime(reminderHour, reminderMinute)}
              </AppText>
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
            </Row>
          </View>
        ) : null}
      </Card>

      {Platform.OS === 'android' ? (
        <Card gap={spacing.sm} style={styles.card}>
          <SectionLabel>Notification diagnostics</SectionLabel>
          <Row justify="space-between">
            <AppText variant="body" tone="muted">
              Battery optimization
            </AppText>
            <AppText
              variant="body"
              tone={batteryOptimization ? 'danger' : 'text'}
              style={styles.rowValue}>
              {batteryOptimization == null
                ? 'Checking…'
                : batteryOptimization
                  ? 'Restricted'
                  : 'OK'}
            </AppText>
          </Row>
          <Row justify="space-between">
            <AppText variant="body" tone="muted">
              Power manager
            </AppText>
            <AppText variant="body" style={styles.rowValue}>
              {powerManagerActivity ?? 'Normal'}
            </AppText>
          </Row>
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
          <AppText variant="bodySmall" tone="muted">
            If reminders arrive late or not at all, allow exact alarms and
            remove battery restrictions for FluentEdge.
          </AppText>
        </Card>
      ) : null}

      {devPanelsVisible ? (
        <>
          <Card gap={spacing.sm} style={styles.card}>
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
              <AppText variant="caption">{testNotificationStatus}</AppText>
            ) : null}
          </Card>

          <Card gap={spacing.sm} style={styles.card}>
            <SectionLabel>Download diagnostics</SectionLabel>
            <ScrollView style={styles.debugLogBox} nestedScrollEnabled>
              <AppText variant="mono" selectable>
                {debugLogText || 'No log entries yet.'}
              </AppText>
            </ScrollView>
            <Row>
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
            </Row>
          </Card>

          <Button
            title="Re-take diagnostic"
            variant="danger"
            onPress={retakeDiagnostic}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  rowValue: {
    fontWeight: '600',
  },
  toggleText: {
    flex: 1,
    gap: 2,
  },
  timeRow: {
    gap: spacing.xs,
  },
  timeText: {
    minWidth: 48,
    textAlign: 'center',
  },
  stepper: {
    paddingHorizontal: spacing.sm,
  },
  modelInfoWrap: {
    gap: spacing.xs,
  },
  progressColumn: {
    gap: spacing.xs,
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
});
