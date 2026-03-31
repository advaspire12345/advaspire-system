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
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
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
        month: "long",
        year: "numeric",
      });
    } catch {
      return examDate;
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[95vh]" floatingCloseButton>
        <div className="p-6 pb-0 flex items-center justify-between">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Certificate Preview
            </DialogTitle>
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
          {/* Certificate Template */}
          <div
            ref={certRef}
            style={{
              width: "740px",
              height: "520px",
              margin: "0 auto",
              background: "linear-gradient(135deg, #fefdfb 0%, #faf6ee 100%)",
              border: "3px solid #c9a227",
              borderRadius: "8px",
              position: "relative",
              padding: "36px 44px",
              fontFamily: "Georgia, 'Times New Roman', serif",
              overflow: "hidden",
            }}
          >
            {/* Inner border */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                left: "12px",
                right: "12px",
                bottom: "12px",
                border: "2px solid #d4af37",
                borderRadius: "4px",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20px",
                left: "20px",
                right: "20px",
                bottom: "20px",
                border: "1px solid #e5c76b",
                borderRadius: "2px",
                pointerEvents: "none",
              }}
            />

            {/* Corner ornaments */}
            {[
              { top: "26px", left: "26px" },
              { top: "26px", right: "26px" },
              { bottom: "26px", left: "26px" },
              { bottom: "26px", right: "26px" },
            ].map((pos, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  ...pos,
                  width: "20px",
                  height: "20px",
                  borderColor: "#c9a227",
                  borderStyle: "solid",
                  borderWidth: 0,
                  ...(i === 0
                    ? { borderTopWidth: "2px", borderLeftWidth: "2px" }
                    : i === 1
                    ? { borderTopWidth: "2px", borderRightWidth: "2px" }
                    : i === 2
                    ? { borderBottomWidth: "2px", borderLeftWidth: "2px" }
                    : { borderBottomWidth: "2px", borderRightWidth: "2px" }),
                  zIndex: 2,
                }}
              />
            ))}

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: "8px", position: "relative", zIndex: 1 }}>
              <div style={{ fontSize: "12px", letterSpacing: "3px", color: "#c9a227", textTransform: "uppercase", marginBottom: "4px" }}>
                ✦ AdCoin Academy ✦
              </div>
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  letterSpacing: "3px",
                  textTransform: "uppercase",
                  margin: "0 0 4px 0",
                  lineHeight: 1.2,
                }}
              >
                Certificate
              </h1>
              <div style={{ fontSize: "14px", letterSpacing: "6px", color: "#888", textTransform: "uppercase" }}>
                of Achievement
              </div>
            </div>

            {/* Divider */}
            <div style={{ textAlign: "center", margin: "10px 0", position: "relative", zIndex: 1 }}>
              <span style={{ color: "#c9a227", fontSize: "14px", letterSpacing: "8px" }}>✦ ✦ ✦</span>
            </div>

            {/* Content */}
            <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
              <p style={{ fontSize: "12px", color: "#777", margin: "0 0 6px 0" }}>
                This is to certify that
              </p>

              <div
                style={{
                  fontSize: "36px",
                  fontWeight: 700,
                  color: "#1a1a2e",
                  margin: "6px 0",
                  padding: "4px 30px 8px",
                  borderBottom: "2px solid #c9a227",
                  display: "inline-block",
                  lineHeight: 1.2,
                }}
              >
                {studentName}
              </div>

              <p style={{ fontSize: "12px", color: "#777", margin: "10px 0 4px 0" }}>
                has successfully completed the examination for
              </p>

              <div
                style={{
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "#615DFA",
                  margin: "6px 0 2px",
                }}
              >
                {courseName}
              </div>

              <div style={{ fontSize: "16px", color: "#23D2E2", fontWeight: 600, margin: "2px 0" }}>
                Level {examLevel}
              </div>

              {mark !== null && (
                <div style={{ fontSize: "14px", color: "#28a745", fontWeight: 600, marginTop: "4px" }}>
                  Score: {mark}%
                </div>
              )}
            </div>

            {/* Footer Details */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                marginTop: "20px",
                paddingTop: "14px",
                borderTop: "1px solid #e5c76b",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Date
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", marginTop: "2px" }}>
                  {formattedDate}
                </div>
              </div>

              {certificateNumber && (
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Certificate No.
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", marginTop: "2px" }}>
                    {certificateNumber}
                  </div>
                </div>
              )}

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#999", textTransform: "uppercase", letterSpacing: "1px" }}>
                  Examiner
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#1a1a2e", marginTop: "2px" }}>
                  {examinerName || "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
