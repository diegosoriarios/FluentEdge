import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import {
  AppText,
  Button,
  Card,
  ProgressBar,
  Row,
} from '../../components/ui';
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
    pauseSupported,
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
        <AppText
          variant="bodySmall"
          tone={recommendSmall && variant === 'small' ? 'primary' : 'muted'}
          style={styles.variantTitle}>
          {config.shortLabel}
          {recommendSmall && variant === 'small'
            ? ' — recommended for this device'
            : ''}
        </AppText>
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
      <Card gap={spacing.md} style={styles.card}>
        <AppText variant="body">
          FluentEdge runs a local language model entirely on your device.
          Download it to enable exercises — your writing never leaves the
          phone.
        </AppText>
        {modelState === 'downloading' || modelState === 'paused' ? (
          <View style={styles.progressColumn}>
            <ProgressBar progress={progress} />
            <AppText variant="bodySmall" tone="muted">
              {modelState === 'paused' ? 'Paused at ' : 'Downloading… '}
              {Math.round(progress * 100)}%
            </AppText>
          </View>
        ) : null}
        {modelState === 'verifying' ? (
          <Row align="center" gap={spacing.sm}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">
              Verifying download…
            </AppText>
          </Row>
        ) : null}
        {modelState === 'ready' ? (
          <AppText variant="body" tone="success" style={styles.accent}>
            {MODEL_VARIANTS[activeVariant].shortLabel} model ready.
          </AppText>
        ) : null}
        {modelState === 'error' && errorMessage ? (
          <AppText variant="body" tone="danger" style={styles.accent}>
            {errorMessage}
          </AppText>
        ) : null}
      </Card>

      {modelState === 'not-downloaded' || modelState === 'error' ? (
        <>
          {deviceCapability ? (
            <Card
              gap={spacing.xs}
              tone={blocked ? 'danger' : recommendSmall ? 'primary' : 'default'}
              style={styles.capabilityCard}>
              <AppText
                variant="body"
                style={styles.accent}
                tone={
                  blocked ? 'danger' : recommendSmall ? 'primary' : 'text'
                }>
                {blocked
                  ? 'Device below minimum requirements'
                  : recommendSmall
                    ? 'Consider the smaller model'
                    : 'Device check passed'}
              </AppText>
              <AppText variant="caption">
                RAM: {ramLabel ?? 'unable to verify'}
                {freeSpaceLabel ? ` · Free storage: ${freeSpaceLabel}` : ''}
              </AppText>
              {blocked ? (
                <AppText variant="caption">
                  This device does not meet the minimum specs for on-device
                  inference. You can still explore the app, but exercises need
                  a supported device.
                </AppText>
              ) : null}
              {recommendSmall ? (
                <AppText variant="caption">
                  With about {ramLabel ?? '3 GB'} of RAM, the smaller model
                  avoids memory issues at a small quality cost.
                </AppText>
              ) : null}
            </Card>
          ) : null}
          {!blocked ? renderVariantButtons('full') : null}
          {!blocked && (recommendSmall || modelState === 'error') && deviceCapability?.variants.small
            ? renderVariantButtons('small')
            : null}
          {!blocked && !recommendSmall && modelState !== 'error' ? (
            <AppText variant="caption" style={styles.cellularWarning}>
              Cellular downloads use a large amount of mobile data.
            </AppText>
          ) : null}
        </>
      ) : null}

      {modelState === 'downloading' ? (
        pauseSupported ? (
          <Row gap={spacing.sm}>
            <Button title="Pause" variant="secondary" onPress={pauseDownload} style={styles.half} />
            <Button title="Cancel" variant="danger" onPress={cancelDownload} style={styles.half} />
          </Row>
        ) : (
          <Button title="Cancel" variant="danger" onPress={cancelDownload} />
        )
      ) : null}
      {modelState === 'paused' ? (
        <Row gap={spacing.sm}>
          <Button title="Resume" onPress={resumeDownload} style={styles.half} />
          <Button title="Cancel" variant="danger" onPress={cancelDownload} style={styles.half} />
        </Row>
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
  },
  progressColumn: {
    gap: spacing.sm,
  },
  accent: {
    fontWeight: '600',
  },
  capabilityCard: {
    marginBottom: spacing.md,
  },
  variantBlock: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  variantTitle: {
    fontWeight: '600',
  },
  half: {
    flex: 1,
  },
  cellularButton: {
    marginTop: spacing.xs,
  },
  cellularWarning: {
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  skip: {
    marginTop: spacing.sm,
  },
});
