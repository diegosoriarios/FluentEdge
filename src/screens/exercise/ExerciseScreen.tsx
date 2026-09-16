import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import {
  getSession,
  updateSessionEvaluation,
  updateSessionPrompt,
  updateSessionResponse,
} from '../../data';
import { getPromptForProfile } from '../../data/prompts';
import { useModel } from '../../context/ModelContext';
import type { EvaluationStage } from '../../ai/tutor';
import { useProfile } from '../../context/ProfileContext';
import { useRecentSessions, useWeakSpots } from '../../hooks/useSessionData';
import { nextLevel } from '../../ai/adaptive';
import { countWords } from '../../utils/format';
import type { RootStackParamList, SessionSummary } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

const MIN_WORDS = 10;
const AUTOSAVE_DEBOUNCE_MS = 1500;

export function ExerciseScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { evaluate, generatePrompt } = useModel();
  const { profile, saveProfile } = useProfile();
  const { sessions: recentSessions } = useRecentSessions();
  const { summary: weakSpotsSummary } = useWeakSpots();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [evalStage, setEvalStage] = useState<EvaluationStage | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastSavedRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    getSession(sessionId)
      .then(next => {
        if (!cancelled) {
          setSession(next);
          setText(next?.response ?? '');
          lastSavedRef.current = next?.response ?? '';
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const clearAutosaveTimer = () => {
    if (autosaveTimerRef.current != null) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  };

  const onChangeText = (value: string) => {
    setText(value);
    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      if (!session || value === lastSavedRef.current) {
        return;
      }
      lastSavedRef.current = value;
      updateSessionResponse(session.id, value).catch(error => {
        console.warn('Autosave failed', error);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current != null && session && text !== lastSavedRef.current) {
        updateSessionResponse(session.id, text).catch(() => {});
      }
      clearAutosaveTimer();
    };
  }, [session, text]);

  const wordCount = countWords(text);
  const canSubmit = wordCount >= MIN_WORDS && !evaluating && session != null;

  const submit = async () => {
    if (!session || !canSubmit) {
      return;
    }
    Keyboard.dismiss();
    clearAutosaveTimer();
    lastSavedRef.current = text;
    setEvaluating(true);
    setSubmitError(null);
    setEvalStage('loading-model');
    setElapsedSec(0);
    setTokenCount(0);
    tickTimerRef.current = setInterval(() => {
      setElapsedSec(prev => prev + 1);
    }, 1000);
    try {
      await updateSessionResponse(session.id, text);
      if (!profile) {
        throw new Error('User profile is missing.');
      }
      const evaluation = await evaluate(
        profile,
        session.prompt,
        text,
        weakSpotsSummary,
        {
          onStage: stage => setEvalStage(stage),
          onPartial: count => setTokenCount(count),
        },
      );
      await updateSessionEvaluation(session.id, evaluation);
      const sessionsWithCurrent = [
        { ...session, response: text, evaluation },
        ...recentSessions.filter(item => item.id !== session.id),
      ];
      const adjustment = nextLevel(
        profile.level,
        sessionsWithCurrent,
        profile.lastLevelAdjustAt ?? null,
      );
      if (adjustment.changed) {
        await saveProfile({
          ...profile,
          level: adjustment.level,
          lastLevelAdjustAt: Date.now(),
        });
      }
      navigation.replace('Feedback', { sessionId: session.id });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Evaluation failed. Try again.',
      );
    } finally {
      if (tickTimerRef.current != null) {
        clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      setEvalStage(null);
      setEvaluating(false);
    }
  };

  const regeneratePrompt = () => {
    if (wordCount > 0) {
      Alert.alert(
        'Start a new prompt?',
        'Your current draft will be replaced.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'New prompt', style: 'destructive', onPress: runRegenerate },
        ],
      );
      return;
    }
    runRegenerate();
  };

  const runRegenerate = async () => {
    if (!session || !profile || regenerating) {
      return;
    }
    setRegenerating(true);
    try {
      let nextPrompt: string;
      try {
        nextPrompt = await generatePrompt(profile, weakSpotsSummary);
        if (nextPrompt === session.prompt) {
          nextPrompt = getPromptForProfile(profile);
        }
      } catch {
        nextPrompt = getPromptForProfile(profile);
      }
      await updateSessionPrompt(session.id, nextPrompt);
      await updateSessionResponse(session.id, '');
      lastSavedRef.current = '';
      clearAutosaveTimer();
      setText('');
      setSession({ ...session, prompt: nextPrompt });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Could not generate a new prompt.',
      );
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <Screen title="Exercise" />;
  }

  if (!session) {
    return (
      <Screen title="Exercise" subtitle="Session not found">
        <Button title="Back home" onPress={() => navigation.popToTop()} />
      </Screen>
    );
  }

  return (
    <Screen title="Exercise" scroll={false} avoidKeyboard>
      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>Writing prompt</Text>
        <Text style={styles.promptText}>{session.prompt}</Text>
        <Button
          title={regenerating ? 'New prompt…' : 'New prompt'}
          variant="secondary"
          onPress={regeneratePrompt}
          disabled={evaluating || regenerating}
          loading={regenerating}
          style={styles.regenerateButton}
        />
      </Card>
      <TextInput
        value={text}
        onChangeText={onChangeText}
        placeholder="Write your response here…"
        placeholderTextColor={colors.textMuted}
        multiline
        textAlignVertical="top"
        style={styles.input}
        editable={!evaluating}
      />
      <View style={styles.footer}>
        <Text style={wordCount >= MIN_WORDS ? styles.countOk : styles.countLow}>
          {wordCount} words (minimum {MIN_WORDS})
        </Text>
        {submitError ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>{submitError}</Text>
            <Button
              title="Retry"
              variant="secondary"
              onPress={submit}
              disabled={!canSubmit}
            />
          </View>
        ) : null}
        {evaluating && evalStage ? (
          <Text style={styles.stageText}>
            {evalStage === 'loading-model'
              ? `Loading model… ${elapsedSec}s`
              : `Grading your writing… ${elapsedSec}s${
                  tokenCount > 0 ? ` · ${tokenCount} tokens` : ''
                }`}
          </Text>
        ) : null}
        <Button
          title={evaluating ? 'Evaluating…' : 'Submit for feedback'}
          onPress={submit}
          disabled={!canSubmit}
          loading={evaluating}
          style={styles.submit}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  footer: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  countOk: {
    fontSize: 13,
    color: colors.textMuted,
  },
  countLow: {
    fontSize: 13,
    color: colors.danger,
  },
  errorWrap: {
    gap: spacing.sm,
  },
  stageText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  regenerateButton: {
    marginTop: spacing.xs,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
  },
  submit: {
    marginBottom: spacing.sm,
  },
});
