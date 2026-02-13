"use client";

import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function PhotoUpload({
  value = [],
  onChange,
  maxFiles = 5,
  disabled = false,
  className,
  label = "Project Photos",
}: PhotoUploadProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<Set<string>>(new Set());
  const inputId = React.useId();

  // For maxFiles=1, always show the upload button to allow replacement
  const canUploadMore = (maxFiles === 1 || value.length < maxFiles) && !disabled;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // For single file mode (maxFiles=1), replace existing photo
    const isReplaceMode = maxFiles === 1 && value.length > 0;
    const remainingSlots = isReplaceMode ? 1 : maxFiles - value.length;

    // Filter out duplicates and limit to remaining slots
    const filesToUpload = Array.from(files)
      .filter((file) => !uploadedFileNames.has(file.name))
      .slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/attendance/upload-photos", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.urls?.length > 0) {
        if (isReplaceMode) {
          // Replace mode: delete old photo and use new one
          const oldUrl = value[0];
          if (oldUrl) {
            fetch("/api/attendance/upload-photos", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: oldUrl }),
            }).catch(console.error);
          }
          onChange(result.urls);
        } else {
          // Append mode: add to existing photos
          onChange([...value, ...result.urls]);
        }

        // Track uploaded file names to prevent duplicates
        const newFileNames = new Set(uploadedFileNames);
        filesToUpload.forEach((file) => newFileNames.add(file.name));
        setUploadedFileNames(newFileNames);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const urlToRemove = value[index];

    // Delete from storage (fire and forget)
    fetch("/api/attendance/upload-photos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlToRemove }),
    }).catch(console.error);

    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-[#ADAFCA] font-bold text-xs mb-2">
          {label} {maxFiles > 1 && `(${value.length}/${maxFiles})`}
        </label>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {/* Photo Previews */}
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative group">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm group-hover:border-[#23D2E2] transition-all">
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="object-cover w-full h-full"
              />
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-sm shadow-lg border-2 border-gray-300 flex items-center justify-center hover:text-[#23D2E2] hover:border-[#23D2E2] transition-all opacity-0 group-hover:opacity-100"
                aria-label={`Remove photo ${index + 1}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Upload Button - Always visible when can upload more */}
        {canUploadMore && (
          <label
            htmlFor={isUploading ? undefined : inputId}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-[10px] select-none",
              "text-white bg-[#23D2E2] transition-all",
              "shadow-md border-2 border-transparent",
              isUploading
                ? "opacity-70 cursor-wait"
                : "cursor-pointer hover:bg-[#18a9b8] hover:border-[#23D2E2]/50"
            )}
            title={isUploading ? "Uploading..." : `Upload photos (max ${maxFiles})`}
          >
            {isUploading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <span className="text-xl font-bold">+</span>
            )}
          </label>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
