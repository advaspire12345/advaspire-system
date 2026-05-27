"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_PREFIX = "lms-onboarding-seen-";
const MAX_AUTO_OPENS = 2; // first + second login
const PULSE_BEFORE_OPEN_MS = 1500;

function readCount(userId: string): number {
  if (typeof window === "undefined") return MAX_AUTO_OPENS;
  const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function writeCount(userId: string, n: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_PREFIX + userId, String(Math.min(n, MAX_AUTO_OPENS)));
}

/**
 * Drives the first/second-login help nudge.
 *
 * On mount, if the user has seen the dialog fewer than MAX_AUTO_OPENS times:
 *   1. Returns `shouldPulse=true` immediately (the icon glows for ~1.5s).
 *   2. After PULSE_BEFORE_OPEN_MS, returns `shouldAutoOpen=true` so the parent
 *      can open the dialog.
 *
 * Caller MUST call `markSeen()` when the dialog is closed (either programmatically
 * from the auto-open path or via user click on the close button) so the counter
 * increments. We only count auto-opens — manual clicks via the ? icon don't bump
 * the counter, otherwise we'd lock the user out after 2 manual reads.
 */
export function useOnboardingTrigger(userId: string | null): {
  shouldPulse: boolean;
  shouldAutoOpen: boolean;
  markSeen: () => void;
  resetAutoOpen: () => void;
} {
  const [shouldPulse, setShouldPulse] = useState(false);
  const [shouldAutoOpen, setShouldAutoOpen] = useState(false);
  const didFireRef = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (didFireRef.current) return; // StrictMode double-effect guard
    const count = readCount(userId);
    if (count >= MAX_AUTO_OPENS) return;

    didFireRef.current = true;
    setShouldPulse(true);
    const t = setTimeout(() => {
      setShouldAutoOpen(true);
    }, PULSE_BEFORE_OPEN_MS);

    return () => clearTimeout(t);
  }, [userId]);

  const markSeen = useCallback(() => {
    if (!userId) return;
    writeCount(userId, readCount(userId) + 1);
    setShouldAutoOpen(false);
    setShouldPulse(false);
  }, [userId]);

  // Called when the dialog closes without us wanting to count it (manual
  // re-open via the icon). Keeps shouldAutoOpen false; doesn't bump the counter.
  const resetAutoOpen = useCallback(() => {
    setShouldAutoOpen(false);
    setShouldPulse(false);
  }, []);

  return { shouldPulse, shouldAutoOpen, markSeen, resetAutoOpen };
}
