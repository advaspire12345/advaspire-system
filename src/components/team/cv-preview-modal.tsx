"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface CvPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cvUrl: string;
  memberName: string;
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf') || url.includes('/pdf');
}

export function CvPreviewModal({
  open,
  onOpenChange,
  cvUrl,
  memberName,
}: CvPreviewModalProps) {
  const isPdf = isPdfUrl(cvUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl p-0 max-h-[95vh]" floatingCloseButton>
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              CV - {memberName}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-120px)] p-6 pt-4">
          {isPdf ? (
            <div className="flex flex-col items-center gap-4">
              <iframe
                src={cvUrl}
                className="w-full h-[60vh] rounded-lg border"
                title={`CV of ${memberName}`}
              />
              <Button
                variant="outline"
                onClick={() => window.open(cvUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Image
                src={cvUrl}
                alt={`CV of ${memberName}`}
                width={600}
                height={800}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
              <Button
                variant="outline"
                onClick={() => window.open(cvUrl, '_blank')}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
