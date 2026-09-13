import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card, ProgressBar } from '../../components/ui';
import { colors, spacing } from '../../theme';
import { MODEL_VARIANTS } from '../../ai/modelConfig';
import type { ModelVariant } from '../../ai/modelConfig';
import { useModel } from '../../context/ModelContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { useProfile } from '../../context/ProfileContext';
import { formatBytes } from '../../utils/format';
import type { OnboardingStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'ModelDownload'>;

export function ModelDownloadScreen(_props: Props) {
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
  } = useModel();
  const { draft } = useOnboarding();
  const { completeOnboarding } = useProfile();
  const [finishing, setFinishing] = useState(false);

  const finish = async () => {
    setFinishing(true);
    try {
      await completeOnboarding(draft);
    } finally {
      setFinishing(false);
    }
  };

  const blocked = deviceCapability?.recommendation === 'block';
  const recommendSmall = deviceCapability?.recommendation === 'small';
  const freeSpaceLabel = deviceCapability
    ? formatBytes(deviceCapability.freeSpaceBytes)
    : null;
  const ramLabel =
    deviceCapability?.ramBytes != null
      ? formatBytes(deviceCapability.ramBytes)
      : null;

  const renderVariantButtons = (variant: ModelVariant) => {
    const config = MODEL_VARIANTS[variant];
    return (
      <View key={variant} style={styles.variantBlock}>
        <Text
          style={[
            styles.variantTitle,
            recommendSmall && variant === 'small' && styles.variantRecommended,
          ]}>
          {config.shortLabel}
          {recommendSmall && variant === 'small'
            ? ' — recommended for this device'
            : ''}
        </Text>
        <Button
          title={`Download over Wi-Fi (${formatBytes(config.bytes)})`}
          disabled={blocked}
          onPress={() => startDownload('wifi', variant)}
        />
        <Button
          title="Use cellular data"
          variant="secondary"
          disabled={blocked}
          onPress={() => startDownload('all', variant)}
          style={styles.cellularButton}
        />
      </View>
    );
  };

  return (
    <Screen title="Download the AI model" subtitle="One-time setup">
      <Card style={styles.card}>
        <Text style={styles.body}>
          FluentEdge runs a local language model entirely on your device.
          Download it to enable exercises — your writing never leaves the
          phone.
        </Text>
        {modelState === 'downloading' || modelState === 'paused' ? (
          <View style={styles.progressColumn}>
            <ProgressBar progress={progress} />
            <Text style={styles.progressText}>
              {modelState === 'paused' ? 'Paused at ' : 'Downloading… '}
              {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : null}
        {modelState === 'verifying' ? (
          <View style={styles.progressWrap}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.progressText}>Verifying download…</Text>
          </View>
        ) : null}
        {modelState === 'ready' ? (
          <Text style={styles.success}>
            {MODEL_VARIANTS[activeVariant].shortLabel} model ready.
          </Text>
        ) : null}
        {modelState === 'error' && errorMessage ? (
          <Text style={styles.error}>{errorMessage}</Text>
        ) : null}
      </Card>

      {modelState === 'not-downloaded' || modelState === 'error' ? (
        <>
          {deviceCapability ? (
            <Card
              style={[
                styles.capabilityCard,
                blocked && styles.capabilityBlocked,
                recommendSmall && styles.capabilityWarn,
              ]}>
              <Text
                style={[
                  styles.capabilityTitle,
                  blocked && styles.error,
                  recommendSmall && styles.warn,
                ]}>
                {blocked
                  ? 'Device below minimum requirements'
                  : recommendSmall
                    ? 'Consider the smaller model'
                    : 'Device check passed'}
              </Text>
              <Text style={styles.capabilityText}>
                RAM: {ramLabel ?? 'unable to verify'}
                {freeSpaceLabel ? ` · Free storage: ${freeSpaceLabel}` : ''}
              </Text>
              {blocked ? (
                <Text style={styles.capabilityText}>
                  This device does not meet the minimum specs for on-device
                  inference. You can still explore the app, but exercises need
                  a supported device.
                </Text>
              ) : null}
              {recommendSmall ? (
                <Text style={styles.capabilityText}>
                  With about {ramLabel ?? '3 GB'} of RAM, the smaller model
                  avoids memory issues at a small quality cost.
                </Text>
              ) : null}
            </Card>
          ) : null}
          {!blocked ? renderVariantButtons('full') : null}
          {!blocked && (recommendSmall || modelState === 'error') && deviceCapability?.variants.small
            ? renderVariantButtons('small')
            : null}
          {!blocked && !recommendSmall && modelState !== 'error' ? (
            <Text style={styles.cellularWarning}>
              Cellular downloads use a large amount of mobile data.
            </Text>
          ) : null}
        </>
      ) : null}

      {modelState === 'downloading' ? (
        <View style={styles.row}>
          <Button title="Pause" variant="secondary" onPress={pauseDownload} style={styles.half} />
          <Button title="Cancel" variant="danger" onPress={cancelDownload} style={styles.half} />
        </View>
      ) : null}
      {modelState === 'paused' ? (
        <View style={styles.row}>
          <Button title="Resume" onPress={resumeDownload} style={styles.half} />
          <Button title="Cancel" variant="danger" onPress={cancelDownload} style={styles.half} />
        </View>
      ) : null}
      {modelState === 'downloading' ||
      modelState === 'paused' ||
      modelState === 'verifying' ? (
        <Button
          title="Skip for now"
          variant="secondary"
          onPress={finish}
          loading={finishing}
          style={styles.skip}
        />
      ) : null}
      {modelState === 'ready' ? (
        <Button title="Start practicing" onPress={finish} loading={finishing} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  progressColumn: {
    gap: spacing.sm,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  success: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.success,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.danger,
  },
  warn: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  capabilityCard: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  capabilityBlocked: {
    borderColor: colors.danger,
  },
  capabilityWarn: {
    borderColor: colors.primary,
  },
  capabilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  capabilityText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  variantBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  variantRecommended: {
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  cellularButton: {
    marginTop: spacing.xs,
  },
  cellularWarning: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
