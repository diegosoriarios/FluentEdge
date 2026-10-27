import { useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import {
  AnswerChoices,
  AppText,
  Button,
  Card,
  Input,
  TipBox,
} from '../../components/ui';
import { spacing } from '../../theme';
import {
  getSession,
  getRecentErrorTypeLists,
  listDueMistakes,
  recordReviewOutcome,
  setChosenIndex,
  updateSessionEvaluation,
  updateSessionPrompt,
  updateSessionResponse,
  upsertFromCorrections,
} from '../../data';
import { getPromptForProfile } from '../../data/prompts';
import { useModel } from '../../context/ModelContext';
import type { EvaluationStage } from '../../ai/tutor';
import { summarizeWeakSpotsFromLists } from '../../ai/adaptive';
import { prefetchNextExercise } from '../../services/exerciseCache';
import { prefetchReviewQuestion } from '../../services/reviewCache';
import { useProfile } from '../../context/ProfileContext';
import { useRecentSessions, useWeakSpots } from '../../hooks/useSessionData';
import { nextLevel } from '../../ai/adaptive';
import { countWords } from '../../utils/format';
import type {
  Profile,
  RootStackParamList,
  SessionSummary,
} from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

const MIN_WORDS_PARAGRAPH = 10;
const MIN_WORDS_SHORT = 3;
const AUTOSAVE_DEBOUNCE_MS = 1500;

export function ExerciseScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const { evaluate, generatePrompt, generateMicroLesson } = useModel();
  const { profile, saveProfile } = useProfile();
  const { sessions: recentSessions } = useRecentSessions();
  const { summary: weakSpotsSummary, topErrorTypes } = useWeakSpots();
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [evalStage, setEvalStage] = useState<EvaluationStage | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [regenerating, setRegenerating] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [focusTip, setFocusTip] = useState<string | null>(null);
  const [tipDismissed, setTipDismissed] = useState(false);
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

  useEffect(() => {
    let cancelled = false;
    setFocusTip(null);
    setTipDismissed(false);
    const topErrorType = topErrorTypes[0]?.type;
    if (!session || session.type === 'multiple_choice' || !profile || !topErrorType) {
      return undefined;
    }
    generateMicroLesson(topErrorType, profile)
      .then(lesson => {
        if (!cancelled) {
          setFocusTip(lesson);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [session, topErrorTypes, profile, generateMicroLesson]);

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
    if (session.mistakeId) {
      recordReviewOutcome(
        session.mistakeId,
        selected === session.exercise.answerIndex,
      )
        .then(() => {
          if (!profile) {
            return undefined;
          }
          return listDueMistakes(1).then(([next]) => {
            if (next) {
              return prefetchReviewQuestion(
                {
                  id: next.id,
                  errorType: next.errorType,
                  originalPhrase: next.originalPhrase,
                  correctedPhrase: next.correctedPhrase,
                  explanation: next.explanation,
                },
                profile,
              );
            }
            return undefined;
          });
        })
        .catch(error => {
          console.warn('Failed to record review outcome', error);
        });
    }
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
      upsertFromCorrections(evaluation.corrections).catch(error => {
        console.warn('Failed to update mistake journal', error);
      });
      const sessionsWithCurrent = [
        { ...session, response: text, evaluation },
        ...recentSessions.filter(item => item.id !== session.id),
      ];
      const adjustment = nextLevel(
        profile.level,
        sessionsWithCurrent,
        profile.lastLevelAdjustAt ?? null,
      );
      const effectiveProfile: Profile = adjustment.changed
        ? { ...profile, level: adjustment.level, lastLevelAdjustAt: Date.now() }
        : profile;
      if (adjustment.changed) {
        await saveProfile(effectiveProfile);
      }
      const freshSummary = await getRecentErrorTypeLists(20)
        .then(lists => summarizeWeakSpotsFromLists(lists))
        .catch(() => weakSpotsSummary);
      prefetchNextExercise(effectiveProfile, freshSummary).catch(() => {});
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
        <Card gap={spacing.xs} style={styles.promptCard}>
          <AppText variant="label">Choose the correct answer</AppText>
          <AppText style={styles.promptText}>{exercise.question}</AppText>
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
            <AppText variant="verdict" tone={correct ? 'success' : 'danger'}>
              {correct ? 'Correct!' : 'Not quite.'}
            </AppText>
            <TipBox>{exercise.explanation}</TipBox>
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
      {focusTip && !tipDismissed ? (
        <Card tone="primary" gap={spacing.xs} style={styles.focusTipCard}>
          <View style={styles.focusTipHeader}>
            <AppText variant="label" tone="primary">
              Focus tip
            </AppText>
            <Pressable onPress={() => setTipDismissed(true)} hitSlop={8}>
              <AppText variant="bodySmall" tone="muted">
                ✕
              </AppText>
            </Pressable>
          </View>
          <AppText variant="bodySmall">{focusTip}</AppText>
        </Card>
      ) : null}
      <ScrollView
        style={styles.promptScroll}
        keyboardShouldPersistTaps="handled">
        <Card gap={spacing.xs} style={styles.promptCard}>
          <AppText variant="label">
            {session.type === 'short_answer' ? 'Question' : 'Writing prompt'}
          </AppText>
          <AppText style={styles.promptText}>{session.prompt}</AppText>
          <Button
            title={regenerating ? 'New prompt…' : 'New prompt'}
            variant="secondary"
            onPress={regeneratePrompt}
            disabled={evaluating || regenerating}
            loading={regenerating}
            style={styles.regenerateButton}
          />
        </Card>
      </ScrollView>
      <Input
        value={text}
        onChangeText={onChangeText}
        placeholder={
          session.type === 'short_answer'
            ? 'Answer in 1-3 sentences…'
            : 'Write your response here…'
        }
        multiline
        textAlignVertical="top"
        style={styles.input}
        editable={!evaluating}
      />
      <View style={styles.footer}>
        <AppText
          variant="caption"
          tone={wordCount >= minWords ? 'text' : 'danger'}>
          {wordCount} words (minimum {minWords})
        </AppText>
        {submitError ? (
          <View style={styles.errorWrap}>
            <AppText variant="bodySmall" tone="danger">
              {submitError}
            </AppText>
            <Button
              title="Retry"
              variant="secondary"
              onPress={submit}
              disabled={!canSubmit}
            />
          </View>
        ) : null}
        {evaluating && evalStage ? (
          <AppText variant="caption">
            {evalStage === 'loading-model'
              ? `Loading model… ${elapsedSec}s`
              : `Grading your writing… ${elapsedSec}s${
                  tokenCount > 0 ? ` · ${tokenCount} tokens` : ''
                }`}
          </AppText>
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
  focusTipCard: {
    marginBottom: spacing.md,
  },
  focusTipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptScroll: {
    maxHeight: '35%',
  },
  promptCard: {
    marginBottom: spacing.md,
  },
  promptText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
  },
  footer: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  errorWrap: {
    gap: spacing.sm,
  },
  regenerateButton: {
    marginTop: spacing.xs,
  },
  mcqFooter: {
    marginTop: spacing.md,
    gap: spacing.md,
  },
  submit: {
    marginBottom: spacing.sm,
  },
});
