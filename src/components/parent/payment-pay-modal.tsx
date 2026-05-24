"use client";

import { useState, useTransition } from "react";
import { X, CreditCard, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { cn } from "@/lib/utils";
import {
  createBillplzCheckoutAction,
  submitOfflineSlipAction,
} from "@/app/(parent)/parent/pay-actions";

interface PaymentPayModalProps {
  open: boolean;
  onClose: () => void;
  payment: {
    id: string;
    amount: number;
    studentName: string;
    description?: string | null;
  };
}

type Tab = "online" | "offline";

export function PaymentPayModal({ open, onClose, payment }: PaymentPayModalProps) {
  const [tab, setTab] = useState<Tab>("online");
  const [error, setError] = useState<string | null>(null);
  const [slipUrls, setSlipUrls] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handlePayOnline = () => {
    setError(null);
    startTransition(async () => {
      const res = await createBillplzCheckoutAction(payment.id);
      if (!res.success || !res.url) {
        setError(res.error ?? "Could not start payment.");
        return;
      }
      window.location.href = res.url;
    });
  };

  const handleSubmitOffline = () => {
    setError(null);
    if (slipUrls.length === 0) {
      setError("Please upload your payment slip first.");
      return;
    }
    startTransition(async () => {
      const res = await submitOfflineSlipAction(payment.id, slipUrls[0], note);
      if (!res.success) {
        setError(res.error ?? "Could not submit slip.");
        return;
      }
      onClose();
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg font-bold text-[#3e3f5e]">
            Pay RM{Number(payment.amount).toFixed(2)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          For <span className="font-medium text-foreground">{payment.studentName}</span>
          {payment.description ? ` — ${payment.description}` : ""}
        </p>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-gray-200">
          <button
            type="button"
            onClick={() => setTab("online")}
            className={cn(
              "pb-2 px-1 text-sm font-medium border-b-2 -mb-px",
              tab === "online"
                ? "border-[#23D2E2] text-[#23D2E2]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Pay Online
          </button>
          <button
            type="button"
            onClick={() => setTab("offline")}
            className={cn(
              "pb-2 px-1 text-sm font-medium border-b-2 -mb-px",
              tab === "offline"
                ? "border-[#23D2E2] text-[#23D2E2]"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            I Paid Offline
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {tab === "online" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 font-medium mb-1">
                <CreditCard className="h-4 w-4" />
                Pay via Billplz
              </div>
              <p className="text-xs text-muted-foreground">
                FPX online banking, debit / credit card, e-wallets, Atome and Grab
                PayLater (where available). Once paid, your receipt appears here
                automatically.
              </p>
            </div>
            <Button
              type="button"
              onClick={handlePayOnline}
              disabled={isPending}
              className="w-full h-12 bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold rounded-[10px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Opening checkout...
                </>
              ) : (
                <>Pay RM{Number(payment.amount).toFixed(2)} Online</>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <div className="flex items-center gap-2 font-medium mb-1">
                <Upload className="h-4 w-4" />
                Upload your payment slip
              </div>
              <p className="text-xs text-muted-foreground">
                After bank transfer or cash payment, upload the slip here. Staff
                will verify and confirm — your receipt becomes downloadable once
                approved.
              </p>
            </div>

            <PhotoUpload
              value={slipUrls}
              onChange={setSlipUrls}
              maxFiles={1}
              label="Payment Slip"
              accept="image/jpeg,image/png,image/webp,application/pdf"
            />

            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-[10px] border border-[#ADAFCA] px-3 py-2 text-sm focus:border-[#23D2E2] focus:outline-none"
                placeholder="e.g. Maybank reference 123456"
              />
            </div>

            <Button
              type="button"
              onClick={handleSubmitOffline}
              disabled={isPending || slipUrls.length === 0}
              className="w-full h-12 bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold rounded-[10px] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>Submit Slip</>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
