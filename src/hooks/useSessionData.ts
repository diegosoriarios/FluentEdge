import { useCallback, useEffect, useState } from 'react';
import {
  getRecentErrorTypeLists,
  getRecentSessions,
  getSessionStats,
  listAnsweredDailyQuestions,
  listSessions,
} from '../data';
import type { SessionStatsData } from '../data';
import type { DailyQuestionRecord } from '../data/questions';
import { normalizeErrorType, summarizeWeakSpotsFromLists } from '../ai/adaptive';
import type { SessionSummary } from '../navigation/types';

const PAGE_SIZE = 30;

export function useWeakSpots(limit = 20) {
  const [summary, setSummary] = useState('');
  const [topErrorTypes, setTopErrorTypes] = useState<
    { type: string; count: number }[]
  >([]);

  const reload = useCallback(async (): Promise<string> => {
    try {
      const lists = await getRecentErrorTypeLists(limit);
      const nextSummary = summarizeWeakSpotsFromLists(lists);
      setSummary(nextSummary);
      const counts = new Map<string, number>();
      for (const errorTypes of lists) {
        for (const errorType of errorTypes) {
          const key = normalizeErrorType(errorType);
          if (key.length === 0) {
            continue;
          }
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      setTopErrorTypes(
        [...counts.entries()]
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      );
      return nextSummary;
    } catch (error) {
      console.warn('Failed to load weak spots', error);
      return '';
    }
  }, [limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { summary, topErrorTypes, reload };
}

export function useSessionStats() {
  const [stats, setStats] = useState<SessionStatsData>({
    totalSessions: 0,
    lastSessionAt: null,
    streakDays: 0,
    practiceDays: [],
  });

  const reload = useCallback(async () => {
    try {
      setStats(await getSessionStats());
    } catch (error) {
      console.warn('Failed to load session stats', error);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { stats, reload };
}

export function useRecentSessions(limit = 12) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  const reload = useCallback(async () => {
    try {
      setSessions(await getRecentSessions(limit));
    } catch (error) {
      console.warn('Failed to load recent sessions', error);
    }
  }, [limit]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sessions, reload };
}

export function usePaginatedSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    try {
      const page = await listSessions(PAGE_SIZE, 0);
      setSessions(page.sessions);
      setHasMore(page.hasMore);
    } catch (error) {
      console.warn('Failed to load sessions', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listSessions(PAGE_SIZE, sessions.length);
      setSessions(prev => [...prev, ...page.sessions]);
      setHasMore(page.hasMore);
    } catch (error) {
      console.warn('Failed to load more sessions', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, sessions.length]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { sessions, loading, loadingMore, hasMore, reload, loadMore };
}

export function useQuestionHistory() {
  const [questions, setQuestions] = useState<DailyQuestionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  const reload = useCallback(async () => {
    try {
      const page = await listAnsweredDailyQuestions(PAGE_SIZE, 0);
      setQuestions(page.questions);
      setHasMore(page.hasMore);
    } catch (error) {
      console.warn('Failed to load question history', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    setLoadingMore(true);
    try {
      const page = await listAnsweredDailyQuestions(
        PAGE_SIZE,
        questions.length,
      );
      setQuestions(prev => [...prev, ...page.questions]);
      setHasMore(page.hasMore);
    } catch (error) {
      console.warn('Failed to load more questions', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, questions.length]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { questions, loading, loadingMore, hasMore, reload, loadMore };
}
