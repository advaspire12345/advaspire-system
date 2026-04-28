"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { cn } from "@/lib/utils";
import type { ParentProfileData, ParentProfilePayload } from "@/app/(parent)/parent/profile-actions";

interface ParentProfileFormProps {
  profile: ParentProfileData;
  onSave: (payload: ParentProfilePayload) => Promise<{ success: boolean; error?: string }>;
}

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

export function ParentProfileForm({ profile, onSave }: ParentProfileFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [postcode, setPostcode] = useState(profile.postcode || "");
  const [city, setCity] = useState(profile.city || "");
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.photo);
  const [coverPreview, setCoverPreview] = useState<string | null>(profile.coverPhoto);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (avatarImage) {
      const url = URL.createObjectURL(avatarImage);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarPreview(profile.photo);
    }
  }, [avatarImage, profile.photo]);

  useEffect(() => {
    if (coverImage) {
      const url = URL.createObjectURL(coverImage);
      setCoverPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreview(profile.coverPhoto);
    }
  }, [coverImage, profile.coverPhoto]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

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
    <div className="rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Cover */}
      <div className="relative h-40 md:h-52 w-full">
        {coverPreview ? (
          <Image src={coverPreview} alt="Cover" fill className="object-cover" priority />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: "linear-gradient(135deg, #615DFA 0%, #23D2E2 50%, #614BDD 100%)" }}
          />
        )}
      </div>

      <div className="px-6 md:px-8 pt-4 pb-8">
        {/* Three-column: Preview | Cover Upload | Avatar Upload */}
        <div className="grid grid-cols-3 gap-4 -mt-14">
          {/* Preview */}
          <div className="flex flex-col rounded-xl bg-white border border-border min-h-[120px] overflow-hidden">
            <div className="relative w-full h-[50px]">
              {coverPreview ? (
                <Image src={coverPreview} alt="Cover" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-[#23D2E2]/20 to-[#614BDD]/20" />
              )}
            </div>
            <div className="relative flex flex-col items-center pt-8 pb-3">
              <div className="absolute -top-[25px] left-1/2 -translate-x-1/2">
                <HexagonAvatar
                  size={48}
                  imageUrl={avatarPreview ?? undefined}
                  percentage={0.5}
                  fallbackInitials={profile.name.charAt(0).toUpperCase()}
                  cornerRadius={6}
                />
              </div>
              <span className="text-xs font-bold text-foreground">{profile.name}</span>
              <span className="text-[10px] text-muted-foreground">{profile.email}</span>
            </div>
          </div>

          <UploadImageField
            id="parent-cover-upload"
            label="Upload Cover"
            value={coverImage}
            onChange={setCoverImage}
          />

          <UploadImageField
            id="parent-avatar-upload"
            label="Upload Avatar"
            value={avatarImage}
            onChange={setAvatarImage}
          />
        </div>

        {/* Form */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — Contact Info */}
          <div className="space-y-5">
            <FloatingInput
              id="parent-name"
              label="Full Name"
              value={profile.name}
              disabled
            />

            <FloatingInput
              id="parent-email"
              label="Email"
              type="email"
              value={profile.email}
              disabled
            />

            <FloatingInput
              id="parent-phone"
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <FloatingInput
              id="parent-address"
              label="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <FloatingInput
                id="parent-postcode"
                label="Postcode"
                value={postcode}
                onChange={(e) => setPostcode(e.target.value)}
              />
              <FloatingInput
                id="parent-city"
                label="City"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          {/* Right — Password */}
          <div className="space-y-5">
            <FloatingInput
              id="parent-current-pw"
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />

            <FloatingInput
              id="parent-new-pw"
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <FloatingInput
              id="parent-confirm-pw"
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <p className="text-xs text-muted-foreground">
              Leave password fields empty if you don&apos;t want to change your password.
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mt-6 rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="h-[50px] px-12 text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/parent")}
            className="h-[50px] px-8 font-bold rounded-[10px]"
          >
            Back
          </Button>
        </div>
      </div>
    </div>
  );
}
