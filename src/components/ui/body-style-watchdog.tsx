"use client";

import { useEffect } from "react";

/**
 * Radix Dialog/Popover sometimes leaves `body { pointer-events: none }` and
 * `overflow: hidden` applied after a close, especially when a re-render (e.g.
 * router.refresh) happens during the close animation.  Symptom: the page goes
 * dark, can't scroll, can't click — like a dialog is open even though nothing
 * is rendered.
 *
 * This watchdog observes body's inline styles + the dialog/popover portal
 * subtree.  If body says it's locked but no dialog with `data-state="open"`
 * is actually visible, it resets the lock styles.  Cheap, idempotent, runs
 * once on mount.
 */
export function BodyStyleWatchdog() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;

    const isAnyDialogOpen = () => {
      // Radix Dialog uses `data-state="open"` on the content element, which is
      // inside the portal during the open animation.  We also accept the
      // overlay element (`role="dialog"` with state "open").
      const candidates = document.querySelectorAll<HTMLElement>(
        '[data-state="open"]'
      );
      for (const c of candidates) {
        if (c.offsetParent !== null) return true;
      }
      return false;
    };

    const sweep = () => {
      if (isAnyDialogOpen()) return;
      const computed = getComputedStyle(body);
      if (computed.pointerEvents === "none") body.style.pointerEvents = "";
      if (computed.overflow === "hidden") {
        // Only restore overflow if it's the inline-set lock (not a permanent
        // app style).  Radix sets it via inline style; if the inline value is
        // "hidden", clear it.
        if (body.style.overflow === "hidden") body.style.overflow = "";
      }
    };

    // Run periodically — cheap, covers the race window after dialog close.
    const interval = window.setInterval(sweep, 500);

    // Also observe DOM mutations on body's style attribute and the portal
    // root to catch the leak the moment it happens.
    const obs = new MutationObserver(() => {
      // Defer to next frame so Radix has a chance to complete its own
      // state update first.
      requestAnimationFrame(sweep);
    });
    obs.observe(body, { attributes: true, attributeFilter: ["style"] });
    obs.observe(document.documentElement, { childList: true, subtree: false });

    return () => {
      window.clearInterval(interval);
      obs.disconnect();
    };
  }, []);

  return null;
}
