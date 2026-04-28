"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CertificatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  courseName: string;
  examLevel: number;
  mark: number | null;
  examinerName: string | null;
  companyAdminName: string | null;
  companyName: string | null;
  examDate: string;
  certificateNumber: string | null;
}

export function CertificatePreviewModal({
  open,
  onOpenChange,
  studentName,
  courseName,
  examLevel,
  mark,
  examinerName,
  companyAdminName,
  companyName,
  examDate,
  certificateNumber,
}: CertificatePreviewModalProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!certRef.current) return;

    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas-pro")).default;
      const jsPDF = (await import("jspdf")).default;

      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`certificate-${certificateNumber || "download"}.pdf`);
    } catch (error) {
      console.error("Error downloading certificate:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formattedDate = (() => {
    try {
      const d = new Date(examDate);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return examDate;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] p-0 max-h-[95vh]" floatingCloseButton>
        <div className="p-6 pb-0 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Certificate Preview</DialogTitle>
          </DialogHeader>
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-[#23D2E2] hover:bg-[#18a9b8] text-white font-bold"
          >
            <Download className="h-4 w-4 mr-2" />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-6 pt-4">
          {/* Certificate: background template image + overlaid text */}
          <div
            ref={certRef}
            style={{
              width: "842px",
              height: "595px",
              margin: "0 auto",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Template background image */}
            <img
              src="/cert-template.png"
              alt="Certificate Template"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              crossOrigin="anonymous"
            />

            {/* Student name — positioned on the line below "This is to certify that" */}
            <div
              style={{
                position: "absolute",
                top: "313px",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: 600,
                  color: "#1a1a1a",
                  fontFamily: "'Arial Black', 'Impact', sans-serif",
                  whiteSpace: "nowrap",
                  textTransform: "uppercase",
                  letterSpacing: "3px",
                }}
              >
                {studentName}
              </div>
            </div>

            {/* Course name — positioned right under "successfully completed the course" */}
            <div
              style={{
                position: "absolute",
                top: "378px",
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 900,
                  color: "#1a1a1a",
                  fontFamily: "'Arial', 'Helvetica', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {courseName} [LEVEL {examLevel}]
              </div>
            </div>

            {/* Date — positioned over "DATE" text at bottom left */}
            <div
              style={{
                position: "absolute",
                bottom: "120px",
                left: "165px",
                textAlign: "center",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#1a1a1a",
                  fontFamily: "'Arial', 'Helvetica', sans-serif",
                }}
              >
                {formattedDate}
              </div>
            </div>

            {/* Company admin name — bottom right, always centered at fixed point */}
            <div
              style={{
                position: "absolute",
                bottom: "90px",
                left: "620px",
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 2,
                fontSize: "14px",
                fontWeight: 700,
                color: "#1a1a1a",
                fontFamily: "'Arial', 'Helvetica', sans-serif",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {companyAdminName || "-"}
            </div>

            {/* Company name — below admin name */}
            {companyName && (
              <div
                style={{
                  position: "absolute",
                  bottom: "76px",
                  left: "620px",
                  transform: "translateX(-50%)",
                  textAlign: "center",
                  zIndex: 2,
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#555",
                  fontFamily: "'Arial', 'Helvetica', sans-serif",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {companyName}
              </div>
            )}

            {/* Certificate number — positioned over "certificate no:" at bottom center */}
            {certificateNumber && (
              <div
                style={{
                  position: "absolute",
                  bottom: "28px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  textAlign: "center",
                  zIndex: 2,
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "#999",
                    letterSpacing: "2px",
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {certificateNumber}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
