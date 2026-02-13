/**
 * Export data to a CSV file and trigger download
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns: { key: string; label: string }[]
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  // Create CSV header
  const header = columns.map((col) => escapeCSVValue(col.label)).join(",");

  // Create CSV rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        return escapeCSVValue(formatValue(value));
      })
      .join(",")
  );

  // Combine header and rows
  const csvContent = [header, ...rows].join("\n");

  // Create blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escape special characters in CSV values
 */
function escapeCSVValue(value: string): string {
  // If value contains comma, newline, or double quote, wrap in quotes
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    // Escape double quotes by doubling them
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a value for CSV output
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join("; ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
