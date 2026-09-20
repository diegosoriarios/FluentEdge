import { initLlama } from 'llama.rn';
import type { LlamaContext } from 'llama.rn';
import {
  N_CTX,
  N_PREDICT,
  N_THREADS,
  TEMPERATURE,
} from './modelConfig';
import type { ModelVariant } from './modelConfig';
import { languageConfig } from './languages';
import { getVerifiedModelPath } from '../services/modelManager';
import { logDebug } from '../services/debugLog';
import type {
  Correction,
  Evaluation,
  ExerciseType,
  MultipleChoiceExercise,
  Profile,
} from '../navigation/types';

export class ModelInitError extends Error {}

export class EvaluationError extends Error {}

export class PromptGenerationError extends Error {}

const PROMPT_GEN_TEMPERATURE = 0.7;
const PROMPT_GEN_N_PREDICT = 128;
const MCQ_N_PREDICT = 256;

export const EVALUATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    has_errors: { type: 'boolean' },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          original_phrase: { type: 'string' },
          corrected_phrase: { type: 'string' },
          error_type: { type: 'string' },
          explanation: { type: 'string' },
          quick_tip: { type: 'string' },
        },
        required: [
          'original_phrase',
          'corrected_phrase',
          'error_type',
          'explanation',
          'quick_tip',
        ],
      },
    },
    improved_paragraph: { type: 'string' },
    strengths: { type: 'string' },
  },
  required: ['has_errors', 'corrections', 'improved_paragraph', 'strengths'],
};

export const MULTIPLE_CHOICE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    question: { type: 'string' },
    options: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
    },
    answer_index: { type: 'integer', minimum: 0, maximum: 2 },
    explanation: { type: 'string' },
  },
  required: ['question', 'options', 'answer_index', 'explanation'],
};

function buildProfileLines(profile: Profile, weakSpotsSummary: string): string[] {
  const focus =
    profile.focusAreas.length > 0 ? profile.focusAreas.join(', ') : 'grammar';
  const explanation = languageConfig(
    profile.explanationLanguage ?? profile.targetLanguage,
  );
  const lines = [
    'User profile:',
    `- Level: ${profile.level}`,
    `- Native language: ${profile.nativeLanguage ?? 'not provided'}`,
    `- Goal: ${profile.goal}`,
    `- Focus: ${focus}`,
    `- Explanation language: ${explanation.name}`,
  ];
  const summary = weakSpotsSummary.trim();
  if (summary.length > 0) {
    lines.push(`- Recurring mistakes: ${summary}`);
  }
  return lines;
}

export function buildGradingSystemPrompt(
  profile: Profile,
  weakSpotsSummary = '',
  type: ExerciseType = 'paragraph',
): string {
  const target = languageConfig(profile.targetLanguage);
  const explanation = languageConfig(
    profile.explanationLanguage ?? profile.targetLanguage,
  );
  const shortAnswer = type === 'short_answer';
  const lines = [
    `You are ${target.tutorLabel}. Grade the user's response.`,
    '',
    ...buildProfileLines(profile, weakSpotsSummary),
    '',
    'Rules:',
    '- Correct real errors only; do not invent errors.',
    '- Ignore stray symbols, emojis, or accidental punctuation artifacts; they are not language errors.',
    '- Never report a correction whose corrected phrase is identical to the original phrase.',
    '- If you are not sure there is an error, do not report a correction. Never write "no error" or "nothing wrong" inside a correction.',
  ];
  if (shortAnswer) {
    lines.push(
      '- The response should be brief: 1-3 sentences. Grade whether it answers the question correctly, then correct any language errors.',
    );
  }
  lines.push(
    '- Prioritize the focus areas and recurring mistakes.',
    '- error_type: prefer these tags: '
      + target.errorTaxonomy.join(', ')
      + '. Use a short tag if none fit.',
    '- explanation: one sentence saying why the original is wrong, in '
      + explanation.name
      + '. quick_tip: one short actionable sentence, in '
      + explanation.name
      + '.',
    shortAnswer
      ? '- improved_paragraph: corrected version of the response, same meaning and length, natural '
        + target.name
        + '.'
      : '- improved_paragraph: full rewrite, same meaning, natural '
        + target.name
        + '.',
    '- strengths: one sentence.',
    '',
    'Respond ONLY with JSON matching the given schema.',
  );
  return lines.join('\n');
}

export function buildPromptGenSystemPrompt(
  profile: Profile,
  weakSpotsSummary = '',
): string {
  const target = languageConfig(profile.targetLanguage);
  return [
    `You are ${target.tutorLabel}. Write one practice prompt for the user.`,
    '',
    ...buildProfileLines(profile, weakSpotsSummary),
    '',
    'Rules:',
    `- One task the user can answer in 80-150 words, in ${target.name}.`,
    '- The task must be open-ended: the user writes full sentences or paragraphs.',
    '- Never write fill-in-the-blank, multiple-choice, matching, or single-word-answer tasks.',
    '- Match the level; target the focus areas and recurring mistakes.',
    '',
    'Respond ONLY with the prompt text.',
  ].join('\n');
}

export function isLowQualityPrompt(text: string): boolean {
  if (/_{2,}/.test(text)) {
    return true;
  }
  if (/fill in the blank|choose the correct|complete the sentence/i.test(text)) {
    return true;
  }
  if (/(^|\n)\s*\(?\s*[a-dA-D]\s*[).]\s+\S/.test(text)) {
    return true;
  }
  return false;
}

export function buildExerciseGenSystemPrompt(
  type: ExerciseType,
  profile: Profile,
  weakSpotsSummary = '',
): string {
  if (type === 'paragraph') {
    return buildPromptGenSystemPrompt(profile, weakSpotsSummary);
  }
  const target = languageConfig(profile.targetLanguage);
  const explanation = languageConfig(
    profile.explanationLanguage ?? profile.targetLanguage,
  );
  if (type === 'short_answer') {
    return [
      `You are ${target.tutorLabel}. Write one short-answer practice question.`,
      '',
      ...buildProfileLines(profile, weakSpotsSummary),
      '',
      'Rules:',
      `- One question the user can answer in 1-3 sentences, in ${target.name}.`,
      '- The question must be concrete and have a clear expected answer (daily life, work, opinions, descriptions).',
      '- Never write fill-in-the-blank, multiple-choice, matching, or single-word-answer tasks.',
      '- Match the level; target the focus areas and recurring mistakes.',
      '',
      'Respond ONLY with the question text.',
    ].join('\n');
  }
  return [
    `You are ${target.tutorLabel}. Write one multiple-choice practice question.`,
    '',
    ...buildProfileLines(profile, weakSpotsSummary),
    '',
    'Rules:',
    `- One question in ${target.name} that tests one specific point at the user's level.`,
    '- Provide exactly 3 options. Exactly one option is correct.',
    '- The two distractors must be plausible but clearly wrong; target a common mistake for the focus areas and recurring mistakes.',
    '- Do not number or letter the options.',
    `- explanation: one sentence in ${explanation.name} saying why the correct option is right.`,
    '',
    'Respond ONLY with JSON matching the given schema.',
  ].join('\n');
}

function isStringRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isEvaluation(value: unknown): value is Evaluation {
  if (!isStringRecord(value)) {
    return false;
  }
  if (typeof value.has_errors !== 'boolean') {
    return false;
  }
  if (!Array.isArray(value.corrections)) {
    return false;
  }
  for (const correction of value.corrections) {
    if (!isStringRecord(correction)) {
      return false;
    }
    for (const field of [
      'original_phrase',
      'corrected_phrase',
      'error_type',
      'explanation',
      'quick_tip',
    ]) {
      if (typeof correction[field] !== 'string') {
        return false;
      }
    }
  }
  return (
    typeof value.improved_paragraph === 'string' &&
    typeof value.strengths === 'string'
  );
}

export function extractJsonBlock(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

const GRADABLE_TEXT_PATTERN =
  /[^\p{L}\p{N}\s.,!?;:'"()\u2013\u2014\u2026\u00A1\u00BF\u2018\u2019\u201C\u201D]/gu;

export function sanitizeForGrading(text: string): string {
  return text.replace(GRADABLE_TEXT_PATTERN, '');
}

export function normalizePhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,!?;:'"()\u2013\u2014]+|[\s.,!?;:'"()\u2013\u2014]+$/g, '')
    .trim();
}

const NO_ERROR_CLAIM_PATTERN =
  /no\s+(real\s+)?(error|mistake|issue|problems?)|nothing\s+(is\s+)?wrong|(is|are|seems|looks)\s+(already\s+)?correct(\s+as\s+(written|is))?|sin\s+error(es)?|no\s+hay\s+error(es)?|ning[uú]n\s+error|est[aá]\s+(correcto|bien)|es\s+correcto|no\s+es\s+un\s+error/i;

export function isSelfContradictory(correction: Correction): boolean {
  return (
    NO_ERROR_CLAIM_PATTERN.test(correction.explanation) ||
    NO_ERROR_CLAIM_PATTERN.test(correction.quick_tip)
  );
}

export function filterPhantomCorrections(evaluation: Evaluation): Evaluation {
  const corrections = evaluation.corrections.filter(
    correction =>
      normalizePhrase(correction.original_phrase) !==
        normalizePhrase(correction.corrected_phrase) &&
      !isSelfContradictory(correction),
  );
  if (corrections.length === evaluation.corrections.length) {
    return evaluation;
  }
  return {
    ...evaluation,
    corrections,
    has_errors: corrections.length > 0,
  };
}

export function parseEvaluation(raw: string): Evaluation {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const block = extractJsonBlock(text);
    if (block == null) {
      throw new SyntaxError('No JSON object found in model output.');
    }
    parsed = JSON.parse(block);
  }
  if (!isEvaluation(parsed)) {
    throw new Error('Response does not match the evaluation schema.');
  }
  return parsed;
}

export function isMultipleChoice(
  value: unknown,
): value is MultipleChoiceExercise {
  if (!isStringRecord(value)) {
    return false;
  }
  if (typeof value.question !== 'string' || value.question.trim().length === 0) {
    return false;
  }
  if (!Array.isArray(value.options) || value.options.length !== 3) {
    return false;
  }
  for (const option of value.options) {
    if (typeof option !== 'string' || option.trim().length === 0) {
      return false;
    }
  }
  const distinct = new Set(value.options.map(normalizePhrase));
  if (distinct.size !== 3) {
    return false;
  }
  if (
    typeof value.answerIndex !== 'number' ||
    !Number.isInteger(value.answerIndex) ||
    value.answerIndex < 0 ||
    value.answerIndex > 2
  ) {
    return false;
  }
  return (
    typeof value.explanation === 'string' && value.explanation.trim().length > 0
  );
}

export function parseMultipleChoice(raw: string): MultipleChoiceExercise {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    const block = extractJsonBlock(text);
    if (block == null) {
      throw new SyntaxError('No JSON object found in model output.');
    }
    parsed = JSON.parse(block);
  }
  if (!isStringRecord(parsed)) {
    throw new Error('Response does not match the exercise schema.');
  }
  const candidate = {
    question: parsed.question,
    options: parsed.options,
    answerIndex: parsed.answer_index,
    explanation: parsed.explanation,
  };
  if (!isMultipleChoice(candidate)) {
    throw new Error('Response does not match the exercise schema.');
  }
  return candidate;
}

const llamaContexts = new Map<ModelVariant, LlamaContext>();
const initPromises = new Map<ModelVariant, Promise<LlamaContext>>();

export async function ensureModelLoaded(
  variant: ModelVariant = 'full',
): Promise<LlamaContext> {
  const existing = llamaContexts.get(variant);
  if (existing) {
    return existing;
  }
  let initPromise = initPromises.get(variant);
  if (!initPromise) {
    initPromise = (async () => {
      const modelPath = await getVerifiedModelPath(variant);
      try {
        const context = await initLlama({
          model: modelPath,
          n_ctx: N_CTX,
          n_threads: N_THREADS,
          use_mlock: true,
          n_gpu_layers: 0,
        });
        llamaContexts.set(variant, context);
        return context;
      } catch (cause) {
        initPromises.delete(variant);
        throw new ModelInitError(
          `Could not load the on-device model: ${
            cause instanceof Error ? cause.message : String(cause)
          }`,
        );
      }
    })();
    initPromises.set(variant, initPromise);
  }
  return initPromise;
}

export async function releaseModel(): Promise<void> {
  const contexts = [...llamaContexts.entries()];
  llamaContexts.clear();
  initPromises.clear();
  for (const [variant, context] of contexts) {
    try {
      await context.release();
      logDebug('ai', `model context released (${variant})`);
    } catch (error) {
      logDebug(
        'ai',
        `model context release failed (${variant}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

const MAX_ATTEMPTS = 2;

export type EvaluationStage = 'loading-model' | 'grading';

export type EvaluateCallbacks = {
  onStage?: (stage: EvaluationStage) => void;
  onPartial?: (tokenCount: number) => void;
};

export async function evaluateWriting(
  profile: Profile,
  prompt: string,
  response: string,
  weakSpotsSummary = '',
  callbacks?: EvaluateCallbacks,
  type: ExerciseType = 'paragraph',
): Promise<Evaluation> {
  const variant: ModelVariant = profile.modelVariant ?? 'full';
  callbacks?.onStage?.('loading-model');
  const context = await ensureModelLoaded(variant);
  callbacks?.onStage?.('grading');
  const messages = [
    {
      role: 'system' as const,
      content: buildGradingSystemPrompt(profile, weakSpotsSummary, type),
    },
    {
      role: 'user' as const,
      content: `Writing prompt: ${prompt}\n\nResponse to review:\n${sanitizeForGrading(response)}`,
    },
  ];

  let lastError: unknown = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let tokenCount = 0;
    const result = await context.completion(
      {
        messages,
        n_predict: N_PREDICT,
        temperature: TEMPERATURE,
        response_format: {
          type: 'json_schema',
          json_schema: { schema: EVALUATION_JSON_SCHEMA },
        },
      },
      () => {
        tokenCount += 1;
        callbacks?.onPartial?.(tokenCount);
      },
    );
    try {
      return filterPhantomCorrections(parseEvaluation(result.text));
    } catch (error) {
      lastError = error;
      logDebug(
        'ai',
        `evaluation parse failed (attempt ${attempt + 1}): ${
          error instanceof Error ? error.message : String(error)
        }`,
        `raw output: ${result.text.slice(0, 200)}`,
      );
    }
  }
  throw new EvaluationError(
    `Could not parse a valid evaluation: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export function cleanGeneratedPrompt(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:text|markdown)?\s*/i, '').replace(/```\s*$/, '');
  }
  if (
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1);
  }
  return text.trim();
}

export type GeneratedExercise = {
  type: ExerciseType;
  prompt: string;
  exercise: MultipleChoiceExercise | null;
};

function formatUnknown(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function generateExercise(
  type: ExerciseType,
  profile: Profile,
  weakSpotsSummary = '',
): Promise<GeneratedExercise> {
  const variant: ModelVariant = profile.modelVariant ?? 'full';
  const context = await ensureModelLoaded(variant);

  if (type === 'multiple_choice') {
    const messages = [
      {
        role: 'system' as const,
        content: buildExerciseGenSystemPrompt(
          'multiple_choice',
          profile,
          weakSpotsSummary,
        ),
      },
      { role: 'user' as const, content: "Write today's practice question." },
    ];
    let lastError: unknown = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const result = await context.completion(
        {
          messages,
          n_predict: MCQ_N_PREDICT,
          temperature: PROMPT_GEN_TEMPERATURE,
          response_format: {
            type: 'json_schema',
            json_schema: { schema: MULTIPLE_CHOICE_JSON_SCHEMA },
          },
        },
        undefined,
      );
      try {
        const exercise = parseMultipleChoice(result.text);
        return { type: 'multiple_choice', prompt: exercise.question, exercise };
      } catch (error) {
        lastError = error;
        logDebug(
          'ai',
          `mcq generation failed (attempt ${attempt + 1}): ${formatUnknown(error)}`,
          `raw output: ${result.text.slice(0, 200)}`,
        );
      }
    }
    logDebug(
      'ai',
      `mcq generation failed after ${MAX_ATTEMPTS} attempts, degrading to short answer: ${formatUnknown(lastError)}`,
    );
  }

  const genType: ExerciseType =
    type === 'multiple_choice' ? 'short_answer' : type;
  const result = await context.completion({
    messages: [
      {
        role: 'system' as const,
        content: buildExerciseGenSystemPrompt(genType, profile, weakSpotsSummary),
      },
      { role: 'user' as const, content: "Write today's practice prompt." },
    ],
    n_predict: PROMPT_GEN_N_PREDICT,
    temperature: PROMPT_GEN_TEMPERATURE,
  });
  const promptText = cleanGeneratedPrompt(result.text);
  if (promptText.length === 0) {
    throw new PromptGenerationError('The model returned an empty practice prompt.');
  }
  if (isLowQualityPrompt(promptText)) {
    throw new PromptGenerationError(
      'The model returned a fill-in-the-blank or multiple-choice prompt.',
    );
  }
  return { type: genType, prompt: promptText, exercise: null };
}

export async function generateWritingPrompt(
  profile: Profile,
  weakSpotsSummary = '',
): Promise<string> {
  const generated = await generateExercise('paragraph', profile, weakSpotsSummary);
  return generated.prompt;
}
