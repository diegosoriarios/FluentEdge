import type { Level, SessionSummary, Evaluation } from '../navigation/types';
import { countWords } from '../utils/format';

export const ADAPTIVE_CONFIG = {
  decay: 0.85,
  tagLimit: 3,
  maxSummaryChars: 150,
  recentWindow: 5,
  promoteRate: 2.0,
  demoteRate: 6.0,
  promoteStreak: 3,
  demoteStreak: 2,
  minSessions: 5,
  cooldownSessions: 5,
  minLevelIndex: 1,
  maxLevelIndex: 3,
};

const LEVELS: Level[] = ['A2', 'B1', 'B2', 'C1'];

type EvaluatedSession = SessionSummary & { evaluation: Evaluation };

function evaluatedSessions(sessions: SessionSummary[]): EvaluatedSession[] {
  return sessions.filter(
    (session): session is EvaluatedSession => session.evaluation != null,
  );
}

export function normalizeErrorType(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function summarizeWeakSpotsFromLists(errorTypeLists: string[][]): string {
  const counts = new Map<string, number>();
  errorTypeLists.forEach((errorTypes, age) => {
    const weight = Math.pow(ADAPTIVE_CONFIG.decay, age);
    for (const errorType of errorTypes) {
      const key = normalizeErrorType(errorType);
      if (key.length === 0) {
        continue;
      }
      counts.set(key, (counts.get(key) ?? 0) + weight);
    }
  });
  const summary = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, ADAPTIVE_CONFIG.tagLimit)
    .map(([tag, weight]) => `${tag}:${Math.round(weight)}`)
    .join(', ');
  if (summary.length <= ADAPTIVE_CONFIG.maxSummaryChars) {
    return summary;
  }
  const truncated = summary.slice(0, ADAPTIVE_CONFIG.maxSummaryChars - 1);
  const lastComma = truncated.lastIndexOf(',');
  return lastComma > 0 ? truncated.slice(0, lastComma) : truncated;
}

export function summarizeWeakSpots(sessions: SessionSummary[]): string {
  return summarizeWeakSpotsFromLists(
    evaluatedSessions(sessions).map(session =>
      session.evaluation.corrections.map(correction => correction.error_type),
    ),
  );
}

export function errorRatePer100Words(session: SessionSummary): number {
  const correctionCount = session.evaluation?.corrections.length ?? 0;
  const words = countWords(session.response);
  if (words === 0) {
    return 0;
  }
  return (correctionCount / words) * 100;
}

export type LevelAdjustment = {
  level: Level;
  changed: boolean;
  direction?: 'up' | 'down';
  reason?: string;
};

function countStreak(
  rates: number[],
  predicate: (rate: number) => boolean,
): number {
  let streak = 0;
  for (const rate of rates) {
    if (predicate(rate)) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function nextLevel(
  current: Level,
  sessions: SessionSummary[],
  lastAdjustAt: number | null,
): LevelAdjustment {
  const evaluated = evaluatedSessions(sessions);
  if (evaluated.length < ADAPTIVE_CONFIG.minSessions) {
    return { level: current, changed: false };
  }

  if (lastAdjustAt != null) {
    const sessionsSince = evaluated.filter(
      session => session.createdAt > lastAdjustAt,
    ).length;
    if (sessionsSince < ADAPTIVE_CONFIG.cooldownSessions) {
      return { level: current, changed: false };
    }
  }

  const recentRates = evaluated
    .slice(0, ADAPTIVE_CONFIG.recentWindow)
    .map(errorRatePer100Words);

  const promoteStreak = countStreak(
    recentRates,
    rate => rate <= ADAPTIVE_CONFIG.promoteRate,
  );
  const demoteStreak = countStreak(
    recentRates,
    rate => rate >= ADAPTIVE_CONFIG.demoteRate,
  );

  const currentIndex = LEVELS.indexOf(current);
  if (currentIndex < 0) {
    return { level: current, changed: false };
  }

  if (
    promoteStreak >= ADAPTIVE_CONFIG.promoteStreak &&
    currentIndex < ADAPTIVE_CONFIG.maxLevelIndex
  ) {
    return {
      level: LEVELS[currentIndex + 1],
      changed: true,
      direction: 'up',
      reason: `Error rate at or below ${ADAPTIVE_CONFIG.promoteRate}/100 words for ${promoteStreak} sessions`,
    };
  }

  if (
    demoteStreak >= ADAPTIVE_CONFIG.demoteStreak &&
    currentIndex > ADAPTIVE_CONFIG.minLevelIndex
  ) {
    return {
      level: LEVELS[currentIndex - 1],
      changed: true,
      direction: 'down',
      reason: `Error rate at or above ${ADAPTIVE_CONFIG.demoteRate}/100 words for ${demoteStreak} sessions`,
    };
  }

  return { level: current, changed: false };
}
