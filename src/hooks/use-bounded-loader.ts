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
  /** Row-level identity used for dedup ("have I already added THIS row?").
   *  For tables where one entity (e.g. student) can produce multiple rows
   *  (one per enrollment), this must be a composite of the entity id AND
   *  the row distinguisher — e.g. `${student.id}-${enrollmentId}`. */
  getId: (row: T) => string;
  /** Entity-level identity used for offset advancement. The paginated API
   *  paginates by *entities* (e.g. 10 students per batch); the offset
   *  needs to advance by the count of *entities* in the response, not by
   *  the row count. Defaults to `getId` for 1:1 tables (1 row = 1 entity). */
  getEntityId?: (row: T) => string;
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
  getEntityId,
  setData,
  batchSize = 10,
  initialLoadCap = 100,
}: UseBoundedLoaderArgs<T>): { isLoadingMore: boolean; resetTo: (rows: T[]) => void } {
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // Offset is in *entities*, matching what the API expects. For tables where
  // one entity produces multiple rows, this is < initialData.length.
  const entityIdOf = getEntityId ?? getId;
  const loadedUpToRef = useRef(new Set(initialData.map(entityIdOf)).size);
  const seenIdsRef = useRef(new Set(initialData.map(getId)));
  const abortRef = useRef<AbortController | null>(null);

  // Stash caller-provided callbacks in refs so the effect doesn't re-run
  // whenever the parent component re-renders with fresh inline functions.
  // We always want the latest version at fetch-time, hence the assignment
  // in a layout effect equivalent (plain ref assignment in the render path
  // is fine because React strict-mode renders are idempotent).
  const apiUrlRef = useRef(apiUrl);
  const getIdRef = useRef(getId);
  const entityIdOfRef = useRef(entityIdOf);
  const setDataRef = useRef(setData);
  apiUrlRef.current = apiUrl;
  getIdRef.current = getId;
  entityIdOfRef.current = entityIdOf;
  setDataRef.current = setData;

  // Track the last `initialData` we acted on so we can detect when the
  // parent's router.refresh() (e.g. after a delete) hands us a fresh server
  // batch. When that happens we resync the loader's internal cursors against
  // the new initialData before the fetch loop runs — otherwise the loader
  // thinks the older "fully loaded up to N" state still holds, refuses to
  // fetch more, and the user lands on a now-empty page 2.
  const lastInitialDataRef = useRef(initialData);

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
    loadedUpToRef.current = new Set(rows.map(entityIdOfRef.current)).size;
    seenIdsRef.current = new Set(rows.map(getIdRef.current));
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Parent's router.refresh() (e.g. after a delete) replaces `initialData`
    // with a fresh server batch. Resync the loader's cursors so we don't
    // think a stale "loaded up to N" still holds — otherwise the next page
    // slice reads from an empty range.
    if (lastInitialDataRef.current !== initialData) {
      loadedUpToRef.current = new Set(initialData.map(entityIdOfRef.current)).size;
      seenIdsRef.current = new Set(initialData.map(getIdRef.current));
      lastInitialDataRef.current = initialData;
    }

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
          const entityIdOf = entityIdOfRef.current;
          const newRows = rows.filter((r) => !seenIdsRef.current.has(getId(r)));
          for (const r of rows) seenIdsRef.current.add(getId(r));
          if (!controller.signal.aborted && newRows.length > 0) {
            setDataRef.current((prev) => [...prev, ...newRows]);
          }
          // Advance by the count of *entities* in the response, not rows. The
          // server-side pagination skips by entities; if rows.length > entity
          // count (multi-row-per-entity tables) using rows.length would
          // over-skip and silently drop entire pages of entities.
          const entitiesInBatch = new Set(rows.map(entityIdOf)).size;
          loadedUpToRef.current = offset + entitiesInBatch;
          if (entitiesInBatch < batchSize) break;
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
  }, [target, totalCount, batchSize, initialData]);

  return { isLoadingMore, resetTo };
}
