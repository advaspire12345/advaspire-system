import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/db";
import { format } from "date-fns";

interface CertificateRequest {
  examId: string;
  studentId: string;
  studentName: string;
  courseName: string;
  examLevel: number;
  certificateNumber: string;
  mark?: number;
  examinerName?: string;
  examDate?: string;
}

/**
 * Generate a certificate PDF and upload to Supabase storage
 * For now, this creates a simple HTML-based certificate image
 * In production, consider using @react-pdf/renderer or puppeteer for PDF generation
 */
export async function POST(request: NextRequest) {
  try {
    const body: CertificateRequest = await request.json();

    const {
      examId,
      studentName,
      courseName,
      examLevel,
      certificateNumber,
      mark,
      examinerName,
      examDate,
    } = body;

    // Get examiner info if not provided
    let finalExaminerName = examinerName;
    if (!finalExaminerName && examId) {
      const { data: examData } = await supabaseAdmin
        .from("examinations")
        .select("examiner:users(name)")
        .eq("id", examId)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      finalExaminerName = (examData?.examiner as any)?.name || "Examiner";
    }

    // Format date
    const formattedDate = examDate
      ? format(new Date(examDate), "do MMMM yyyy")
      : format(new Date(), "do MMMM yyyy");

    // Generate certificate HTML
    const certificateHtml = generateCertificateHtml({
      studentName,
      courseName,
      level: examLevel,
      mark: mark ?? 0,
      certificateNumber,
      examinerName: finalExaminerName || "Authorized Examiner",
      date: formattedDate,
    });

    // For a simple implementation, we'll store the HTML content
    // In production, you would use puppeteer or similar to render to PDF
    const certificateBlob = new Blob([certificateHtml], { type: "text/html" });
    const certificateBuffer = Buffer.from(await certificateBlob.arrayBuffer());

    // Upload to Supabase storage
    const fileName = `certificates/${certificateNumber.replace(/-/g, "_")}.html`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("public")
      .upload(fileName, certificateBuffer, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading certificate:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload certificate" },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from("public").getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      certificateUrl: publicUrl,
      certificateNumber,
    });
  } catch (error) {
    console.error("Error generating certificate:", error);
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}

/**
 * Generate certificate HTML with classic styling
 */
function generateCertificateHtml(data: {
  studentName: string;
  courseName: string;
  level: number;
  mark: number;
  certificateNumber: string;
  examinerName: string;
  date: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificate - ${data.certificateNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Montserrat:wght@400;500;600&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Montserrat', sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .certificate {
      width: 800px;
      height: 566px;
      background: linear-gradient(135deg, #fff9e6 0%, #fff5d4 100%);
      border: 3px solid #c9a227;
      border-radius: 8px;
      position: relative;
      padding: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .certificate::before {
      content: '';
      position: absolute;
      top: 15px;
      left: 15px;
      right: 15px;
      bottom: 15px;
      border: 2px solid #d4af37;
      border-radius: 4px;
      pointer-events: none;
    }

    .certificate::after {
      content: '';
      position: absolute;
      top: 25px;
      left: 25px;
      right: 25px;
      bottom: 25px;
      border: 1px solid #e5c76b;
      border-radius: 2px;
      pointer-events: none;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
    }

    .trophy {
      font-size: 48px;
      margin-bottom: 10px;
    }

    .title {
      font-family: 'Playfair Display', serif;
      font-size: 36px;
      font-weight: 700;
      color: #1a1a2e;
      letter-spacing: 4px;
      text-transform: uppercase;
    }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 8px;
      letter-spacing: 2px;
    }

    .content {
      text-align: center;
      position: relative;
      z-index: 1;
    }

    .certify-text {
      font-size: 16px;
      color: #444;
      margin-bottom: 20px;
    }

    .student-name {
      font-family: 'Playfair Display', serif;
      font-size: 42px;
      font-weight: 700;
      color: #1a1a2e;
      margin: 20px 0;
      padding: 10px 40px;
      border-bottom: 2px solid #c9a227;
      display: inline-block;
    }

    .achievement-text {
      font-size: 16px;
      color: #444;
      line-height: 1.8;
      max-width: 600px;
      margin: 0 auto 20px;
    }

    .program-name {
      font-family: 'Playfair Display', serif;
      font-size: 24px;
      font-weight: 700;
      color: #615DFA;
      margin: 15px 0;
    }

    .level {
      font-size: 18px;
      color: #23D2E2;
      font-weight: 600;
    }

    .score {
      font-size: 20px;
      color: #28a745;
      font-weight: 600;
      margin-top: 10px;
    }

    .details {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5c76b;
    }

    .detail-item {
      text-align: center;
    }

    .detail-label {
      font-size: 12px;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: #1a1a2e;
      margin-top: 4px;
    }

    .cert-number {
      position: absolute;
      bottom: 35px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      color: #999;
      letter-spacing: 1px;
    }

    .footer {
      text-align: center;
      margin-top: auto;
      padding-top: 20px;
    }

    .academy-name {
      font-family: 'Playfair Display', serif;
      font-size: 16px;
      color: #615DFA;
      letter-spacing: 2px;
    }

    .ornament {
      color: #c9a227;
      margin: 0 10px;
    }

    @media print {
      body {
        background: none;
        padding: 0;
      }
      .certificate {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="header">
      <div class="trophy">🏆</div>
      <h1 class="title">Certificate of Achievement</h1>
      <p class="subtitle">This is to certify that</p>
    </div>

    <div class="content">
      <div class="student-name">${escapeHtml(data.studentName)}</div>

      <p class="achievement-text">
        has successfully completed the examination for
      </p>

      <div class="program-name">${escapeHtml(data.courseName)}</div>
      <div class="level">Level ${data.level}</div>
      <div class="score">with a score of ${data.mark}%</div>
    </div>

    <div class="details">
      <div class="detail-item">
        <div class="detail-label">Date</div>
        <div class="detail-value">${escapeHtml(data.date)}</div>
      </div>
      <div class="detail-item">
        <div class="detail-label">Examiner</div>
        <div class="detail-value">${escapeHtml(data.examinerName)}</div>
      </div>
    </div>

    <div class="cert-number">Certificate No: ${escapeHtml(data.certificateNumber)}</div>

    <div class="footer">
      <span class="ornament">✦</span>
      <span class="academy-name">AdCoin Academy</span>
      <span class="ornament">✦</span>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
