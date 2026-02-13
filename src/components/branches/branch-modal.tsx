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
import { FloatingSelect } from "@/components/ui/floating-select";
import { cn } from "@/lib/utils";
import type { BranchEntry, AdminOption } from "@/data/branches";

export type BranchModalMode = "add" | "edit" | "delete";

interface BranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BranchModalMode;
  record: BranchEntry | null;
  admins: AdminOption[];
  onAdd: (data: BranchFormData) => Promise<void>;
  onEdit: (data: BranchFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface BranchFormData {
  name: string;
  companyName: string | null;
  address: string | null;
  postcode: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  adminId: string | null;
}

export function BranchModal({
  open,
  onOpenChange,
  mode,
  record,
  admins,
  onAdd,
  onEdit,
  onDelete,
}: BranchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [adminId, setAdminId] = useState("");

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        setName("");
        setCompanyName("");
        setAddress("");
        setPhone("");
        setEmail("");
        setBankName("");
        setBankAccount("");
        setAdminId("");
      } else if (record) {
        setName(record.branchName);
        setCompanyName(record.branchCompany ?? "");
        setAddress(record.branchAddress ?? "");
        setPhone(record.branchPhone ?? "");
        setEmail(record.branchEmail ?? "");
        setBankName(record.bankName ?? "");
        setBankAccount(record.bankAccount ?? "");
        setAdminId(record.adminId ?? "");
      }
      setError(null);
    }
  }, [open, record, mode]);

  const handleSubmit = async () => {
    // Validation (only for add/edit)
    if (mode !== "delete") {
      if (!name.trim()) {
        setError("Please enter branch name");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: BranchFormData = {
        name: name.trim(),
        companyName: companyName.trim() || null,
        address: address.trim() || null,
        postcode: null,
        city: null,
        state: null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
        adminId: adminId || null,
      };

      if (mode === "delete") {
        await onDelete();
      } else if (mode === "add") {
        await onAdd(formData);
      } else {
        await onEdit(formData);
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadonly = mode === "delete";

  const getModalTitle = () => {
    if (mode === "add") return "Add Branch";
    if (mode === "delete") return "Delete Branch";
    return "Edit Branch";
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "add") return "Adding...";
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "add") return "Add Branch";
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "add") return "Create a new branch";
    if (mode === "delete") return "This action cannot be undone";
    return "Update branch details";
  };

  // For edit/delete mode, we need a record
  if (mode !== "add" && !record) return null;

  const adminOptions = admins.map((a) => ({
    value: a.id,
    label: a.name,
  }));

  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {getModalTitle()}
            </DialogTitle>
          </DialogHeader>

          {mode === "delete" && (
            <p className="text-sm text-muted-foreground mt-2">
              Are you sure you want to delete this branch? This action
              cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Branch Name */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={name}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Branch Name
                </label>
              </div>
            ) : (
              <FloatingInput
                id="name"
                label="Branch Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}

            {/* Company Name */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={companyName || "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Company Name
                </label>
              </div>
            ) : (
              <FloatingInput
                id="company-name"
                label="Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            )}

            {/* Address */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={address || "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Address
                </label>
              </div>
            ) : (
              <FloatingInput
                id="address"
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            )}

            {/* Phone and Email */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={phone || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Phone
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="phone"
                  label="Phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={email || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Email
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="email"
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </div>

            {/* Bank Name and Bank Account */}
            <div className="grid grid-cols-2 gap-4">
              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={bankName || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Bank Name
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="bank-name"
                  label="Bank Name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              )}

              {isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={bankAccount || "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Account No.
                  </label>
                </div>
              ) : (
                <FloatingInput
                  id="bank-account"
                  label="Account No."
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                />
              )}
            </div>

            {/* Admin Select */}
            {isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={admins.find((a) => a.id === adminId)?.name ?? "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  Admin
                </label>
              </div>
            ) : (
              <FloatingSelect
                id="admin"
                label="Admin"
                placeholder="Select admin..."
                value={adminId}
                onChange={setAdminId}
                options={adminOptions}
              />
            )}

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          <div className="mt-12">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={cn(
                "w-full h-[50px] text-white font-bold rounded-[10px]",
                mode === "delete" && "bg-[#fd434f] hover:bg-[#e03a45]",
                (mode === "add" || mode === "edit") &&
                  "bg-[#23D2E2] hover:bg-[#18a9b8]"
              )}
            >
              {getSubmitButtonText()}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              {getSubtitleText()}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
