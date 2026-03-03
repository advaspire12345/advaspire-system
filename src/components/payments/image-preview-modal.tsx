"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  title?: string;
}

export function ImagePreviewModal({
  open,
  onOpenChange,
  imageSrc,
  title = "Receipt Photo",
}: ImagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 max-h-[95vh]" floatingCloseButton>
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          </DialogHeader>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-6 pt-4 flex items-center justify-center">
          <Image
            src={imageSrc}
            alt={title}
            width={400}
            height={400}
            className="max-w-full max-h-[60vh] object-contain rounded-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
