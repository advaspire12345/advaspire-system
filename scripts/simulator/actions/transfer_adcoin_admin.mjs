// Action: transfer_adcoin_admin
//
// Admin grants or transfers adcoin to a student via the leaderboard
// transfer modal (the same one that powers the regular "give adcoin" UX
// on /leaderboard). Defaults the transactionType to "transfer".

export default {
  id: "transfer_adcoin_admin",
  description: "Admin grants/transfers adcoin to a student via the leaderboard modal.",
  fields: {
    recipient: { type: "string", required: true, example: "Sam", desc: "Recipient student's name." },
    amount: { type: "number", required: true, example: 100 },
    transaction_type: { type: "string", required: false, example: "transfer", desc: "transfer|earned|adjusted" },
    message: { type: "string", required: false, example: "Bonus for great progress" },
    password: { type: "string", required: false, example: "simpass" },
  },
  ui: async (browser, args) => {
    browser.open("/leaderboard");
    browser.sleep(500);

    // Click the page-level "Transfer" or "Give Adcoin" button to open the modal.
    const opened = browser.ab(
      `eval "(() => { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'Transfer' || t === 'Transfer Adcoin' || t === 'Give Adcoin' || t === 'New Transfer' || t === 'Adjust') { b.click(); return 'clicked'; } } return 'no_button'; })()"`,
    );
    if (!opened.includes("clicked")) {
      throw new Error("transfer_adcoin_admin: page-level transfer button not found");
    }
    browser.sleep(700);
    browser.ab(`wait --load networkidle`);

    if (args.transaction_type) {
      try {
        browser.selectByLabel("Transaction Type", args.transaction_type);
      } catch {
        // some modal versions hide this when there's only one option
      }
    }

    // Receiver is a searchable FloatingSelect — must type to filter.
    browser.searchAndPick("Receiver", args.recipient);
    browser.fillLabel("Adcoin Amount", String(args.amount));
    if (args.message) browser.fillLabel("Message", args.message);
    // The modal's password field is labelled dynamically by transaction type:
    //   "Sender's Password" for transfer/earned, "Your Password" for adjusted.
    // We try the most common one first, fall back to the other.
    try {
      browser.fillLabel("Sender's Password", args.password ?? "simpass");
    } catch {
      browser.fillLabel("Your Password", args.password ?? "simpass");
    }

    browser.clickDialogButton("Transfer");
  },
};
