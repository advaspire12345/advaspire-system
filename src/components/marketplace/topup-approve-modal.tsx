"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { notify } from "@/lib/notify";
import { approveTopupRequestAction } from "@/app/(dashboard)/marketplace/actions";
import type { TopupRequestRow } from "@/data/marketplace";

interface TopupApproveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TopupRequestRow | null;
  approverName: string;
  onApproved?: () => void;
}

export function TopupApproveModal({
  open,
  onOpenChange,
  request,
  approverName,
  onApproved,
}: TopupApproveModalProps) {
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setPassword("");
  }, [open]);

  if (!request) return null;

  const handleApprove = async () => {
    if (!password.trim()) {
      notify.error("Enter your password to confirm");
      return;
    }
    setSubmitting(true);
    try {
      const result = await approveTopupRequestAction({
        requestId: request.id,
        senderPassword: password,
      });
      if (!result.success) {
        notify.error("Approval failed", result.error);
        return;
      }
      notify.success("Top-up approved");
      onApproved?.();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0" floatingCloseButton>
        <div className="p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Approve Top-Up</DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <FloatingInput
              id="sender"
              label="Sender"
              value={approverName}
              readOnly
              disabled
            />
            <FloatingInput
              id="receiver"
              label="Receiver"
              value={request.pic}
              readOnly
              disabled
            />
            <FloatingInput
              id="type"
              label="Transaction Type"
              value="Top Up"
              readOnly
              disabled
            />
            <FloatingInput
              id="amount"
              label="Adcoin Amount"
              type="number"
              value={request.topUpAmount.toString()}
              readOnly
              disabled
            />
            <FloatingInput
              id="password"
              label="Sender Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />

            <Button
              onClick={handleApprove}
              disabled={submitting || !password.trim()}
              className="w-full h-[50px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold rounded-[10px] mt-2"
            >
              {submitting ? "Approving…" : "Approve Transfer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
