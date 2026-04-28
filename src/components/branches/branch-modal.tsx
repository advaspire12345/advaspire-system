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
import type { BranchEntry, CompanyOption } from "@/data/branches";
import type { BranchType, UserRole } from "@/db/schema";

export type BranchModalMode = "add" | "edit" | "delete";

interface BranchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: BranchModalMode;
  record: BranchEntry | null;
  companyOptions: CompanyOption[];
  existingBranches: BranchEntry[];
  userRole: UserRole;
  canCreateCompany: boolean;
  onAdd: (data: BranchFormData) => Promise<void>;
  onEdit: (data: BranchFormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export interface BranchFormData {
  name: string;
  type: BranchType;
  code: string | null;
  parentId: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  website: string | null;
  logoUrl: string | null;
  registrationNumber: string | null;
}

const TYPE_LABELS: Record<BranchType, string> = {
  company: "Company",
  hq: "HQ (Headquarters)",
  branch: "Branch",
};

export function BranchModal({
  open,
  onOpenChange,
  mode,
  record,
  companyOptions,
  existingBranches,
  userRole,
  canCreateCompany,
  onAdd,
  onEdit,
  onDelete,
}: BranchModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [type, setType] = useState<BranchType>("branch");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  // Compute next auto-code for hq/branch
  const getNextCode = (forParentId: string | null): string => {
    // Count existing hq + branch entries under the same parent company
    const siblings = existingBranches.filter(
      (b) => (b.type === "hq" || b.type === "branch") && b.parentId === forParentId
    );
    const nextNum = siblings.length + 1;
    return nextNum.toString().padStart(3, "0");
  };

  // Reset form when modal opens or record changes
  useEffect(() => {
    if (open) {
      if (mode === "add") {
        setType(canCreateCompany ? "branch" : "branch");
        setCode("");
        setName("");
        setParentId("");
        setAddress("");
        setCity("");
        setPhone("");
        setEmail("");
        setBankName("");
        setBankAccount("");
        setWebsite("");
        setLogoUrl("");
        setRegistrationNumber("");
      } else if (record) {
        setType(record.type);
        setCode(record.code ?? "");
        setName(record.branchName);
        setParentId(record.parentId ?? "");
        setAddress(record.branchAddress ?? "");
        setCity(record.city ?? "");
        setPhone(record.branchPhone ?? "");
        setEmail(record.branchEmail ?? "");
        setBankName(record.bankName ?? "");
        setBankAccount(record.bankAccount ?? "");
        setWebsite(record.website ?? "");
        setLogoUrl(record.logoUrl ?? "");
        setRegistrationNumber(record.registrationNumber ?? "");
      }
      setError(null);
    }
  }, [open, record, mode, canCreateCompany]);

  // Track if user has interacted with type/parent in add mode
  const [hasSelectedType, setHasSelectedType] = useState(false);

  // Reset interaction flag when modal opens
  useEffect(() => {
    if (open && mode === "add") {
      setHasSelectedType(false);
    }
  }, [open, mode]);

  // Auto-generate code for hq/branch when parent company is selected
  useEffect(() => {
    if (mode !== "add") return;
    if ((type === "hq" || type === "branch") && parentId) {
      setCode(getNextCode(parentId));
    } else if (hasSelectedType && type === "company") {
      setCode("");
    }
  }, [type, parentId, mode, hasSelectedType]);

  const handleSubmit = async () => {
    // Validation (only for add/edit)
    if (mode !== "delete") {
      if (!name.trim()) {
        setError("Please enter a name");
        return;
      }
      if ((type === "hq" || type === "branch") && !parentId) {
        setError("Please select a company");
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData: BranchFormData = {
        name: name.trim(),
        type,
        code: code.trim() || null,
        parentId: type !== "company" && parentId ? parentId : null,
        address: address.trim() || null,
        city: city.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
        website: type === "company" ? (website.trim() || null) : null,
        logoUrl: type === "company" ? (logoUrl.trim() || null) : null,
        registrationNumber: type === "company" ? (registrationNumber.trim() || null) : null,
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
    if (mode === "add") return "Add Entry";
    if (mode === "delete") return `Delete ${TYPE_LABELS[type]}`;
    return `Edit ${TYPE_LABELS[type]}`;
  };

  const getSubmitButtonText = () => {
    if (isSubmitting) {
      if (mode === "add") return "Adding...";
      if (mode === "delete") return "Deleting...";
      return "Saving...";
    }
    if (mode === "add") return "Add";
    if (mode === "delete") return "Confirm Delete";
    return "Save Changes";
  };

  const getSubtitleText = () => {
    if (mode === "add") return "Create a new company, HQ, or branch";
    if (mode === "delete") return "This action cannot be undone";
    return "Update details";
  };

  // For edit/delete mode, we need a record
  if (mode !== "add" && !record) return null;

  const companySelectOptions = companyOptions.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Type options depend on permissions
  const typeOptions = canCreateCompany
    ? [
        { value: "company", label: "Company" },
        { value: "hq", label: "HQ (Headquarters)" },
        { value: "branch", label: "Branch" },
      ]
    : [
        { value: "hq", label: "HQ (Headquarters)" },
        { value: "branch", label: "Branch" },
      ];

  const readonlyFieldClass = "bg-muted/50 cursor-not-allowed opacity-70";

  // Whether to show the parent company dropdown
  const showParentCompany = type === "hq" || type === "branch";

  // Admin editing their own company: hide type selector and city/area
  const isAdminEditingCompany = mode === "edit" && type === "company" && userRole === "group_admin";

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
              Are you sure you want to delete this {TYPE_LABELS[type].toLowerCase()}? This action
              cannot be undone.
            </p>
          )}

          <div className="space-y-5 mt-8">
            {/* Type + Code Row */}
            {!isAdminEditingCompany && (
              <div className="grid grid-cols-2 gap-3">
                {isReadonly ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={TYPE_LABELS[type]}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Type
                    </label>
                  </div>
                ) : (
                  <FloatingSelect
                    id="type"
                    label="Type"
                    placeholder="Select type..."
                    value={type}
                    onChange={(val) => { setType(val as BranchType); setHasSelectedType(true); }}
                    options={typeOptions}
                  />
                )}

                <FloatingInput
                  id="code"
                  label="Code"
                  value={mode === "add" && type !== "company" && !parentId ? "" : code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  disabled={isReadonly || type === "hq" || type === "branch" || (mode === "add" && type !== "company" && !parentId)}
                />
              </div>
            )}

            {/* Parent Company - for HQ and Branch */}
            {showParentCompany && (
              isReadonly ? (
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={companyOptions.find((c) => c.id === parentId)?.name ?? "-"}
                    className={cn(
                      "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                      readonlyFieldClass
                    )}
                  />
                  <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                    Company
                  </label>
                </div>
              ) : (
                <FloatingSelect
                  id="parent-company"
                  label="Company"
                  placeholder="Select company..."
                  value={parentId}
                  onChange={setParentId}
                  options={companySelectOptions}
                />
              )
            )}

            {/* Name */}
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
                  Name
                </label>
              </div>
            ) : (
              <FloatingInput
                id="name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
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

            {/* City/Area - hidden for admin editing company */}
            {!isAdminEditingCompany && (isReadonly ? (
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={city || "-"}
                  className={cn(
                    "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                    readonlyFieldClass
                  )}
                />
                <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                  City/Area
                </label>
              </div>
            ) : (
              <FloatingInput
                id="city"
                label="City/Area"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            ))}

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

            {/* Company-specific fields */}
            {type === "company" && (
              <>
                {isReadonly ? (
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={website || "-"}
                      className={cn(
                        "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                        readonlyFieldClass
                      )}
                    />
                    <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                      Website
                    </label>
                  </div>
                ) : (
                  <FloatingInput
                    id="website"
                    label="Website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={logoUrl || "-"}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Logo URL
                      </label>
                    </div>
                  ) : (
                    <FloatingInput
                      id="logo-url"
                      label="Logo URL"
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                    />
                  )}

                  {isReadonly ? (
                    <div className="relative">
                      <input
                        type="text"
                        readOnly
                        value={registrationNumber || "-"}
                        className={cn(
                          "peer w-full h-[58px] rounded-[10px] border border-[#ADAFCA] px-4 text-base font-bold text-foreground",
                          readonlyFieldClass
                        )}
                      />
                      <label className="pointer-events-none absolute -top-2.5 left-3 bg-white px-1 text-xs font-bold text-[#ADAFCA]">
                        Registration No.
                      </label>
                    </div>
                  ) : (
                    <FloatingInput
                      id="registration-number"
                      label="Registration No."
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                    />
                  )}
                </div>
              </>
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
