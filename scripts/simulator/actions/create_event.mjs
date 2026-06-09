// Action: create_event
//
// Admin creates a holiday or activity event via the /events page.  Modal
// fields filled:
//   Title, Description (textarea), Type (Holiday/Activity), Scope (branch),
//   Branch (from fixture), Date.  The submit button is "Create" in add
//   mode; it stays disabled until `canSubmit` flips true — which requires
//   Branch to be set when Scope=branch.

export default {
  id: "create_event",
  description: "Admin: create a holiday or activity event on /events.",
  fields: {
    event_type: { type: "string", required: true, example: "holiday", desc: "Either 'holiday' or 'activity'." },
    title: { type: "string", required: true, example: "Hari Raya" },
    date: { type: "string", required: true, example: "TODAY+30", desc: "ISO date for the event." },
    description: { type: "string", required: false, example: "Office closed" },
    branch: { type: "string", required: false, desc: "Branch name to scope the event to. Defaults to the run's fixture branch." },
  },
  ui: async (browser, args, ctx = {}) => {
    browser.open("/events");
    browser.sleep(500);

    // Click the page-level "New event" / "Add Event" button (top-right).
    const opened = browser.ab(
      `eval "(() => { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'New event' || t === 'Add Event' || t === 'New Event' || t === 'Create event' || t === 'Create Event') { b.click(); return 'clicked'; } } return 'no_button'; })()"`,
    );
    if (!opened.includes("clicked")) {
      throw new Error("create_event: page-level New-event button not found");
    }
    browser.sleep(800);
    browser.ab(`wait --load networkidle`);

    // Title is the only label-driven text input in this modal.
    browser.fillLabel("Title", args.title);

    // Type combobox — pick Holiday or Activity.
    const typeLabel = String(args.event_type).toLowerCase() === "activity" ? "Activity" : "Holiday";
    try {
      browser.selectByLabel("Type", typeLabel);
    } catch {
      // ignore — default is fine if pick fails
    }

    // Description is a bare <textarea> (no a11y label). CSS selector + the
    // prototype-aware fillCss helper covers it.
    if (args.description) {
      browser.fillCss("dialog textarea, [role='dialog'] textarea", args.description);
    }

    // Date is a native <input type="date"> inside the dialog.
    browser.fillCss("input[type=date]", args.date);

    // Branch picker — only renders when scope='branch'.  For roles whose
    // default scope IS branch (assistant_admin, company_admin), the picker
    // appears automatically.  Pick the fixture's branch.
    const branchName = args.branch || ctx.fixtures?.branchCity || ctx.fixtures?.branchName;
    if (branchName) {
      try {
        browser.searchAndPick("Branch", branchName);
      } catch {
        // Branch picker not rendered (super_admin defaults to global) —
        // safe to skip.
      }
    }

    browser.sleep(300);

    // Submit. "Create" in add mode; the button is disabled until canSubmit
    // flips true (title + date + branch all filled).
    browser.clickDialogButton("Create");
  },
};
