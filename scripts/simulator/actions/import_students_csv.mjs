// Action: import_students_csv
//
// Drives the /import page's Students section: builds a CSV from the scenario's
// `rows`, injects it into the file input via DataTransfer + dispatchEvent
// (the only way to programmatically populate a <input type="file"> without
// real OS-level file dialogs), then clicks the Import button.
//
// The action takes rows in YAML and converts them to CSV — fields are
// double-quote-escaped automatically. branch_name and program_name are
// auto-prefixed with the run's simulator prefix so the import targets the
// right fixture row.
//
// Caveat: the actor must have write access to the chosen branch (super_admin
// or a group/company admin scoped to it). Default simulator users are scoped
// to the run's branch, so use that branch by default in rows.

function escapeCsv(s) {
  const v = String(s ?? "");
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

function buildCsv(headers, rows) {
  const out = [headers.map(escapeCsv).join(",")];
  for (const r of rows) {
    out.push(headers.map((h) => escapeCsv(r[h] ?? "")).join(","));
  }
  return out.join("\n") + "\n";
}

export default {
  id: "import_students_csv",
  description:
    "Drive /import students section: build a CSV from `rows`, inject it into the file input, click Import. Tests the import API end-to-end including the two-pass pool-creation pass.",
  fields: {
    rows: {
      type: "array",
      required: true,
      desc:
        "Array of row objects with keys matching STUDENT_COLUMNS (student_name, parent_email, branch_name, program_name, package_type, package_duration, share_with_sibling, etc.). branch_name and program_name are auto-prefixed by the runner — use the short names from your fixture.",
    },
  },
  ui: async (browser, args, ctx = {}) => {
    if (!Array.isArray(args.rows) || args.rows.length === 0) {
      throw new Error("import_students_csv: rows array required and non-empty");
    }
    const runId = ctx.fixtures?.runId;
    if (!runId) {
      throw new Error("import_students_csv: ctx.fixtures.runId missing — runner must inject fixtures");
    }

    const STUDENT_COLUMNS = [
      "student_name", "date_of_birth", "gender", "school_name",
      "parent_name", "parent_email", "parent_phone", "parent_address", "parent_city",
      "branch_name",
      "program_name", "package_type", "package_duration",
      "schedule_day", "schedule_time",
      "enrollment_status", "sessions_remaining",
      "share_with_sibling",
    ];

    // Auto-fill branch_name and program_name from fixtures so scenarios stay
    // terse. Scenario writers can still override per-row by setting these.
    const preparedRows = args.rows.map((r) => ({
      ...r,
      branch_name: r.branch_name ?? ctx.fixtures?.branchName,
      program_name: r.program_name ?? ctx.fixtures?.courseName,
    }));

    const csv = buildCsv(STUDENT_COLUMNS, preparedRows);

    browser.open("/import");
    browser.sleep(800);

    // Inject the CSV as a File into the students section's file input, then
    // dispatch the change event so the React handler picks it up.
    const csvLiteral = JSON.stringify(csv);
    const injectScript = `(() => {
      const input = document.getElementById('upload-students');
      if (!input) return 'no_input';
      const blob = new Blob([${csvLiteral}], { type: 'text/csv' });
      const file = new File([blob], 'sim_test.csv', { type: 'text/csv' });
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return 'injected';
    })()`;
    const injectOut = browser.ab(`eval "${injectScript.replace(/"/g, '\\"')}"`);
    if (!injectOut.includes("injected")) {
      throw new Error(`import_students_csv: file injection failed (${injectOut.trim()})`);
    }

    // PapaParse runs async; wait for parsedData to populate (the Import
    // button enables once it does).
    browser.sleep(1500);

    // Click Import. The button label is "Import N rows" (N is the parsed
    // row count after filtering). We match by text-prefix.
    const clickScript = `(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        const t = (b.textContent || '').trim();
        if (!b.disabled && t.startsWith('Import ') && t.endsWith(' rows')) {
          b.click();
          return 'clicked:' + t;
        }
      }
      return 'no_import_button';
    })()`;
    const clickOut = browser.ab(`eval "${clickScript.replace(/"/g, '\\"')}"`);
    if (!clickOut.includes("clicked")) {
      throw new Error(`import_students_csv: Import button not found / disabled (${clickOut.trim()})`);
    }

    // Wait for the result panel to render. The server work involves several
    // inserts per row plus pool helpers — 3s is generous for 2-3 rows.
    browser.sleep(3500);
    browser.ab(`wait --load networkidle`);
  },
};
