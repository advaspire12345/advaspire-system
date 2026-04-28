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
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  photo: string | null;
  coverPhoto: string | null;
  cvUrl: string | null;
}

export interface ProfileFormPayload {
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  currentPassword: string;
  newPassword: string;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  cvUrl: string | null;
}

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData | null;
  onSave: (payload: ProfileFormPayload) => Promise<{ success: boolean; error?: string }>;
}

export function ProfileModal({
  open,
  onOpenChange,
  profile,
  onSave,
}: ProfileModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form when modal opens with profile data
  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setCity(profile.city || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPhotoUrls(profile.photo ? [profile.photo] : []);
      setError(null);
      setSuccessMsg(null);
    }
  }, [open, profile]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

    // Validate
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // If changing password, validate
    if (newPassword || confirmPassword) {
      if (!currentPassword) {
        setError("Current password is required to set a new password");
        return;
      }
      if (newPassword.length < 6) {
        setError("New password must be at least 6 characters");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New password and confirmation do not match");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const result = await onSave({
        name: name.trim(),
        email,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        currentPassword,
        newPassword,
        photoUrl: photoUrls[0] ?? null,
        coverPhotoUrl: null,
        cvUrl: null,
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

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0" floatingCloseButton>
        <div className="max-h-[90vh] overflow-y-auto">
          {/* Cover + Avatar Header */}
          <div className="relative">
            <div className="h-28 bg-gradient-to-r from-[#615DFA] to-[#23D2E2] rounded-t-lg" />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
              <div className="relative">
                <HexagonAvatar
                  size={80}
                  imageUrl={photoUrls[0] ?? undefined}
                  percentage={0.9}
                  fallbackInitials={name.charAt(0)}
                  cornerRadius={10}
                />
                <div className="absolute -bottom-1 -right-1 z-10">
                  <HexagonNumberBadge value={1} size={28} />
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 pt-12 pb-8 space-y-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-center">
                Edit Profile
              </DialogTitle>
            </DialogHeader>

            {/* Avatar Upload */}
            <div className="flex justify-center">
              <PhotoUpload
                label="Change Photo"
                value={photoUrls}
                onChange={setPhotoUrls}
                maxFiles={1}
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <FloatingInput
                id="profile-name"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <FloatingInput
                id="profile-email"
                label="Email"
                type="email"
                value={email}
                disabled
              />

              <FloatingInput
                id="profile-phone"
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <FloatingInput
                id="profile-address"
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <FloatingInput
                id="profile-city"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            {/* Password Section */}
            <div className="pt-2 border-t">
              <p className="text-sm font-bold text-muted-foreground mb-3">Change Password</p>
              <div className="space-y-4">
                <FloatingInput
                  id="profile-current-password"
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />

                <FloatingInput
                  id="profile-new-password"
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />

                <FloatingInput
                  id="profile-confirm-password"
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {successMsg}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
