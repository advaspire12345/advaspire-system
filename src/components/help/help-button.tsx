"use client";

import { useEffect, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingTrigger } from "@/hooks/use-onboarding-trigger";
import { TourOverlay } from "@/components/help/tour-overlay";
import { HelpDialog } from "@/components/help/help-dialog";
import { TOUR_STEPS } from "@/data/onboarding-tour";
import type { UserRole } from "@/db/schema";

interface HelpButtonProps {
  role: UserRole | null;
  userId: string | null;
  /** Extra classes for the button wrapper (color overrides, etc.). */
  className?: string;
  /**
   * Optional visible text rendered next to the icon. Used when the button is
   * placed inside a menu (e.g. the mobile settings dropdown) where an
   * icon-only control would be unclear.
   */
  label?: string;
}

/**
 * Help icon with split behaviour:
 *  - On the user's 1st and 2nd login (tracked in localStorage via
 *    useOnboardingTrigger) the tour overlay auto-fires after the pulse.
 *  - On every other click — including after the user dismisses the auto-tour
 *    — the icon opens the static instruction-list dialog instead of the tour.
 *  - The dialog has a "Re-take tour" button so users who want the spotlight
 *    walkthrough again can opt in.
 */
export function HelpButton({ role, userId, className, label }: HelpButtonProps) {
  const [tourActive, setTourActive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { shouldPulse, shouldAutoOpen, markSeen, resetAutoOpen } =
    useOnboardingTrigger(userId);

  // Auto-start the tour on first/second login, after the pulse delay.
  useEffect(() => {
    if (shouldAutoOpen && !tourActive) {
      setTourActive(true);
    }
  }, [shouldAutoOpen, tourActive]);

  const finishTour = () => {
    setTourActive(false);
    if (shouldAutoOpen) markSeen();
    else resetAutoOpen();
  };

  if (!role) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Help"
        title="Help"
        data-tour="help-button"
        onClick={() => setDialogOpen(true)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-foreground",
          shouldPulse &&
            "ring-2 ring-[#23D2E2]/80 ring-offset-2 animate-pulse",
          className,
        )}
      >
        <HelpCircle className="h-5 w-5" />
        {label && <span>{label}</span>}
      </button>
      <TourOverlay
        steps={TOUR_STEPS[role]}
        active={tourActive}
        onComplete={finishTour}
        onSkip={finishTour}
      />
      <HelpDialog
        role={role}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onRetakeTour={() => setTourActive(true)}
      />
    </>
  );
}
