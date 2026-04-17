"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentWarningModalProps {
  negativeChildren: { name: string; sessionsRemaining: number }[];
}

export function PaymentWarningModal({
  negativeChildren,
}: PaymentWarningModalProps) {
  const [open, setOpen] = useState(true);

  if (!open || !negativeChildren.length) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-[#3e3f5e]">
              Payment Required
            </h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-[#8f91ac] hover:bg-gray-100 hover:text-[#3e3f5e] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Message */}
        <p className="text-sm text-[#8f91ac] mb-4">
          The following children have attended classes beyond their paid sessions.
          Please make a payment to continue.
        </p>

        {/* Children list */}
        <div className="space-y-2 mb-5">
          {negativeChildren.map((child) => (
            <div
              key={child.name}
              className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3"
            >
              <span className="text-sm font-semibold text-[#3e3f5e]">
                {child.name}
              </span>
              <span className="text-sm font-bold text-red-500">
                {child.sessionsRemaining} sessions
              </span>
            </div>
          ))}
        </div>

        {/* Action */}
        <Button
          onClick={() => setOpen(false)}
          className="w-full bg-[#615DFA] hover:bg-[#4b48d4] text-white font-bold"
        >
          I understand
        </Button>
      </div>
    </div>
  );
}
