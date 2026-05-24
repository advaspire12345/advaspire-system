// Action: switch_to_individual
//
// Opens the Edit Student modal for an existing pooled student and clicks the
// already-active "Shared" toggle on the Enrollment tab to turn it OFF, then
// saves. The server dissolves the pool: every sibling currently in the pool
// becomes individual, and the pool record is deleted (see
// student/actions.ts handleDissolveShared).
//
// Used by Scenario 8b — "Pool dissolution — shared to individual" — and any
// flow that needs to break a pool back to individual enrollments. Only valid
// when pool.sessions_remaining <= 0 (the modal's dissolutionBlocked guard
// disables the button if there are paid sessions still in the pool).
//
// Mirrors switch_to_shared.mjs intentionally: SAME no-intermediate-eval rule
// applies between the Shared toggle click and the Save Student click. See
// memory entry feedback_agent_browser_react_eval_quirk.md.

export default {
  id: "switch_to_individual",
  description:
    "Edit a pooled student and click the already-active Shared toggle on the Enrollment tab to dissolve the pool — all siblings become individual.",
  fields: {
    student: {
      type: "string",
      required: true,
      example: "Ali",
      desc: "Existing pooled student to convert (with all siblings) back to individual.",
    },
  },
  ui: async (browser, args) => {
    browser.open("/student");

    // 1. Click the per-row Edit button via direct eval.
    const safe = String(args.student).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const editClick = `(() => {
      const buttons = document.querySelectorAll('button[aria-label]');
      for (const b of buttons) {
        if (b.disabled) continue;
        const aria = b.getAttribute('aria-label') || '';
        if (aria === 'Edit student ${safe}' || aria.startsWith('Edit student ${safe}')) {
          b.click();
          return 'clicked';
        }
      }
      return 'no_button';
    })()`;
    const editOut = browser.ab(`eval "${editClick.replace(/"/g, '\\"')}"`);
    if (editOut.includes("no_button")) {
      throw new Error(`switch_to_individual: no Edit button for student "${args.student}"`);
    }
    browser.sleep(900);

    // 2. Click the Enrollment tab via direct eval.
    const tabClick = `(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no_dialog';
      const btns = dlg.querySelectorAll('button');
      for (const b of btns) {
        if (b.textContent.trim() === 'Enrollment') { b.click(); return 'tab'; }
      }
      return 'no_tab';
    })()`;
    const tabOut = browser.ab(`eval "${tabClick.replace(/"/g, '\\"')}"`);
    if (!tabOut.includes("tab")) {
      throw new Error(`switch_to_individual: no Enrollment tab (${tabOut})`);
    }
    browser.sleep(1200);

    // 3. Flat sleep for siblingPoolCheck. No probe evals — same React-eval
    //    interaction quirk as switch_to_shared.
    browser.sleep(2500);

    // 4. Click Shared to toggle OFF via direct eval. If it's not already
    //    active, we'd be enabling sharing, which is the opposite of intent —
    //    fail fast in that case.
    const sharedClick = `(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no_dialog';
      const btns = dlg.querySelectorAll('button');
      for (const b of btns) {
        if (!b.disabled && (b.textContent || '').trim().toLowerCase().startsWith('shared')) {
          const isActive = b.className.split(' ').includes('border-[#615DFA]');
          if (!isActive) return 'not_active';
          b.click();
          return 'toggled_off';
        }
      }
      return 'no_shared';
    })()`;
    const out = browser.ab(`eval "${sharedClick.replace(/"/g, '\\"')}"`);
    if (out.includes("no_shared") || out.includes("no_dialog")) {
      throw new Error(
        `switch_to_individual: Shared button not found (${out.trim()})`,
      );
    }
    if (out.includes("not_active")) {
      throw new Error(
        `switch_to_individual: student "${args.student}" is not currently shared — Shared button isn't active. Use switch_to_shared instead.`,
      );
    }
    browser.sleep(2000);

    // 5. Click Save Student via direct eval.
    const saveClick = `(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no_dialog';
      const btns = dlg.querySelectorAll('button');
      for (const b of btns) {
        if (!b.disabled && b.textContent.trim() === 'Save Student') {
          b.click();
          return 'saved';
        }
      }
      return 'no_save';
    })()`;
    const saveOut = browser.ab(`eval "${saveClick.replace(/"/g, '\\"')}"`);
    if (!saveOut.includes("saved")) {
      throw new Error(`switch_to_individual: Save Student button not found (${saveOut.trim()})`);
    }
    browser.sleep(2000);
    browser.ab(`wait --load networkidle`);
  },
};
