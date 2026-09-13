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
import type { Evaluation, Profile } from '../navigation/types';

export class ModelInitError extends Error {}

export class EvaluationError extends Error {}

export class PromptGenerationError extends Error {}

const PROMPT_GEN_TEMPERATURE = 0.7;
const PROMPT_GEN_N_PREDICT = 128;

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
): string {
  const target = languageConfig(profile.targetLanguage);
  const explanation = languageConfig(
    profile.explanationLanguage ?? profile.targetLanguage,
  );
  return [
    `You are ${target.tutorLabel}. Grade the user's response.`,
    '',
    ...buildProfileLines(profile, weakSpotsSummary),
    '',
    'Rules:',
    '- Correct real errors only; do not invent errors.',
    '- Prioritize the focus areas and recurring mistakes.',
    '- error_type: prefer these tags: '
      + target.errorTaxonomy.join(', ')
      + '. Use a short tag if none fit.',
    '- explanation and quick_tip: one short sentence each, in '
      + explanation.name
      + '.',
    '- improved_paragraph: full rewrite, same meaning, natural '
      + target.name
      + '.',
    '- strengths: one sentence.',
    '',
    'Respond ONLY with JSON matching the given schema.',
  ].join('\n');
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
    '- Match the level; target the focus areas and recurring mistakes.',
    '',
    'Respond ONLY with the prompt text.',
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

export function parseEvaluation(raw: string): Evaluation {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  const parsed: unknown = JSON.parse(text);
  if (!isEvaluation(parsed)) {
    throw new Error('Response does not match the evaluation schema.');
  }
  return parsed;
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
  const contexts = [...llamaContexts.values()];
  llamaContexts.clear();
  initPromises.clear();
  for (const context of contexts) {
    await context.release();
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
): Promise<Evaluation> {
  const variant: ModelVariant = profile.modelVariant ?? 'full';
  callbacks?.onStage?.('loading-model');
  const context = await ensureModelLoaded(variant);
  callbacks?.onStage?.('grading');
  const messages = [
    {
      role: 'system' as const,
      content: buildGradingSystemPrompt(profile, weakSpotsSummary),
    },
    {
      role: 'user' as const,
      content: `Writing prompt: ${prompt}\n\nResponse to review:\n${response}`,
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
      return parseEvaluation(result.text);
    } catch (error) {
      lastError = error;
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

export async function generateWritingPrompt(
  profile: Profile,
  weakSpotsSummary = '',
): Promise<string> {
  const variant: ModelVariant = profile.modelVariant ?? 'full';
  const context = await ensureModelLoaded(variant);
  const result = await context.completion({
    messages: [
      {
        role: 'system' as const,
        content: buildPromptGenSystemPrompt(profile, weakSpotsSummary),
      },
      { role: 'user' as const, content: 'Write today\'s practice prompt.' },
    ],
    n_predict: PROMPT_GEN_N_PREDICT,
    temperature: PROMPT_GEN_TEMPERATURE,
  });
  const promptText = cleanGeneratedPrompt(result.text);
  if (promptText.length === 0) {
    throw new PromptGenerationError('The model returned an empty practice prompt.');
  }
  return promptText;
}
