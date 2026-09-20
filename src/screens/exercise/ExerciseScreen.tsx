import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Button, Card } from '../../components/ui';
import { AnswerChoices } from '../../components/AnswerChoices';
import { colors, fonts, radius, spacing } from '../../theme';
import {
  getSession,
  setChosenIndex,
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

const MIN_WORDS_PARAGRAPH = 10;
const MIN_WORDS_SHORT = 3;
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
  const [inputFocused, setInputFocused] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
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
          if (
            next?.type === 'multiple_choice' &&
            next.exercise &&
            next.chosenIndex != null
          ) {
            setSelected(next.chosenIndex);
            setChecked(true);
          }
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
  const isMcq = session?.type === 'multiple_choice' && session.exercise != null;
  const minWords = session?.type === 'short_answer' ? MIN_WORDS_SHORT : MIN_WORDS_PARAGRAPH;
  const canSubmit = wordCount >= minWords && !evaluating && session != null;

  const checkAnswer = () => {
    if (!session?.exercise || selected == null || checked) {
      return;
    }
    setChecked(true);
    setChosenIndex(session.id, selected).catch(error => {
      console.warn('Failed to save answer', error);
    });
  };

  const submit = async () => {
    if (!session || !canSubmit || isMcq) {
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
        session.type,
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

  if (isMcq && session.exercise) {
    const exercise = session.exercise;
    const correct = selected === exercise.answerIndex;
    return (
      <Screen title="Exercise" subtitle="Multiple choice">
        <Card style={styles.promptCard}>
          <Text style={styles.promptLabel}>Choose the correct answer</Text>
          <Text style={styles.promptText}>{exercise.question}</Text>
        </Card>
        <AnswerChoices
          options={exercise.options}
          answerIndex={exercise.answerIndex}
          selected={selected}
          checked={checked}
          onSelect={setSelected}
        />
        {checked ? (
          <View style={styles.mcqFooter}>
            <Text style={correct ? styles.verdictOk : styles.verdictBad}>
              {correct ? 'Correct!' : 'Not quite.'}
            </Text>
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>{exercise.explanation}</Text>
            </View>
            <Button
              title="See feedback"
              onPress={() =>
                navigation.replace('Feedback', { sessionId: session.id })
              }
            />
          </View>
        ) : (
          <Button
            title="Check answer"
            onPress={checkAnswer}
            disabled={selected == null}
            style={styles.submit}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Exercise" scroll={false} avoidKeyboard>
      <Card style={styles.promptCard}>
        <Text style={styles.promptLabel}>
          {session.type === 'short_answer' ? 'Question' : 'Writing prompt'}
        </Text>
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
        placeholder={
          session.type === 'short_answer'
            ? 'Answer in 1-3 sentences…'
            : 'Write your response here…'
        }
        placeholderTextColor={colors.subdued}
        multiline
        textAlignVertical="top"
        style={[
          styles.input,
          inputFocused && styles.inputFocused,
        ]}
        editable={!evaluating}
        onFocus={() => setInputFocused(true)}
        onBlur={() => setInputFocused(false)}
      />
      <View style={styles.footer}>
        <Text style={wordCount >= minWords ? styles.countOk : styles.countLow}>
          {wordCount} words (minimum {minWords})
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
    backgroundColor: colors.inverse,
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  inputFocused: {
    borderColor: colors.primary,
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
  mcqFooter: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  verdictOk: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.success,
    fontFamily: fonts.bold,
  },
  verdictBad: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.danger,
    fontFamily: fonts.bold,
  },
  tipBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.sm,
    padding: spacing.sm + 2,
  },
  tipText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
  },
  submit: {
    marginBottom: spacing.sm,
  },
});
