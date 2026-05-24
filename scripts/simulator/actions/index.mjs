// Action registry. New actions added by dropping a module in this directory
// and re-exporting it here.

import addStudent from "./add_student.mjs";
import markPresent from "./mark_present.mjs";
import addVoucher from "./add_voucher.mjs";
import addTrial from "./add_trial.mjs";
import updateTrial from "./update_trial.mjs";
import deleteTrial from "./delete_trial.mjs";
import markAbsent from "./mark_absent.mjs";
import approvePendingPayment from "./approve_pending_payment.mjs";
import markOfflinePaid from "./mark_offline_paid.mjs";
import editPendingPayment from "./edit_pending_payment.mjs";
import cancelEnrollment from "./cancel_enrollment.mjs";
import switchToShared from "./switch_to_shared.mjs";
import switchToIndividual from "./switch_to_individual.mjs";
import expireEnrollment from "./expire_enrollment.mjs";
import backdatePayment from "./backdate_payment.mjs";
import stampSessionsRemaining from "./stamp_sessions_remaining.mjs";
import addPaymentForStudent from "./add_payment_for_student.mjs";
import takeExtraAttendance from "./take_extra_attendance.mjs";
import importStudentsCsv from "./import_students_csv.mjs";

export const ACTIONS = {
  [addStudent.id]: addStudent,
  [markPresent.id]: markPresent,
  [addVoucher.id]: addVoucher,
  [addTrial.id]: addTrial,
  [updateTrial.id]: updateTrial,
  [deleteTrial.id]: deleteTrial,
  [markAbsent.id]: markAbsent,
  [approvePendingPayment.id]: approvePendingPayment,
  [markOfflinePaid.id]: markOfflinePaid,
  [editPendingPayment.id]: editPendingPayment,
  [cancelEnrollment.id]: cancelEnrollment,
  [switchToShared.id]: switchToShared,
  [switchToIndividual.id]: switchToIndividual,
  [expireEnrollment.id]: expireEnrollment,
  [backdatePayment.id]: backdatePayment,
  [stampSessionsRemaining.id]: stampSessionsRemaining,
  [addPaymentForStudent.id]: addPaymentForStudent,
  [takeExtraAttendance.id]: takeExtraAttendance,
  [importStudentsCsv.id]: importStudentsCsv,
};

export function listActions() {
  return Object.values(ACTIONS).map((a) => ({
    id: a.id,
    description: a.description,
    requiredFields: Object.entries(a.fields)
      .filter(([, f]) => f.required)
      .map(([k]) => k),
  }));
}

export function showAction(id) {
  const a = ACTIONS[id];
  if (!a) throw new Error(`Unknown action: ${id}. Try one of: ${Object.keys(ACTIONS).join(", ")}`);
  const lines = [];
  lines.push(`# ${a.id}`);
  lines.push("");
  lines.push(a.description);
  lines.push("");
  lines.push("## Fields");
  lines.push("");
  for (const [name, def] of Object.entries(a.fields)) {
    const tag = def.required ? "**required**" : "optional";
    const typ = def.type || (def.ref ? `ref:${def.ref}` : "string");
    const example = def.example ? ` — e.g. \`${def.example}\`` : "";
    const def_ = def.default !== undefined ? ` (default: \`${def.default}\`)` : "";
    const desc = def.desc ? `\n    ${def.desc}` : "";
    lines.push(`- \`${name}\` (${typ}, ${tag})${def_}${example}${desc}`);
  }
  lines.push("");
  lines.push("## Example YAML step");
  lines.push("");
  lines.push("```yaml");
  lines.push(`- actor: <handle>`);
  lines.push(`  action: ${a.id}`);
  lines.push(`  with:`);
  for (const [name, def] of Object.entries(a.fields)) {
    if (!def.required) continue;
    const v = def.example ?? `<${def.type ?? def.ref ?? "value"}>`;
    lines.push(`    ${name}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  }
  lines.push(`  observers: auto`);
  lines.push("```");
  return lines.join("\n");
}
