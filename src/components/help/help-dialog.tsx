"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TOUR_STEPS } from "@/data/onboarding-tour";
import type { UserRole } from "@/db/schema";

const ROLE_DISPLAY_NAME: Record<UserRole, string> = {
  super_admin: "Super Admin",
  group_admin: "Group Admin",
  company_admin: "Company Admin",
  assistant_admin: "Assistant Admin",
  instructor: "Instructor",
  parent: "Parent",
  student: "Student",
};

interface HelpDialogProps {
  role: UserRole;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional callback when the user wants to re-take the tour from the dialog. */
  onRetakeTour?: () => void;
}

export function HelpDialog({ role, open, onOpenChange, onRetakeTour }: HelpDialogProps) {
  const allSteps = TOUR_STEPS[role];
  // Skip the first step (it's the help-button intro — doesn't read as an
  // instruction in a static list).
  const items = allSteps.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>How to use Advaspire — {ROLE_DISPLAY_NAME[role]}</DialogTitle>
          <DialogDescription>
            A summary of what each part of the system does for you. Click any
            time you forget; this list always opens here.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-4 space-y-4">
          {items.map((step, i) => (
            <li
              key={i}
              className="rounded-xl border border-gray-200 bg-white p-4"
            >
              <div className="mb-1 flex items-baseline gap-2">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#615DFA] text-xs font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="text-sm font-bold text-foreground">{step.title}</h3>
              </div>
              <p className="mt-1 pl-8 text-sm text-muted-foreground">{step.body}</p>
              {step.cantDo && step.cantDo.length > 0 && (
                <div className="ml-8 mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                  <div className="mb-1 text-xs font-bold uppercase tracking-wide text-red-700">
                    You can't
                  </div>
                  <ul className="list-disc space-y-1 pl-5 text-xs text-red-700">
                    {step.cantDo.map((c, j) => (
                      <li key={j}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ol>

        <DialogFooter className="mt-4 flex-row justify-between sm:justify-between">
          {onRetakeTour && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onRetakeTour();
              }}
            >
              Re-take tour
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
