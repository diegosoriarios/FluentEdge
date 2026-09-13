import { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
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
} from '../../services/debugLog';
import { formatBytes } from '../../utils/format';
import {
  DEFAULT_HOUR,
  disableDailyNotifications,
  enableDailyNotifications,
} from '../../notifications/dailyQuestion';
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
  const { profile, saveProfile, resetProfile } = useProfile();
  const {
    modelState,
    progress,
    errorMessage,
    activeVariant,
    deviceCapability,
    startDownload,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteModel,
  } = useModel();
  const { reset: resetDraft } = useOnboarding();
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [debugLogText, setDebugLogText] = useState('');

  useEffect(() => {
    const refresh = () => setDebugLogText(getDebugLogText());
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
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

  const retakeDiagnostic = async () => {
    resetDraft();
    await resetProfile();
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

  const toggleNotifications = async (enabled: boolean) => {
    setTogglingNotifications(true);
    try {
      if (enabled) {
        const granted = await enableDailyNotifications();
        await saveProfile({ ...profile, notificationsEnabled: granted });
      } else {
        await disableDailyNotifications();
        await saveProfile({ ...profile, notificationsEnabled: false });
      }
    } catch (error) {
      console.warn('Failed to toggle notifications', error);
    } finally {
      setTogglingNotifications(false);
    }
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.sm,
  },
  debugLogText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
});
