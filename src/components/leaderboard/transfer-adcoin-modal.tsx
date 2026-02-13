"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { FloatingSelect } from "@/components/ui/floating-select";
import type { TransferParticipant } from "@/data/users";

interface TransferAdcoinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: TransferParticipant[];
  recipientId?: string | null;
  onSubmit: (data: TransferFormData) => Promise<void>;
}

export interface TransferFormData {
  senderId: string;
  recipientId: string;
  senderType: "student" | "user";
  recipientType: "student" | "user";
  transactionType: "transfer" | "earned" | "adjusted";
  amount: number;
  message: string;
  password: string;
}

const TRANSACTION_TYPES = [
  { value: "transfer", label: "Transfer" },
  { value: "earned", label: "Earned" },
  { value: "adjusted", label: "Adjusted" },
];

export function TransferAdcoinModal({
  open,
  onOpenChange,
  participants,
  recipientId: initialRecipientId,
  onSubmit,
}: TransferAdcoinModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [recipientId, setRecipientId] = useState("");
  const [transactionType, setTransactionType] = useState<"transfer" | "earned" | "adjusted">("transfer");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Get participant options for dropdowns (with ID and balance)
  const participantOptions = useMemo(() => {
    return participants.map((p) => ({
      value: p.id,
      label: p.name,
      meta: {
        name: p.name,
        id: p.id.slice(0, 8),
        balance: p.adcoinBalance,
        type: p.type,
      },
    }));
  }, [participants]);

  // Get selected sender details (for balance validation)
  const selectedSender = useMemo(() => {
    return participants.find((p) => p.id === senderId);
  }, [participants, senderId]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setSenderId("");
      setRecipientId(initialRecipientId ?? "");
      setTransactionType("transfer");
      setAmount("");
      setMessage("");
      setPassword("");
      setError(null);
    }
  }, [open, initialRecipientId]);

  const handleSubmit = async () => {
    // Validation
    if (!senderId) {
      setError("Please select a sender");
      return;
    }
    if (!recipientId) {
      setError("Please select a receiver");
      return;
    }
    if (senderId === recipientId) {
      setError("Sender and receiver cannot be the same");
      return;
    }

    const parsedAmount = parseInt(amount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (transactionType === "transfer" && selectedSender && parsedAmount > selectedSender.adcoinBalance) {
      setError("Insufficient balance");
      return;
    }

    if (!password.trim()) {
      setError("Please enter your password to confirm");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get participant types
      const senderParticipant = participants.find((p) => p.id === senderId);
      const receiverParticipant = participants.find((p) => p.id === recipientId);

      await onSubmit({
        senderId,
        recipientId,
        senderType: senderParticipant?.type ?? "student",
        recipientType: receiverParticipant?.type ?? "student",
        transactionType,
        amount: parsedAmount,
        message: message.trim(),
        password: password.trim(),
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) return "Processing...";
    switch (transactionType) {
      case "transfer":
        return "Confirm Transfer";
      case "earned":
        return "Confirm Earned";
      case "adjusted":
        return "Confirm Adjustment";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Transfer Adcoin
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-8">
            {/* Sender Selection */}
            <FloatingSelect
              id="select-sender"
              label="Sender"
              placeholder="Choose sender..."
              searchable
              value={senderId}
              onChange={setSenderId}
              options={participantOptions}
            />

            {/* Receiver Selection */}
            <FloatingSelect
              id="select-receiver"
              label="Receiver"
              placeholder="Choose receiver..."
              searchable
              value={recipientId}
              onChange={setRecipientId}
              options={participantOptions}
            />

            {/* Transaction Type and Amount */}
            <div className="grid grid-cols-2 gap-4">
              <FloatingSelect
                id="select-transaction-type"
                label="Transaction Type"
                placeholder="Select type..."
                value={transactionType}
                onChange={(val) => setTransactionType(val as "transfer" | "earned" | "adjusted")}
                options={TRANSACTION_TYPES}
              />

              <FloatingInput
                id="adcoin-amount"
                label="Adcoin Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Message */}
            <FloatingInput
              id="message"
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {/* Password Confirmation */}
            <FloatingInput
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !senderId || !recipientId || !amount || !password}
              className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              Transfer adcoin between participants
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
