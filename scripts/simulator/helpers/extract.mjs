// DOM-state extraction. Pulls structured values out of agent-browser snapshots
// so the diff helper can compare against DB and expectations.
//
// agent-browser's compact snapshot (snapshot -c) is a tree of:
//    LayoutTableRow
//      LayoutTableCell "Header label"  → next non-header cells are values
//      LayoutTableCell "value or label"
//
// These helpers find the row matching a search predicate (typically student name)
// and return a column → value map.

export function findTableRowByText(snapshot, searchText) {
  // Compact (-c) snapshots may use either:
  //   1. `LayoutTableRow` blocks (older agent-browser; nested LayoutTableCell)
  //   2. plain `- row` blocks (newer ARIA-first format; nested `cell ...`)
  // Try both. The split lookaheads keep the marker at the start of each block.
  const blocks = snapshot
    .split(/(?=LayoutTableRow)/g)
    .flatMap((b) => b.split(/(?=^\s*- row\b)/gm));
  for (const row of blocks) {
    if (!/LayoutTableRow|^\s*- row\b/m.test(row)) continue;
    if (
      row.includes(`"${searchText}"`) ||
      row.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return row;
    }
  }
  // Final fallback: most tables render at least one row-scoped button whose
  // accessible name embeds the entity name — e.g. "Edit student Foo",
  // "Delete student Foo", "Mark Foo as present", "Approve payment for Foo".
  // Finding any such button confirms the row exists even if the table layout
  // markers aren't where we expect.
  if (
    new RegExp(`button "[^"]*\\b${escapeRegex(searchText)}\\b[^"]*"`, "i").test(snapshot)
  ) {
    // Return a synthetic non-empty string so callers treating this as truthy
    // see the row as visible.
    return `__found_via_action_button__:${searchText}`;
  }
  return null;
}

// Extract cell *texts* in order from a row block. Headers are skipped (they
// appear once at top of the table, not per row).
export function extractRowCells(rowBlock) {
  const cells = [];
  const re = /LayoutTableCell "([^"]*)"/g;
  let m;
  while ((m = re.exec(rowBlock)) !== null) {
    cells.push(m[1]);
  }
  return cells;
}

// Convenience: locate row by search text and return cells map keyed by column header.
// `headers` is the array of header labels (from columnheader nodes — see extractTableHeaders).
// When the row was only located via the action-button fallback (synthetic match),
// the result's `__synthetic` flag is true and per-cell values are not available.
export function findRowMap(snapshot, searchText, headers) {
  const row = findTableRowByText(snapshot, searchText);
  if (!row) return null;
  if (typeof row === "string" && row.startsWith("__found_via_action_button__")) {
    return { __synthetic: true };
  }
  const cells = extractRowCells(row);
  const map = {};
  headers.forEach((h, i) => {
    map[h] = cells[i] ?? null;
  });
  return map;
}

export function extractTableHeaders(snapshot) {
  const re = /columnheader "([^"]+)"/g;
  const headers = [];
  let m;
  while ((m = re.exec(snapshot)) !== null) {
    headers.push(m[1]);
  }
  return headers;
}

// Pull a value out of an *open* modal by label. The modal must already be on
// screen in the snapshot. Falls back to the first textbox/value matching.
export function getModalFieldValue(snapshot, label) {
  // Most fields render as `textbox "Label *" [ref=eN]` for inputs.
  // The current value isn't in the accessibility tree — agent-browser exposes
  // it via `get value @eN` but that requires re-issuing a command. Caller is
  // expected to grab the ref here, then call browser.getValue(ref) themselves.
  const m = snapshot.match(new RegExp(`textbox "${escapeRegex(label)}\\s*\\*?" .*?\\[ref=(e\\d+)\\]`));
  return m ? m[1] : null;
}

// Specific case for the mark-present modal's "Sessions Remaining" hexagon.
// In the modal it renders as a div containing a number — search the snapshot
// for the pattern around "Sessions Remaining" StaticText.
export function getSessionsRemainingFromModal(snapshot) {
  // Find the StaticText "Sessions Remaining" then walk back to the nearest big number.
  const idx = snapshot.indexOf("Sessions Remaining");
  if (idx < 0) return null;
  // Look backward for a recent StaticText "<number>"
  const before = snapshot.slice(Math.max(0, idx - 400), idx);
  const matches = [...before.matchAll(/StaticText "(-?\d+)"/g)];
  if (matches.length === 0) return null;
  return parseInt(matches[matches.length - 1][1]);
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
