"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

/**
 * Shared progressive loader for paginated tables.
 *
 * On mount and whenever currentPage / searchTerm / totalCount change, the
 * loader computes a target offset (next 100-block past the current page, or
 * totalCount when searching) and pulls 10-row batches until it reaches it.
 *
 * Mid-fetch interruptions (e.g. user clicks page 11 while batch 4 is in
 * flight) cancel the previous AbortController so we never get into the
 * stuck-spinner / off-by-N state the old fetchingRef-based design had.
 *
 * The id field name varies per table (id, studentId, etc.); pass `getId`
 * to dedupe across overlapping batches.
 */
export interface UseBoundedLoaderArgs<T> {
  initialData: T[];
  totalCount: number;
  currentPage: number;
  searchTerm: string;
  itemsPerPage: number;
  apiUrl: (offset: number, limit: number) => string;
  getId: (row: T) => string;
  setData: Dispatch<SetStateAction<T[]>>;
  batchSize?: number;
  initialLoadCap?: number;
}

export function useBoundedLoader<T>({
  initialData,
  totalCount,
  currentPage,
  searchTerm,
  itemsPerPage,
  apiUrl,
  getId,
  setData,
  batchSize = 10,
  initialLoadCap = 100,
}: UseBoundedLoaderArgs<T>): { isLoadingMore: boolean; resetTo: (rows: T[]) => void } {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadedUpToRef = useRef(initialData.length);
  const seenIdsRef = useRef(new Set(initialData.map(getId)));
  const abortRef = useRef<AbortController | null>(null);

  // Stash caller-provided callbacks in refs so the effect doesn't re-run
  // whenever the parent component re-renders with fresh inline functions.
  // We always want the latest version at fetch-time, hence the assignment
  // in a layout effect equivalent (plain ref assignment in the render path
  // is fine because React strict-mode renders are idempotent).
  const apiUrlRef = useRef(apiUrl);
  const getIdRef = useRef(getId);
  const setDataRef = useRef(setData);
  apiUrlRef.current = apiUrl;
  getIdRef.current = getId;
  setDataRef.current = setData;

  const target = (() => {
    if (searchTerm.trim().length > 0) return totalCount;
    const pageRowCount = currentPage * itemsPerPage;
    const blockEnd = Math.max(
      initialLoadCap,
      Math.ceil(pageRowCount / initialLoadCap) * initialLoadCap,
    );
    return Math.min(blockEnd, totalCount);
  })();

  const resetTo = useCallback((rows: T[]) => {
    abortRef.current?.abort();
    loadedUpToRef.current = rows.length;
    seenIdsRef.current = new Set(rows.map(getIdRef.current));
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (loadedUpToRef.current >= target) {
      setIsLoadingMore(false);
      return;
    }

    setIsLoadingMore(true);

    (async () => {
      try {
        while (!controller.signal.aborted && loadedUpToRef.current < target) {
          const offset = loadedUpToRef.current;
          const res = await fetch(apiUrlRef.current(offset, batchSize), { signal: controller.signal });
          if (!res.ok) break;
          const data: { rows: T[] } = await res.json();
          const rows = data.rows ?? [];
          if (rows.length === 0) {
            loadedUpToRef.current = totalCount;
            break;
          }
          const getId = getIdRef.current;
          const newRows = rows.filter((r) => !seenIdsRef.current.has(getId(r)));
          for (const r of rows) seenIdsRef.current.add(getId(r));
          if (!controller.signal.aborted && newRows.length > 0) {
            setDataRef.current((prev) => [...prev, ...newRows]);
          }
          loadedUpToRef.current = offset + rows.length;
          if (rows.length < batchSize) break;
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("[useBoundedLoader] fetch failed:", err);
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingMore(false);
      }
    })();

    return () => controller.abort();
  }, [target, totalCount, batchSize]);

  return { isLoadingMore, resetTo };
}
