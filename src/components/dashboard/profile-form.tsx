"use client";

import { useState, useEffect } from "react";
import { Upload } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floating-input";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";
import type { ProfileData, ProfileFormPayload } from "@/components/dashboard/profile-modal";

interface ProfileFormProps {
  profile: ProfileData;
  onSave: (payload: ProfileFormPayload) => Promise<{ success: boolean; error?: string }>;
}

// Upload field matching team modal style
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onChange(file);
  };

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
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
}

export function ProfileForm({ profile, onSave }: ProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [email] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone || "");
  const [address, setAddress] = useState(profile.address || "");
  const [city, setCity] = useState(profile.city || "");
  const [avatarImage, setAvatarImage] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(profile.photo);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(profile.coverPhoto);
  const [cvPhoto, setCvPhoto] = useState<string[]>(profile.cvUrl ? [profile.cvUrl] : []);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle avatar preview
  useEffect(() => {
    if (avatarImage) {
      const url = URL.createObjectURL(avatarImage);
      setAvatarPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarPreviewUrl(profile.photo);
    }
  }, [avatarImage, profile.photo]);

  // Handle cover preview
  useEffect(() => {
    if (coverImage) {
      const url = URL.createObjectURL(coverImage);
      setCoverPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setCoverPreviewUrl(profile.coverPhoto);
    }
  }, [coverImage, profile.coverPhoto]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

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
        photoUrl: profile.photo,
        coverPhotoUrl: profile.coverPhoto,
        cvUrl: cvPhoto[0] ?? null,
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
    <Card className="bg-white border-none shadow-none">
      <CardContent className="p-8 space-y-5">
        {/* Three-column: Preview | Cover Upload | Avatar Upload */}
        <div className="grid grid-cols-3 gap-4">
          {/* Preview column — cover + avatar card */}
          <div className="flex flex-col rounded-[10px] overflow-hidden bg-white border border-border min-h-[120px]">
            {/* Cover Image - top portion */}
            <div className="relative w-full h-[60px]">
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

            {/* Avatar + info */}
            <div className="relative flex flex-col items-center pt-8 pb-3">
              <div className="absolute -top-[30px] left-1/2 -translate-x-1/2">
                <div className="relative">
                  <HexagonAvatar
                    size={56}
                    imageUrl={avatarPreviewUrl ?? undefined}
                    percentage={0.5}
                    animated={true}
                    fallbackInitials={name ? name.charAt(0).toUpperCase() : "U"}
                    cornerRadius={8}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 z-10">
                    <HexagonNumberBadge value={1} size={22} />
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-foreground">{name || "Your Name"}</span>
              <span className="text-[10px] text-muted-foreground">{email}</span>
            </div>
          </div>

          {/* Cover Photo Upload */}
          <UploadImageField
            id="profile-cover-upload"
            label="Upload Cover"
            value={coverImage}
            onChange={setCoverImage}
          />

          {/* Profile Picture Upload */}
          <UploadImageField
            id="profile-avatar-upload"
            label="Upload Avatar"
            value={avatarImage}
            onChange={setAvatarImage}
          />
        </div>

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column — Personal Info */}
          <div className="space-y-5">
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

          {/* Right Column — Password */}
          <div className="space-y-5">
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

            <p className="text-xs text-muted-foreground">
              Leave password fields empty if you don&apos;t want to change your password.
            </p>
          </div>
        </div>

        {/* CV Document Upload */}
        <PhotoUpload
          value={cvPhoto}
          onChange={setCvPhoto}
          maxFiles={1}
          label="CV Document"
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />

        {/* Messages */}
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

        {/* Save Button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-[50px] text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
        <span className="text-center block text-xs text-muted-foreground">
          Update your personal information and password
        </span>
      </CardContent>
    </Card>
  );
}
