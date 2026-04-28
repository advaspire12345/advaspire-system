"use client";

import { useState, useEffect } from "react";
import { Upload, Settings } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";
import type { ParentProfileData, ParentProfilePayload } from "@/app/(parent)/parent/profile-actions";

interface ParentProfileHeaderProps {
  parentName: string;
  parentEmail?: string | null;
  parentPhoto?: string | null;
  coverPhoto?: string | null;
  childrenCount: number;
  totalSessions: number;
  totalAttended: number;
  nextClass?: { date: string; startTime: string | null; dayOfWeek: string | null } | null;
  profile: ParentProfileData;
  onSaveProfile: (payload: ParentProfilePayload) => Promise<{ success: boolean; error?: string }>;
}

export function ParentProfileHeader({
  parentName,
  parentEmail,
  parentPhoto,
  coverPhoto,
  childrenCount,
  totalSessions,
  totalAttended,
  nextClass,
  profile,
  onSaveProfile,
}: ParentProfileHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const formatNextClass = () => {
    if (!nextClass) return "No upcoming class";
    const day = nextClass.dayOfWeek
      ? nextClass.dayOfWeek.charAt(0).toUpperCase() + nextClass.dayOfWeek.slice(1, 3)
      : "";
    const time = nextClass.startTime
      ? nextClass.startTime.split(":").slice(0, 2).join(":")
      : "";
    return day && time ? `${day}, ${time}` : day || time || nextClass.date;
  };

  return (
    <>
      <div className="relative rounded-xl overflow-hidden bg-white shadow-sm">
        {/* Cover Image */}
        <div
          className="h-40 md:h-52 w-full bg-cover bg-center"
          style={{
            background: coverPhoto
              ? `url(${coverPhoto}) center center / cover no-repeat`
              : "linear-gradient(135deg, #615DFA 0%, #23D2E2 50%, #614BDD 100%)",
          }}
        />

        {/* Profile Info Section */}
        <div className="relative px-6 pt-4 pb-5">
          {/* Mobile: centered layout */}
          <div className="flex flex-col items-center -mt-16 md:hidden">
            <HexagonAvatar
              size={120}
              imageUrl={parentPhoto ?? undefined}
              percentage={0.9}
              animated={false}
              fallbackInitials={parentName.charAt(0).toUpperCase()}
              cornerRadius={12}
            />

            <h1 className="mt-3 text-xl font-bold text-foreground">{parentName}</h1>
            {parentEmail && <p className="text-sm text-muted-foreground">{parentEmail}</p>}

            <div className="flex items-center justify-center gap-6 mt-5 flex-wrap">
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#615DFA]">{childrenCount}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Children</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#23D2E2]">{totalSessions}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessions</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-green-500">{totalAttended}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attended</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#F17521]">{formatNextClass()}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Class</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <Button
                onClick={() => setModalOpen(true)}
                size="icon"
                className="h-[40px] w-[40px] rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Desktop: avatar left, name middle, stats right */}
          <div className="hidden md:flex items-end -mt-14 gap-5">
            <div className="shrink-0">
              <HexagonAvatar
                size={120}
                imageUrl={parentPhoto ?? undefined}
                percentage={0.9}
                animated={false}
                fallbackInitials={parentName.charAt(0).toUpperCase()}
                cornerRadius={12}
              />
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[80px]">
              <h1 className="text-2xl font-bold text-foreground truncate">{parentName}</h1>
              {parentEmail && <p className="text-sm text-muted-foreground truncate">{parentEmail}</p>}
            </div>

            <div className="flex items-center gap-8 shrink-0 min-h-[80px]">
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#615DFA]">{childrenCount}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Children</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#23D2E2]">{totalSessions}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sessions</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-green-500">{totalAttended}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attended</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex flex-col items-center">
                <p className="text-xl font-bold text-[#F17521]">{formatNextClass()}</p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Next Class</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <Button
                onClick={() => setModalOpen(true)}
                size="icon"
                className="h-[44px] w-[44px] rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8] text-white"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        profile={profile}
        onSave={onSaveProfile}
      />
    </>
  );
}

// ============================================
// Upload Image Field (matching team modal)
// ============================================

function UploadImageField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: File | null;
  onChange: (file: File | null) => void;
  id: string;
}) {
  return (
    <div
      className={cn(
        "group flex flex-1 items-start justify-center rounded-xl bg-white border border-border",
        "transition-all duration-300 hover:-translate-y-0.5",
        "hover:shadow-[0_2px_20px_rgba(173,175,202,0.2)] hover:border-[#23D2E2]/50",
        "min-h-[100px] py-4 px-3",
      )}
    >
      <label
        htmlFor={id}
        className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-center"
      >
        <Upload
          size={24}
          className={cn(
            "text-[#ADAFCA] mb-1.5 transition-all duration-300",
            "group-hover:text-[#23D2E2]",
          )}
        />
        <span className="text-sm font-bold text-foreground">{label}</span>
        {value && (
          <span className="text-xs text-[#23D2E2] mt-1 font-medium">
            ✓ {value.name}
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          id={id}
          onChange={(e) => onChange(e.target.files?.[0] || null)}
          className="hidden"
        />
      </label>
    </div>
  );
}

// ============================================
// Profile Edit Modal (matching team modal design)
// ============================================

function ProfileEditModal({
  open,
  onOpenChange,
  profile,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ParentProfileData;
  onSave: (payload: ParentProfilePayload) => Promise<{ success: boolean; error?: string }>;
}) {
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [postcode, setPostcode] = useState("");
  const [city, setCity] = useState("");
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setPostcode(profile.postcode || "");
      setCity(profile.city || "");
      setAvatarImage(null);
      setCoverImage(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccessMsg(null);
    }
  }, [open, profile]);

  // Avatar preview
  useEffect(() => {
    if (avatarImage) {
      const url = URL.createObjectURL(avatarImage);
      setAvatarPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (profile.photo) {
      setAvatarPreviewUrl(profile.photo);
    } else {
      setAvatarPreviewUrl(null);
    }
  }, [avatarImage, profile.photo]);

  // Cover preview
  useEffect(() => {
    if (coverImage) {
      const url = URL.createObjectURL(coverImage);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (profile.coverPhoto) {
      setCoverPreviewUrl(profile.coverPhoto);
    } else {
      setCoverPreviewUrl(null);
    }
  }, [coverImage, profile.coverPhoto]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

    if (newPassword || confirmPassword) {
      if (!currentPassword) { setError("Current password is required to set a new password"); return; }
      if (newPassword.length < 6) { setError("New password must be at least 6 characters"); return; }
      if (newPassword !== confirmPassword) { setError("New password and confirmation do not match"); return; }
    }

    setIsSubmitting(true);
    try {
      const result = await onSave({
        phone: phone.trim() || null,
        address: address.trim() || null,
        postcode: postcode.trim() || null,
        city: city.trim() || null,
        photo: profile.photo,
        coverPhoto: profile.coverPhoto,
        currentPassword,
        newPassword,
      });

      if (!result.success) {
        setError(result.error || "Failed to update profile");
      } else {
        setSuccessMsg("Profile updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto p-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-8">
            {/* Profile Preview — same as team modal */}
            <div className="flex flex-col rounded-[10px] overflow-hidden bg-white h-[120px] border border-border">
              {/* Cover Image - 3/5 height */}
              <div className="relative w-full h-[60%]">
                {coverPreviewUrl ? (
                  <Image
                    src={coverPreviewUrl}
                    alt="Cover Preview"
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-[#23D2E2]/20 to-[#614BDD]/20" />
                )}
              </div>

              {/* Bottom section - 2/5 height */}
              <div className="relative bg-white">
                {/* Avatar Overlay - positioned at the boundary */}
                <div className="absolute left-1/2 -translate-x-1/2 -top-[60px]">
                  <div className="relative">
                    <HexagonAvatar
                      size={100}
                      imageUrl={avatarPreviewUrl ?? undefined}
                      percentage={0.5}
                      animated={true}
                      fallbackInitials={profile.name.charAt(0).toUpperCase()}
                    />
                    <div className="absolute bottom-2 right-1 z-10">
                      <HexagonNumberBadge value={1} size={32} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Avatar and Cover — same as team modal */}
            <div className="grid grid-cols-2 gap-4">
              <UploadImageField
                id="parent-modal-avatar-upload"
                label="Upload Avatar"
                value={avatarImage}
                onChange={setAvatarImage}
              />
              <UploadImageField
                id="parent-modal-cover-upload"
                label="Upload Cover"
                value={coverImage}
                onChange={setCoverImage}
              />
            </div>

            {/* Fields */}
            <FloatingInput id="modal-name" label="Full Name" value={profile.name} disabled />
            <FloatingInput id="modal-email" label="Email" value={profile.email} disabled />
            <FloatingInput id="modal-phone" label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <FloatingInput id="modal-address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <FloatingInput id="modal-postcode" label="Postcode" value={postcode} onChange={(e) => setPostcode(e.target.value)} />
              <FloatingInput id="modal-city" label="City" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>

            {/* Password */}
            <div className="pt-2 border-t">
              <p className="text-sm font-bold text-muted-foreground mb-3">Change Password</p>
              <div className="space-y-4">
                <FloatingInput id="modal-cur-pw" label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                <FloatingInput id="modal-new-pw" label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <FloatingInput id="modal-confirm-pw" label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            {error && <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
            {successMsg && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{successMsg}</div>}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <span className="text-center block mt-2 text-xs text-muted-foreground">
              Update your personal information and password
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
