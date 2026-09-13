import { useCallback, useEffect, useState } from 'react';
import {
  getRecentErrorTypeLists,
  getRecentSessions,
  getSessionStats,
  listSessions,
} from '../data';
import type { SessionStatsData } from '../data';
import { normalizeErrorType, summarizeWeakSpotsFromLists } from '../ai/adaptive';
import type { SessionSummary } from '../navigation/types';

const PAGE_SIZE = 30;

export function useWeakSpots(limit = 20) {
  const [summary, setSummary] = useState('');
  const [topErrorTypes, setTopErrorTypes] = useState<
    { type: string; count: number }[]
  >([]);

  const reload = useCallback(async () => {
    try {
      const lists = await getRecentErrorTypeLists(limit);
      setSummary(summarizeWeakSpotsFromLists(lists));
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
    } catch (error) {
      console.warn('Failed to load weak spots', error);
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
