// Action: parent_self_register
//
// Drives the public /register/[companyCode]/[branchCode] page as an
// unauthenticated visitor. Fills the parent + first-child fields, picks
// a course/slot, and submits. The runner injects the resolved company
// and branch codes via ctx.fixtures.

export default {
  id: "parent_self_register",
  description: "Visit the public registration form for a branch and create a parent + first child.",
  fields: {
    company_code: { type: "string", required: true, example: "ADS", desc: "Company shortcode (ctx.fixtures.companyCode in most scenarios)." },
    branch_code: { type: "string", required: true, example: "B1", desc: "Branch shortcode." },
    parent_name: { type: "string", required: true, example: "New Parent" },
    parent_phone: { type: "string", required: true, example: "0123450000" },
    parent_email: { type: "string", required: true, example: "newp@sim.local" },
    child_name: { type: "string", required: true, example: "New Child" },
    date_of_birth: { type: "string", required: true, example: "2015-03-15" },
    gender: { type: "string", required: true, example: "male" },
    course: { type: "string", required: true, example: "CodingCourse" },
  },
  ui: async (browser, args) => {
    // Public unauthenticated page — bypass the admin login dance.
    browser.open(
      `/register/${encodeURIComponent(args.company_code)}/${encodeURIComponent(args.branch_code)}`,
      { noAuth: true },
    );
    browser.sleep(700);
    browser.ab(`wait --load networkidle`);

    // Child block
    browser.fillLabel("Student Full Name", args.child_name);
    browser.fillCss("input[type=date]", args.date_of_birth);
    browser.selectByLabel("Gender", args.gender);

    // Program select. Required.
    browser.selectByLabel("Program", args.course);
    browser.sleep(400);

    // Pick the first time slot offered for this course.
    const slotChosen = browser.ab(
      `eval "(() => { const sel = document.querySelector('[aria-label=\\\"Preferred Time Slot\\\"]'); if (!sel) return 'no_slot_select'; const opt = document.querySelectorAll('[role=\\\"option\\\"]'); if (!opt.length) { sel.click(); return 'opened'; } opt[0].click(); return 'chosen'; })()"`,
    );
    if (slotChosen.includes("opened")) {
      browser.sleep(300);
      browser.ab(
        `eval "(() => { const opts = document.querySelectorAll('[role=\\\"option\\\"]'); if (opts[0]) { opts[0].click(); } })()"`,
      );
    }
    browser.sleep(200);

    // Parent block
    browser.fillLabel("Full Name", args.parent_name);
    browser.fillLabel("Phone Number", args.parent_phone);
    browser.fillLabel("Email Address", args.parent_email);

    // Submit.
    const submit = browser.ab(
      `eval "(() => { const btns = document.querySelectorAll('button'); for (const b of btns) { const t = (b.textContent || '').trim(); if (t === 'Submit' || t === 'Register' || t === 'Submit Registration') { b.click(); return 'clicked'; } } return 'no_submit'; })()"`,
    );
    if (!submit.includes("clicked")) {
      throw new Error("parent_self_register: submit button not found");
    }
    browser.sleep(1500);
    browser.ab(`wait --load networkidle`);
  },
};
