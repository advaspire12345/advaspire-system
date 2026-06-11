// Action: create_session_transfer
//
// Drives the admin "New Session Transfer" modal on /transfers.
// Picks From-student / To-student (which must share the same active course),
// types a session count, optionally adds notes, and submits.

export default {
  id: "create_session_transfer",
  description: "Admin: create a cross-parent session transfer via the modal on /transfers.",
  fields: {
    from_student: { type: "string", required: true, example: "Ali", desc: "Sender student name. Must have at least `sessions` available." },
    to_student: { type: "string", required: true, example: "Abu", desc: "Receiver student name. Must be enrolled in the same course as from_student." },
    sessions: { type: "number", required: true, example: 2, desc: "How many sessions to move." },
    notes: { type: "string", required: false, example: "Cousin transfer", desc: "Optional admin note." },
  },
  defaultExpectations: ({ from_student, to_student, sessions }) => ({
    "*": [
      {
        field: "session_transfer.status",
        by: { sessions, fromName: from_student, toName: to_student },
        dbField: "session_transfers.status",
        expected: "pending_sender",
      },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/transfers");
    browser.sleep(500);
    browser.clickButton("New Session Transfer");
    browser.sleep(700);

    // From-student dropdown — label-prefix match by student name.
    browser.selectByLabel("From student", args.from_student);
    browser.sleep(300);
    browser.selectByLabel("To student", args.to_student);
    browser.sleep(200);

    // Sessions input (FloatingInput so label-based fill works).
    browser.fillLabel("Sessions", String(args.sessions));
    if (args.notes) {
      browser.fillLabel("Notes (optional)", args.notes);
    }

    browser.clickDialogButton("Create transfer");
  },
};
