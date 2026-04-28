"use client";

import { useState, useCallback } from "react";
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface ImportPageProps {
  canImport?: boolean;
}

type ImportType = "students" | "attendance" | "payments" | "transactions";

interface ImportSection {
  id: ImportType;
  title: string;
  description: string;
  templateColumns: string[];
}

const SECTIONS: ImportSection[] = [
  {
    id: "students",
    title: "Students & Parents",
    description: "Import students with parent info and enrollment. Creates student IDs automatically.",
    templateColumns: [
      "student_name", "date_of_birth", "gender", "school_name",
      "parent_name", "parent_email", "parent_phone", "parent_address", "parent_city",
      "program_name", "schedule_day", "schedule_time", "enrollment_status", "sessions_remaining",
    ],
  },
  {
    id: "attendance",
    title: "Attendance History",
    description: "Import attendance records. Students must exist first (use student_id from Students import).",
    templateColumns: [
      "student_id", "date", "status", "class_type", "instructor_name",
      "lesson", "mission", "adcoin", "notes",
    ],
  },
  {
    id: "payments",
    title: "Payment Records",
    description: "Import payment records. Students must exist first.",
    templateColumns: [
      "student_id", "amount", "status", "payment_method", "paid_at",
      "program_name", "notes",
    ],
  },
  {
    id: "transactions",
    title: "Adcoin Transactions",
    description: "Import adcoin transactions. Use student_id for students or email for team members.",
    templateColumns: [
      "sender_id", "sender_type", "receiver_id", "receiver_type",
      "amount", "type", "description",
    ],
  },
];

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

export function ImportPage({ canImport }: ImportPageProps) {
  const [activeSection, setActiveSection] = useState<ImportType | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const downloadTemplate = (section: ImportSection) => {
    const csv = section.templateColumns.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${section.id}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, sectionId: ImportType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setActiveSection(sectionId);
    setResult(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data as Record<string, string>[]);
      },
      error: () => {
        setParsedData([]);
      },
    });
  }, []);

  const handleImport = async () => {
    if (!activeSection || parsedData.length === 0) return;

    setIsImporting(true);
    setResult(null);

    try {
      const res = await fetch(`/api/import/${activeSection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedData }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: data.success ?? 0,
          failed: data.failed ?? 0,
          errors: data.errors ?? [],
        });
      } else {
        setResult({
          success: 0,
          failed: parsedData.length,
          errors: [data.error || "Import failed"],
        });
      }
    } catch {
      setResult({
        success: 0,
        failed: parsedData.length,
        errors: ["Network error"],
      });
    } finally {
      setIsImporting(false);
    }
  };

  const resetUpload = () => {
    setActiveSection(null);
    setParsedData([]);
    setFileName("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Template Downloads */}
      <Card className="bg-white border-none shadow-none">
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-foreground mb-1">Download Templates</h2>
          <p className="text-sm text-muted-foreground mb-4">Download CSV templates with the correct column headers.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => downloadTemplate(section)}
                className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-[#23D2E2] hover:bg-[#23D2E2]/5 transition text-left"
              >
                <Download className="h-5 w-5 text-[#23D2E2] shrink-0" />
                <div>
                  <p className="text-sm font-bold text-foreground">{section.title}</p>
                  <p className="text-xs text-muted-foreground">{section.templateColumns.length} columns</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upload Sections */}
      {canImport && SECTIONS.map((section) => (
        <Card key={section.id} className="bg-white border-none shadow-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-foreground">{section.title}</h2>
              {activeSection === section.id && parsedData.length > 0 && (
                <button onClick={resetUpload} className="text-sm text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-4">{section.description}</p>

            {/* Upload Area */}
            {activeSection !== section.id ? (
              <label
                htmlFor={`upload-${section.id}`}
                className={cn(
                  "flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed cursor-pointer transition",
                  "border-border hover:border-[#23D2E2] hover:bg-[#23D2E2]/5"
                )}
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm font-bold text-foreground">Click to upload CSV</span>
                <span className="text-xs text-muted-foreground mt-1">or drag and drop</span>
                <input
                  id={`upload-${section.id}`}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileUpload(e, section.id)}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="space-y-4">
                {/* File Info */}
                <div className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4 text-[#23D2E2]" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-muted-foreground">— {parsedData.length} rows</span>
                </div>

                {/* Preview Table */}
                {parsedData.length > 0 && (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="px-3 py-2 text-left font-bold text-muted-foreground">#</th>
                          {Object.keys(parsedData[0]).map((col) => (
                            <th key={col} className="px-3 py-2 text-left font-bold text-muted-foreground whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                            {Object.values(row).map((val, i) => (
                              <td key={i} className="px-3 py-2 whitespace-nowrap">{val || "-"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 5 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground border-t bg-muted/30">
                        ... and {parsedData.length - 5} more rows
                      </div>
                    )}
                  </div>
                )}

                {/* Result */}
                {result && (
                  <div className={cn(
                    "rounded-lg p-4",
                    result.failed === 0 ? "bg-green-50" : "bg-amber-50"
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.failed === 0 ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      )}
                      <span className="font-bold text-sm">
                        {result.success} imported, {result.failed} failed
                      </span>
                    </div>
                    {result.errors.length > 0 && (
                      <ul className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
                        {result.errors.map((err, i) => (
                          <li key={i}>Row {i + 1}: {err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Import Button */}
                {!result && (
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || parsedData.length === 0}
                    className="h-[50px] px-8 text-white font-bold rounded-[10px] bg-[#23D2E2] hover:bg-[#18a9b8]"
                  >
                    {isImporting ? "Importing..." : `Import ${parsedData.length} rows`}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
