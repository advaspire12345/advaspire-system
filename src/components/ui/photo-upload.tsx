"use client";

import * as React from "react";
import { X, Loader2, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to check if URL/file is a PDF
const isPdf = (urlOrType: string) => {
  return (
    urlOrType.toLowerCase().endsWith(".pdf") ||
    urlOrType.includes("/pdf") ||
    urlOrType === "application/pdf"
  );
};

interface PendingFile {
  id: string;
  file: File;
  previewUrl: string;
  isPdf: boolean;
  status: "uploading" | "error";
  error?: string;
}

interface PhotoUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
  accept?: string;
}

export function PhotoUpload({
  value = [],
  onChange,
  maxFiles = 5,
  disabled = false,
  className,
  label = "Project Photos",
  accept = "image/jpeg,image/png,image/webp",
}: PhotoUploadProps) {
  const [pendingFiles, setPendingFiles] = React.useState<PendingFile[]>([]);
  const [uploadedFileNames, setUploadedFileNames] = React.useState<Set<string>>(new Set());
  // Track file types for proper preview (url -> isPdf)
  const [fileTypes, setFileTypes] = React.useState<Map<string, boolean>>(new Map());
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();

  // Check if a file should show PDF icon
  const shouldShowPdfIcon = (url: string) => {
    return fileTypes.get(url) || isPdf(url);
  };

  const isUploading = pendingFiles.some((f) => f.status === "uploading");

  // For maxFiles=1, always show the upload button to allow replacement
  const canUploadMore = (maxFiles === 1 || (value.length + pendingFiles.length) < maxFiles) && !disabled && !isUploading;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);

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

    // Create pending files with local preview
    const newPendingFiles: PendingFile[] = filesToUpload.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      file,
      previewUrl: isPdf(file.type) ? "" : URL.createObjectURL(file),
      isPdf: isPdf(file.type),
      status: "uploading" as const,
    }));

    setPendingFiles(newPendingFiles);

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/attendance/upload-photos", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Show detailed errors if available, otherwise show main error
        const errorMsg = result.details?.length > 0
          ? result.details.join(", ")
          : (result.error || "Upload failed");
        setError(errorMsg);
        setPendingFiles((prev) =>
          prev.map((f) => ({ ...f, status: "error" as const, error: errorMsg }))
        );
        return;
      }

      if (result.urls?.length > 0) {
        // Track file types for each uploaded URL
        const newFileTypes = new Map(fileTypes);
        result.urls.forEach((url: string, idx: number) => {
          const file = filesToUpload[idx];
          if (file) {
            newFileTypes.set(url, isPdf(file.type));
          }
        });
        setFileTypes(newFileTypes);

        // Clean up pending files
        setPendingFiles([]);

        // Revoke object URLs
        newPendingFiles.forEach((pf) => {
          if (pf.previewUrl) URL.revokeObjectURL(pf.previewUrl);
        });

        if (isReplaceMode) {
          // Replace mode: delete old photo and use new one
          const oldUrl = value[0];
          if (oldUrl) {
            fetch("/api/attendance/upload-photos", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: oldUrl }),
            }).catch(console.error);
            // Clean up old file type
            newFileTypes.delete(oldUrl);
            setFileTypes(newFileTypes);
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

        // Show any partial errors
        if (result.errors?.length > 0) {
          setError(result.errors.join(", "));
        }
      } else {
        const errorMsg = result.error || "No files were uploaded";
        setError(errorMsg);
        setPendingFiles((prev) =>
          prev.map((f) => ({ ...f, status: "error" as const, error: errorMsg }))
        );
      }
    } catch (err) {
      console.error("Upload error:", err);
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
      setPendingFiles((prev) =>
        prev.map((f) => ({ ...f, status: "error" as const, error: errorMsg }))
      );
    } finally {
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

    // Clean up file type tracking
    const newFileTypes = new Map(fileTypes);
    newFileTypes.delete(urlToRemove);
    setFileTypes(newFileTypes);

    onChange(value.filter((_, i) => i !== index));
  };

  const handleRemovePending = (id: string) => {
    setPendingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
    setError(null);
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <label className="block text-[#ADAFCA] font-bold text-xs mb-2">
          {label} {maxFiles > 1 && `(${value.length}/${maxFiles})`}
        </label>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {/* Uploaded File Previews */}
        {value.map((url, index) => (
          <div key={`${url}-${index}`} className="relative group">
            <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm group-hover:border-[#23D2E2] transition-all">
              {shouldShowPdfIcon(url) ? (
                <div className="w-full h-full bg-red-50 flex items-center justify-center">
                  <FileText size={24} className="text-red-500" />
                </div>
              ) : (
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="object-cover w-full h-full"
                />
              )}
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-sm shadow-lg border-2 border-gray-300 flex items-center justify-center hover:text-[#23D2E2] hover:border-[#23D2E2] transition-all opacity-0 group-hover:opacity-100"
                aria-label={`Remove file ${index + 1}`}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Pending File Previews (uploading or error) */}
        {pendingFiles.map((pf) => (
          <div key={pf.id} className="relative group">
            <div
              className={cn(
                "w-12 h-12 rounded-lg overflow-hidden border-2 shadow-sm transition-all",
                pf.status === "error"
                  ? "border-red-400"
                  : "border-gray-200 animate-pulse"
              )}
            >
              {pf.isPdf ? (
                <div className="w-full h-full bg-red-50 flex items-center justify-center relative">
                  <FileText size={24} className="text-red-500" />
                  {pf.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                  {pf.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <AlertCircle size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ) : pf.previewUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={pf.previewUrl}
                    alt="Uploading..."
                    className="object-cover w-full h-full"
                  />
                  {pf.status === "uploading" && (
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                  {pf.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                      <AlertCircle size={16} className="text-white" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                </div>
              )}
            </div>

            {pf.status === "error" && (
              <button
                type="button"
                onClick={() => handleRemovePending(pf.id)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-sm shadow-lg border-2 border-red-300 flex items-center justify-center text-red-500 hover:border-red-500 transition-all"
                aria-label="Remove failed upload"
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {canUploadMore && (
          <label
            htmlFor={inputId}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-[10px] select-none",
              "text-white bg-[#23D2E2] transition-all",
              "shadow-md border-2 border-transparent",
              "cursor-pointer hover:bg-[#18a9b8] hover:border-[#23D2E2]/50"
            )}
            title={`Upload files (max ${maxFiles})`}
          >
            <span className="text-xl font-bold">+</span>
          </label>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}

      {/* Hidden File Input */}
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
