"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface TourStep {
  /** CSS selector for the element to spotlight. First match wins. */
  selector: string;
  title: string;
  body: string;
  /** Optional callouts shown in a red "you can't" box inside the bubble. */
  cantDo?: string[];
  /** Where to position the tooltip relative to the spotlight. Default: auto. */
  placement?: "top" | "bottom" | "left" | "right";
}

interface TourOverlayProps {
  steps: TourStep[];
  active: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const SPOTLIGHT_PADDING = 8;
const BUBBLE_GAP = 12;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

export function TourOverlay({ steps, active, onComplete, onSkip }: TourOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vp, setVp] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [mounted, setMounted] = useState(false);
  // Measured AFTER the bubble renders so we can re-clamp its position from
  // its real height (varies per step — long `cantDo` lists make it taller).
  // `measuredForStep` lets us hide the bubble on the first pass after a step
  // change until we've measured its real height — avoids a frame of misplacement.
  const [bubbleH, setBubbleH] = useState<number>(220);
  const [measuredForStep, setMeasuredForStep] = useState<number>(-1);
  const bubbleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Reset index when tour reactivates.
  useEffect(() => {
    if (active) setStepIndex(0);
  }, [active]);

  const step = steps[stepIndex];

  // Measure the target element on each step change + reposition on resize/scroll.
  useLayoutEffect(() => {
    if (!active || !step) return;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      setVp({ w: window.innerWidth, h: window.innerHeight });
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };

    // First measure immediately; then again after a tick (sidebar items can be
    // mounted after layout, drawer animations etc.).
    measure();
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 250);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step]);

  // Try to scroll the target into view when the step changes.
  useEffect(() => {
    if (!active || !step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
        /* old browsers — ignore */
      }
    }
  }, [active, step]);

  const handleNext = () => {
    if (stepIndex >= steps.length - 1) {
      onComplete();
    } else {
      setStepIndex((i) => i + 1);
    }
  };
  const handlePrev = () => setStepIndex((i) => Math.max(0, i - 1));

  // Compute bubble position from rect + viewport + measured bubble height.
  const bubblePos = useMemo(() => {
    if (!rect) return null;
    const bubbleW = Math.min(360, vp.w - 24);
    const placement = step?.placement;

    // Score each side; pick the one with the most room.
    const spaceTop = rect.top;
    const spaceBottom = vp.h - rect.bottom;
    const spaceLeft = rect.left;
    const spaceRight = vp.w - rect.right;

    let chosen: "top" | "bottom" | "left" | "right" = "bottom";
    if (placement) {
      chosen = placement;
    } else {
      const best = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
      if (best === spaceBottom) chosen = "bottom";
      else if (best === spaceTop) chosen = "top";
      else if (best === spaceRight) chosen = "right";
      else chosen = "left";
    }

    let top = 0;
    let left = 0;
    if (chosen === "bottom") {
      top = rect.bottom + BUBBLE_GAP;
      left = rect.left + rect.width / 2 - bubbleW / 2;
    } else if (chosen === "top") {
      top = rect.top - bubbleH - BUBBLE_GAP;
      left = rect.left + rect.width / 2 - bubbleW / 2;
    } else if (chosen === "right") {
      top = rect.top + rect.height / 2 - bubbleH / 2;
      left = rect.right + BUBBLE_GAP;
    } else {
      top = rect.top + rect.height / 2 - bubbleH / 2;
      left = rect.left - bubbleW - BUBBLE_GAP;
    }

    // Clamp to viewport with real bubble height. If the bubble is taller than
    // the viewport itself we cap top at 12 so at least the header is visible
    // (the bubble has internal overflow scrolling as a final fallback).
    const minTop = 12;
    const maxTop = Math.max(minTop, vp.h - bubbleH - 12);
    top = clamp(top, minTop, maxTop);
    left = clamp(left, 12, Math.max(12, vp.w - bubbleW - 12));
    return { top, left, width: bubbleW, side: chosen };
  }, [rect, vp, step, bubbleH]);

  // After the bubble paints, read its real height and re-clamp position.
  // Marks the step as measured so the bubble can flip from hidden -> visible.
  useLayoutEffect(() => {
    if (!active || !rect) return;
    const el = bubbleRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (h > 0 && h !== bubbleH) {
      setBubbleH(h);
    }
    if (measuredForStep !== stepIndex) {
      setMeasuredForStep(stepIndex);
    }
  }, [active, rect, stepIndex, bubbleH, measuredForStep]);

  if (!mounted || !active || !step) return null;

  // Target missing — show a centered fallback so the tour doesn't silently stall.
  const targetVisible = rect !== null && rect.width > 0 && rect.height > 0;

  const overlay = (
    <div className="fixed inset-0 z-[9999]" aria-modal="true" role="dialog">
      {/* Spotlight cut-out via 4 dark panels around the target. If no target, use
          one full-screen dim panel. */}
      {targetVisible ? (
        <>
          <div
            className="fixed bg-black/55 transition-all duration-200"
            style={{ left: 0, top: 0, right: 0, height: Math.max(0, rect.top - SPOTLIGHT_PADDING) }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200"
            style={{
              left: 0,
              top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
              width: Math.max(0, rect.left - SPOTLIGHT_PADDING),
              height: rect.height + SPOTLIGHT_PADDING * 2,
            }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200"
            style={{
              left: rect.right + SPOTLIGHT_PADDING,
              top: Math.max(0, rect.top - SPOTLIGHT_PADDING),
              right: 0,
              height: rect.height + SPOTLIGHT_PADDING * 2,
            }}
          />
          <div
            className="fixed bg-black/55 transition-all duration-200"
            style={{
              left: 0,
              top: rect.bottom + SPOTLIGHT_PADDING,
              right: 0,
              bottom: 0,
            }}
          />
          {/* The bright ring around the highlighted element. */}
          <div
            className="fixed rounded-lg ring-4 ring-[#23D2E2] ring-offset-2 pointer-events-none transition-all duration-200"
            style={{
              left: rect.left - SPOTLIGHT_PADDING,
              top: rect.top - SPOTLIGHT_PADDING,
              width: rect.width + SPOTLIGHT_PADDING * 2,
              height: rect.height + SPOTLIGHT_PADDING * 2,
            }}
          />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/55" />
      )}

      {/* Bubble — hidden on the first paint after a step change until we've
          measured its real height; that lets useMemo above re-clamp `top`
          before the user sees an off-screen frame. */}
      <div
        ref={bubbleRef}
        className="fixed rounded-xl bg-white p-5 shadow-2xl overflow-y-auto"
        style={
          targetVisible && bubblePos
            ? {
                top: bubblePos.top,
                left: bubblePos.left,
                width: bubblePos.width,
                maxHeight: "calc(100vh - 24px)",
                visibility: measuredForStep === stepIndex ? "visible" : "hidden",
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 360,
                maxHeight: "calc(100vh - 24px)",
              }
        }
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-[#615DFA]">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-gray-500 underline hover:text-gray-700"
          >
            Skip tour
          </button>
        </div>
        <h3 className="mb-2 text-base font-bold text-foreground">{step.title}</h3>
        <p className="text-sm text-muted-foreground">{step.body}</p>
        {step.cantDo && step.cantDo.length > 0 && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="mb-1 text-xs font-bold uppercase tracking-wide text-red-700">
              You can't
            </div>
            <ul className="list-disc space-y-1 pl-5 text-xs text-red-700">
              {step.cantDo.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={stepIndex === 0}
            className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="rounded-md bg-[#615DFA] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#5048E5]"
          >
            {stepIndex === steps.length - 1 ? "Got it" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
