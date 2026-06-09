// Action: adjust_adcoin
//
// Admin adjusts a student's adcoin balance up or down via the
// leaderboard transfer modal with transactionType='adjusted'.

export default {
  id: "adjust_adcoin",
  description: "Admin: open the adjustment modal on /leaderboard and adjust a student's adcoin balance.",
  fields: {
    student: { type: "string", required: true, example: "Sam" },
    amount: { type: "number", required: true, example: 50, desc: "Positive or negative integer." },
    message: { type: "string", required: false, example: "Manual correction" },
    password: { type: "string", required: false, example: "simpass" },
  },
  ui: async (browser, args) => {
    browser.open("/leaderboard");
    browser.sleep(500);

    // The leaderboard exposes an Adjust button (or a transfer button that
    // accepts transactionType='adjusted'). Try a direct "Adjust" button first.
    const opened = browser.ab(
      `eval "(() => { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'Adjust' || t === 'Adjust Adcoin' || t === 'New Adjustment' || t === 'Adjustment') { b.click(); return 'clicked'; } } return 'fallback'; })()"`,
    );
    if (opened.includes("fallback")) {
      // Fall back to the same Transfer modal with type=adjusted.
      browser.ab(
        `eval "(() => { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'Transfer' || t === 'Transfer Adcoin' || t === 'Give Adcoin') { b.click(); return; } } })()"`,
      );
    }
    browser.sleep(700);
    browser.ab(`wait --load networkidle`);

    // Pick "Adjusted" (capitalized in the dropdown).  Without this the
    // form stays in default "Transfer" mode and the password field reads
    // "Sender's Password" instead of "Your Password".
    try {
      browser.selectByLabel("Transaction Type", "Adjusted");
    } catch {
      // some modal versions don't show the picker for the adjust route
    }

    // Receiver is a searchable FloatingSelect — must type to filter.
    browser.searchAndPick("Receiver", args.student);
    browser.fillLabel("Adcoin Amount", String(args.amount));
    if (args.message) browser.fillLabel("Message", args.message);
    // For transactionType='adjusted' the modal labels the field "Your Password".
    browser.fillLabel("Your Password", args.password ?? "simpass");

    browser.clickDialogButton("Transfer");
  },
};
