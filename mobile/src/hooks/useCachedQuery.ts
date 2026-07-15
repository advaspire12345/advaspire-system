import { useCallback, useEffect, useRef, useState } from "react";

import { readCache, writeCache } from "@/lib/cache";

type Options = {
  // When false (e.g. no logged-in user yet) the hook does not fetch and
  // resolves loading immediately so the screen never spins forever.
  enabled?: boolean;
};

export type CachedQueryResult<T> = {
  data: T | null;
  // Only true on a cold start with nothing cached yet. Once cached data is
  // shown, this is false even while a background refresh is running.
  loading: boolean;
  // A foreground pull-to-refresh is in flight.
  refreshing: boolean;
  // The most recent refresh failed (typically offline). Pair with `data` to
  // decide whether to show a hard error or just the stale-but-usable view.
  error: string | null;
  // True when we are showing cached data because the latest refresh failed.
  isStale: boolean;
  // Epoch ms of when the shown data was last fetched from the network.
  updatedAt: number | null;
  refetch: () => void;
  // Optimistically update the shown data (and re-cache it) without a fetch —
  // e.g. marking a notification read. Keeps the existing "last synced" stamp.
  setData: (updater: T | null | ((prev: T | null) => T | null)) => void;
};

/**
 * Fetch-with-cache: on mount it shows the last data saved on the device
 * instantly, then refreshes from the network in the background. If the
 * refresh fails (no connection) the cached data stays on screen and the
 * caller can surface an "offline" banner via `isStale` / `updatedAt`.
 */
export function useCachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: Options = {},
): CachedQueryResult<T> {
  const enabled = options.enabled ?? true;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  // Refs so the network runner doesn't need to re-create when the fetcher
  // closure or data identity changes on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const dataRef = useRef<T | null>(null);
  const updatedAtRef = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) setRefreshing(true);
      try {
        const fresh = await fetcherRef.current();
        if (!mounted.current) return;
        const now = Date.now();
        dataRef.current = fresh;
        updatedAtRef.current = now;
        setData(fresh);
        setUpdatedAt(now);
        setError(null);
        setIsStale(false);
        void writeCache(key, fresh, now);
      } catch (err) {
        if (!mounted.current) return;
        setError(err instanceof Error ? err.message : "Failed to load");
        // Keep showing whatever we already have; flag it as stale.
        setIsStale(dataRef.current != null);
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [key],
  );

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      // Nothing to fetch yet — don't leave the screen spinning.
      setLoading(false);
      return;
    }

    (async () => {
      // 1. Hydrate from disk immediately so the last view shows at once.
      const cached = await readCache<T>(key);
      if (!cancelled && cached) {
        dataRef.current = cached.data;
        updatedAtRef.current = cached.updatedAt;
        setData(cached.data);
        setUpdatedAt(cached.updatedAt);
        setLoading(false);
      }
      // 2. Refresh in the background (no-op visually if offline).
      if (!cancelled) await run(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [key, enabled, run]);

  const refetch = useCallback(() => {
    void run(true);
  }, [run]);

  const setDataExternal = useCallback<CachedQueryResult<T>["setData"]>(
    (updater) => {
      setData((prev) => {
        const next = typeof updater === "function" ? (updater as (p: T | null) => T | null)(prev) : updater;
        dataRef.current = next;
        if (next != null) void writeCache(key, next, updatedAtRef.current ?? Date.now());
        return next;
      });
    },
    [key],
  );

  return { data, loading, refreshing, error, isStale, updatedAt, refetch, setData: setDataExternal };
}
