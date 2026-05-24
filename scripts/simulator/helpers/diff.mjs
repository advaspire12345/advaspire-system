// Diff helper: compares actual vs expected, returns row entries for the report.
// Each entry: { step, role, field, dom, db, expected, result }.
// `result` is one of: PASS, DRIFT (DOM != expected or DOM != DB), DB_FAIL (DB != expected).

export function compare({ step, role, field, dom, db, expected }) {
  const eq = (a, b) =>
    a === b ||
    (a == null && b == null) ||
    (typeof a === "number" && typeof b === "number" && a === b) ||
    String(a) === String(b);

  let result;
  const domGiven = dom !== undefined;
  const dbGiven = db !== undefined;
  const expGiven = expected !== undefined;

  if (expGiven && domGiven && !eq(dom, expected)) {
    result = "❌ DRIFT (DOM != expected)";
  } else if (expGiven && dbGiven && !eq(db, expected)) {
    result = "❌ DB_FAIL";
  } else if (domGiven && dbGiven && !eq(dom, db)) {
    result = "❌ DRIFT (DOM != DB)";
  } else {
    result = "✅";
  }

  return { step, role, field, dom, db, expected, result };
}

export function isFailure(entry) {
  return entry.result.startsWith("❌");
}

export function isNoPermission(entry) {
  return entry.result.startsWith("🚫");
}
