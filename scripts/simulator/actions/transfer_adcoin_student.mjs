// Action: transfer_adcoin_student
//
// Student-portal: a logged-in student transfers adcoin to another
// student. Uses the existing transfer modal in the student portal.

export default {
  id: "transfer_adcoin_student",
  description: "Student-portal: transfer adcoin to another student.",
  fields: {
    recipient: { type: "string", required: true, example: "Sam" },
    amount: { type: "number", required: true, example: 25 },
    message: { type: "string", required: false, example: "Thanks for the help" },
  },
  ui: async (browser, args) => {
    // The student portal lives at /student-portal or similar — open and
    // look for the Transfer entry point.
    browser.open("/student-portal");
    browser.sleep(500);

    // Click into the Transfer tab / button.
    const opened = browser.ab(
      `eval "(() => { const btns = document.querySelectorAll('button, a'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'Transfer' || t === 'Transfer Adcoin' || t === 'Send') { b.click(); return 'clicked'; } } return 'no_button'; })()"`,
    );
    if (!opened.includes("clicked")) {
      throw new Error("transfer_adcoin_student: Transfer button not found in student portal");
    }
    browser.sleep(600);
    browser.ab(`wait --load networkidle`);

    // Receiver is a searchable FloatingSelect — must type to filter.
    browser.searchAndPick("Receiver", args.recipient);
    browser.fillLabel("Adcoin Amount", String(args.amount));
    if (args.message) browser.fillLabel("Message", args.message);

    browser.clickDialogButton("Transfer");
  },
};
