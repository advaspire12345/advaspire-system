// Action: switch_to_shared
//
// Opens the Edit Student modal for an existing individual student and clicks
// the "Shared" package-type button on the Enrollment tab, then saves. The
// server creates (or joins) the pool with all siblings enrolled in the same
// course (see student/actions.ts:907+).
//
// Used by Scenario 8c — "Individual → shared with negative sessions" — and
// any other flow that needs to convert an existing individual enrollment
// into a pooled one.
//
// IMPLEMENTATION NOTES (battle-tested):
//
// A debug round revealed that using the higher-level `clickDialogButton`
// helper for the Shared click + Save click together caused the server to
// NOT create the pool — even though formData.shareWithSibling was visibly
// true on the Shared button immediately before the save. Manual sequence
// (same 4 eval calls, no helper wrappers) created the pool reliably.
//
// The suspected interaction is the helper's `wait --load networkidle` +
// dialog-error-capture eval that runs between each click. Switching to
// direct evals — same as the proven manual sequence — fixed it.
//
// Polling for the Shared button is kept (siblingPoolCheck is async on
// edit-modal open) but only as a wait-and-detect-active-class probe.
// The actual button click and save are direct JS evals.

export default {
  id: "switch_to_shared",
  description: "Edit an existing individual student and click Shared on the Enrollment tab — pools them with a sibling in the same course.",
  fields: {
    student: { type: "string", required: true, example: "Ali", desc: "Existing individual student to convert to shared." },
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
      throw new Error(`switch_to_shared: no Edit button for student "${args.student}"`);
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
      throw new Error(`switch_to_shared: no Enrollment tab (${tabOut})`);
    }
    browser.sleep(1200);

    // 3. Sleep long enough for siblingPoolCheck (the async fetch on modal
    //    open that determines Shared-button visibility) to settle. No
    //    polling — empirically, polling-eval calls between modal open and
    //    the Shared click introduce DOM reads that interfere with React's
    //    batching, causing the subsequent Save click's onClick closure to
    //    not yet see shareWithSibling=true. A flat sleep is what works.
    browser.sleep(2500);

    // 4. Click Shared via direct eval. We don't probe state first —
    //    extra evals in this window are the actual bug class.
    const sharedClick = `(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no_dialog';
      const btns = dlg.querySelectorAll('button');
      for (const b of btns) {
        if (!b.disabled && (b.textContent || '').trim().toLowerCase().startsWith('shared')) {
          // If it's already active (auto-shared by some other path), don't
          // click — that would toggle off. Check class once via the same
          // synchronous eval (same JS context, no agent-browser round-trip).
          if (b.className.split(' ').includes('border-[#615DFA]')) return 'already_active';
          b.click();
          return 'clicked';
        }
      }
      return 'no_shared';
    })()`;
    const out = browser.ab(`eval "${sharedClick.replace(/"/g, '\\"')}"`);
    if (out.includes("no_shared") || out.includes("no_dialog")) {
      throw new Error(
        `switch_to_shared: Shared button not found (${out.trim()}) — sibling must be enrolled in the same course first`,
      );
    }
    if (out.includes("clicked")) {
      browser.sleep(2000);
    }
    // If 'already_active', skip click and proceed straight to Save.

    // 5. Click Save Student via direct eval (no helper — keep React batching
    //    coherent with manual flow).
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
      throw new Error(`switch_to_shared: Save Student button not found (${saveOut.trim()})`);
    }
    browser.sleep(2000);
    browser.ab(`wait --load networkidle`);
  },
};
