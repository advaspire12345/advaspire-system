// Action: add_trial — opens /trial → "Add Trial" modal → fills the form → submits.
// Real labels confirmed by probing super_admin's view of the modal.

import { db } from "../helpers/db.mjs";

export default {
  id: "add_trial",
  description: "Create a trial booking via Add Trial modal on /trial",
  fields: {
    parent_name:    { type: "string", required: true, example: "Trial Parent 1" },
    parent_phone:   { type: "string", required: true, example: "0123456789", desc: "Modal labels this 'Phone'" },
    parent_email:   { type: "string", required: false, example: "trial1@sim.local", desc: "Modal labels this 'Email (Optional)'" },
    child_name:     { type: "string", required: true, example: "TrialKid1" },
    child_age:      { type: "number", required: true, example: 8, desc: "Modal labels this 'Age'" },
    branch:         { ref: "branches", required: true, desc: "Branch full name as it appears in the dropdown — for sim fixtures use the resolved fixture name, runner can pass {branch}" },
    course:         { ref: "courses", required: false, desc: "Modal label is 'Program (Optional)'" },
    scheduled_date: { type: "date", required: true, example: "2026-05-10" },
    scheduled_time: { type: "string", required: true, example: "17:00" },
    source: {
      type: "enum:website,facebook,google,tiktok,xhs,youtube,instagram,walk_in,referral,other",
      required: false,
      default: "website",
    },
    notes: { type: "string", required: false, desc: "Modal label 'Message (Optional)'" },
  },
  defaultExpectations: ({ child_name }) => ({
    "*": [
      { field: "trial_table.row_visible", expected: true, by: { searchText: child_name } },
      { field: "trial_table.status", expected: "Pending", by: { searchText: child_name } },
    ],
  }),
  ui: async (browser, args) => {
    browser.open("/trial");
    browser.clickButton("Add Trial");

    browser.fillLabel("Parent Name", args.parent_name);
    browser.fillLabel("Phone", args.parent_phone);
    if (args.parent_email) browser.fillLabel("Email (Optional)", args.parent_email);
    browser.fillLabel("Child Name", args.child_name);
    browser.fillLabel("Age", String(args.child_age));
    browser.selectByLabel("Branch", args.branch);
    if (args.course) browser.selectByLabel("Program (Optional)", args.course);
    if (args.source) browser.selectByLabel("Source", labelForSource(args.source));

    // Date and time: spinbutton fills don't propagate (the input stays at
    // YYYY-MM-DD=""). Use the React-aware value setter on the underlying
    // <input type="date"> / type="time"> inputs — verified to populate state.
    browser.fillCss("#scheduled-date", args.scheduled_date);
    browser.fillCss("#scheduled-time", args.scheduled_time);
    browser.sleep(200); // let React process

    if (args.notes) browser.fillLabel("Message (Optional)", args.notes);

    // The modal's submit button shares its text with the page-level "Add
    // Trial" button. Plain ref-based click can also fail to fire React's
    // onClick on some Radix-rendered buttons. clickDialogButton scopes to the
    // open dialog and uses a dialog-scoped JS .click() which fires the React
    // handler reliably.
    browser.clickDialogButton("Add Trial");
    browser.sleep(800); // wait for server action

    // Verify the trial actually saved. Catches the silent-validation-fail
    // failure mode where the click runs through but no row appears.
    const supabase = db();
    const { data: trial } = await supabase
      .from("trials")
      .select("id, child_name, status")
      .eq("child_name", args.child_name)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!trial) {
      throw new Error(
        `add_trial: submit clicked but no trial with child_name="${args.child_name}" appeared in the DB. ` +
          `Form validation likely rejected silently (most common: branch/course state didn't propagate; or duplicate phone).`,
      );
    }
  },
};

function labelForSource(v) {
  const map = {
    website: "Website",
    facebook: "Facebook",
    google: "Google",
    tiktok: "TikTok",
    xhs: "Xiaohongshu",
    youtube: "YouTube",
    instagram: "Instagram",
    walk_in: "Walk-in",
    referral: "Referral",
    other: "Other",
  };
  return map[v] ?? v;
}
