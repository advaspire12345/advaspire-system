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
import { PhotoUpload } from "@/components/ui/photo-upload";
import { notify } from "@/lib/notify";
import { ADCOIN_PER_RM, adcoinFor, rmCostFor } from "@/data/marketplace-constants";
import { createTopupRequestAction } from "@/app/(dashboard)/marketplace/actions";

interface TopupRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Two-way bound input pair: editing one updates the other via ADCOIN_PER_RM.
// We track which side the user last edited so re-formatting doesn't fight the
// caret position when typing.
export function TopupRequestModal({ open, onOpenChange }: TopupRequestModalProps) {
  const [rmStr, setRmStr] = useState("");
  const [adcoinStr, setAdcoinStr] = useState("");
  const [receiptUrls, setReceiptUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setRmStr("");
      setAdcoinStr("");
      setReceiptUrls([]);
    }
  }, [open]);

  const handleRmChange = (value: string) => {
    setRmStr(value);
    const rm = Number(value);
    if (!Number.isFinite(rm) || rm <= 0) {
      setAdcoinStr("");
      return;
    }
    setAdcoinStr(String(adcoinFor(rm)));
  };

  const handleAdcoinChange = (value: string) => {
    setAdcoinStr(value);
    const adcoin = Number(value);
    if (!Number.isFinite(adcoin) || adcoin <= 0) {
      setRmStr("");
      return;
    }
    // Show RM with 2 decimals — fractional cents are normal at this rate
    setRmStr(rmCostFor(adcoin).toFixed(2));
  };

  const adcoin = Number(adcoinStr) || 0;
  const rmAmount = Number(rmStr) || 0;
  const receiptUrl = receiptUrls[0] ?? null;

  const handleSubmit = async () => {
    if (adcoin <= 0 || rmAmount <= 0) {
      notify.error("Enter a valid amount");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createTopupRequestAction({
        adcoinAmount: adcoin,
        receiptUrl,
      });
      if (!result.success) {
        notify.error("Request failed", result.error);
        return;
      }
      notify.success("Top-up request submitted", "Awaiting super admin approval");
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
            <DialogTitle className="text-xl font-bold">Exchange Adcoin</DialogTitle>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FloatingInput
                id="ringgit"
                label="Ringgit (RM)"
                type="number"
                min={0}
                step={0.01}
                value={rmStr}
                onChange={(e) => handleRmChange(e.target.value)}
              />
              <FloatingInput
                id="adcoin"
                label="Adcoin"
                type="number"
                min={1}
                step={1}
                value={adcoinStr}
                onChange={(e) => handleAdcoinChange(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Rate: RM 1 = {ADCOIN_PER_RM} adcoin
            </p>

            <PhotoUpload
              value={receiptUrls}
              onChange={setReceiptUrls}
              maxFiles={1}
              label="Receipt"
            />

            <Button
              onClick={handleSubmit}
              disabled={submitting || adcoin <= 0}
              className="w-full h-[50px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold rounded-[10px] mt-2"
            >
              {submitting ? "Submitting…" : "Exchange"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
