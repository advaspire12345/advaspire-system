// Robust agent-browser wrappers. Each method:
//   - shells out to `npx agent-browser` with the session arg,
//   - re-snapshots before any ref-using interaction (refs go stale on every DOM change),
//   - retries once with re-login on session timeout (login redirect detection).
//
// The runner constructs one `Browser` per role and keeps it alive across the
// whole scenario.

import { execSync } from "node:child_process";

const BASE_URL = process.env.SIM_BASE_URL || "http://localhost:3000";

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", ...opts });
  } catch (e) {
    const stderr = e.stderr?.toString() ?? "";
    const stdout = e.stdout?.toString() ?? "";
    const err = new Error(`agent-browser failed: ${cmd}\n${stderr || stdout}`);
    err.stdout = stdout;
    err.stderr = stderr;
    throw err;
  }
}

export class Browser {
  constructor({ session, profile, baseUrl = BASE_URL }) {
    this.session = session;
    this.profile = profile;
    this.baseUrl = baseUrl;
    this.loggedIn = false;
  }

  ab(args) {
    return run(`npx --yes agent-browser --session ${this.session} ${args}`);
  }

  login() {
    // Daemon can be transiently busy or have a stale connection — retry up to
    // 3 times with backoff. Recognise the common transient failure modes.
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        run(`npx --yes agent-browser auth login ${this.profile} --session ${this.session}`);
        this.loggedIn = true;
        // Mute the help-tour overlay so it doesn't block automated UI flows.
        // The hook reads this flag and short-circuits before pulsing/auto-opening.
        try {
          this.ab(`eval "localStorage.setItem('lms-onboarding-disabled','true')"`);
        } catch { /* non-fatal */ }
        return;
      } catch (e) {
        lastErr = e;
        const msg = e.stderr || e.message;
        const transient =
          msg.includes("Resource temporarily unavailable") ||
          msg.includes("daemon") ||
          msg.includes("CDP response channel closed") ||
          msg.includes("CDP channel") ||
          msg.includes("WebSocket");
        if (!transient) throw e;
        this.sleep(800 * (attempt + 1));
      }
    }
    throw lastErr;
  }

  ensureLoggedIn() {
    if (!this.loggedIn) this.login();
  }

  // `noAuth` mode skips the login dance — for actions that drive
  // public, unauthenticated routes (e.g. parent_self_register hitting
  // /register/[companyCode]/[branchCode]).
  open(path, { noAuth = false } = {}) {
    if (!noAuth) this.ensureLoggedIn();
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    this.ab(`open ${url}`);
    this.ab(`wait --load networkidle`);
    if (!noAuth) return this.ifLoggedOutRetry(() => this.ab(`open ${url}`));
  }

  ifLoggedOutRetry(fn) {
    // After open, check the URL. If we got redirected to /login, re-auth.
    const url = this.ab(`get url`).trim();
    if (url.endsWith("/login")) {
      this.login();
      fn();
      this.ab(`wait --load networkidle`);
    }
  }

  snapshot({ interactive = true, compact = true } = {}) {
    const flags = [interactive ? "-i" : "", compact ? "-c" : ""].filter(Boolean).join(" ");
    return this.ab(`snapshot ${flags}`);
  }

  // --- Semantic interactions: re-snapshot, locate by label/role+name, then click. ---

  clickButton(name) {
    // Plain `click @ref` on Radix-rendered buttons sometimes fails to fire
    // React's onClick handler (modals don't open, submits don't submit). The
    // page-scoped JS .click() variant is more reliable. We still verify the
    // button exists in the snapshot first to give a clear error message.
    //
    // The "button missing from snapshot" path is retried a handful of times
    // because /student and /attendance occasionally take a beat to render
    // their top-bar buttons after an open + networkidle (caught by
    // pool-fast-burn step 4 where add_student following payment approval
    // races the page repaint).
    return this.locateAndAct((snap) => {
      const re = new RegExp(`button (?:"${escapeRegex(name)}"|"[^"]*${escapeRegex(name)}[^"]*")`);
      let attempt = 0;
      while (!re.test(snap) && attempt < 5) {
        this.sleep(500);
        snap = this.snapshot();
        attempt++;
      }
      if (!re.test(snap)) {
        throw new Error(`clickButton: no button matching "${name}" in snapshot`);
      }
      const safe = String(name).replace(/"/g, '\\"').replace(/'/g, "\\'");
      const js = `(() => {
        const btns = document.querySelectorAll('button');
        const target = Array.from(btns).find(b => !b.disabled && b.textContent.trim() === "${safe}" && (b.offsetParent !== null || b.getClientRects().length));
        if (!target) {
          // Allow partial match (e.g. aria-label that contains the name)
          const partial = Array.from(btns).find(b => !b.disabled && (b.getAttribute('aria-label') === "${safe}" || (b.textContent.trim().includes("${safe}") && b.offsetParent !== null)));
          if (!partial) return false;
          partial.click();
          return true;
        }
        target.click();
        return true;
      })()`;
      const out = this.ab(`eval "${js.replace(/"/g, '\\"')}"`);
      if (!out.includes("true")) {
        throw new Error(`clickButton: JS click failed for "${name}"`);
      }
      this.sleep(400);
      this.ab(`wait --load networkidle`);
    });
  }

  // Click a button INSIDE the currently open dialog by its visible text.
  //
  // Use this for modal submit buttons. Plain `click @ref` on Radix-rendered
  // submit buttons sometimes fails to fire React's onClick (we suspect a focus
  // / pointer-event interaction). A dialog-scoped JS .click() reliably fires
  // the React handler.
  clickDialogButton(name) {
    const safe = String(name).replace(/"/g, '\\"').replace(/'/g, "\\'");
    // When dialogs nest (course-switch modal on top of student-modal), the
    // last [role="dialog"] in the DOM is the topmost one — that's where the
    // active submit button lives. Querying the first one would target the
    // background dialog whose button set doesn't include this name.
    const js = `(() => {
      const dlgs = document.querySelectorAll('[role="dialog"]');
      if (dlgs.length === 0) return 'no_dialog';
      const dlg = dlgs[dlgs.length - 1];
      const btns = dlg.querySelectorAll('button');
      // 1) Exact textContent match (preferred — avoids unintended partial hits)
      let target = Array.from(btns).find(b => !b.disabled && b.textContent.trim() === "${safe}");
      // 2) aria-label exact
      if (!target) target = Array.from(btns).find(b => !b.disabled && b.getAttribute('aria-label') === "${safe}");
      // 3) Partial textContent (handles card-style buttons with extra description text)
      if (!target) target = Array.from(btns).find(b => !b.disabled && b.textContent.trim().includes("${safe}"));
      if (!target) return 'no_button';
      target.click();
      return 'ok';
    })()`;
    const out = this.ab(`eval "${js.replace(/"/g, '\\"')}"`);
    if (out.includes("no_dialog")) {
      throw new Error(`clickDialogButton: no open dialog when clicking "${name}"`);
    }
    if (out.includes("no_button")) {
      throw new Error(`clickDialogButton: no enabled button "${name}" inside dialog`);
    }
    this.sleep(400);
    this.ab(`wait --load networkidle`);
    // If the dialog is still open AFTER the click *and* shows a visible error,
    // surface it. Common cause: form validation rejected on submit, leaving
    // the dialog open with an error banner. Silent failure here cascades into
    // the next step ("no student found").
    // Only surface real error messages — ignore required-field asterisks and
    // other ornamental short strings that always render red.
    const errCheck = this.ab(
      `eval "(() => { const dlg = document.querySelector('[role=\\\"dialog\\\"]'); if (!dlg) return ''; const reds = dlg.querySelectorAll('.text-red-500, .text-red-600, .text-red-700, .bg-red-50, [role=\\\"alert\\\"]'); const msgs = Array.from(reds).map(el => el.textContent.trim()).filter(t => t.length > 8 && !/^[*✕✖]+$/.test(t)); return msgs.length ? 'ERR::' + msgs[0].slice(0, 200) : ''; })()"`,
    );
    if (errCheck.includes("ERR::")) {
      const msg = errCheck.split("ERR::").slice(-1)[0].replace(/"/g, "").trim();
      throw new Error(`clickDialogButton("${name}"): dialog still open with error → ${msg}`);
    }
  }

  sleep(ms) {
    // synchronous wait — avoids both busy-loops and child-process spawning.
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, ms);
  }

  fillLabel(label, value) {
    return this.locateAndAct((snap) => {
      // Inputs render as `textbox`, number inputs as `spinbutton`. Match either.
      // Bracket payload may contain other attributes (e.g. `[required, ref=e14]`
      // or `[disabled, required, ref=e14]`), so capture any attribute soup
      // before `ref=`.
      const re = new RegExp(
        `(?:textbox|spinbutton) "${escapeRegex(label)}\\s*\\*?" \\[[^\\]]*?ref=(e\\d+)\\]`,
      );
      const m = snap.match(re);
      if (!m) throw new Error(`fillLabel: no input "${label}" in snapshot`);
      const safe = String(value).replace(/"/g, '\\"');
      this.ab(`fill @${m[1]} "${safe}"`);
    });
  }

  // Fill an input or textarea via its CSS selector using the React-aware
  // value setter. agent-browser's `fill` updates the DOM value but doesn't
  // always trigger React's onChange (especially for date/time inputs).
  // Using the prototype value setter + dispatching an `input` event is the
  // well-known workaround.
  //
  // The setter must come from the *correct* prototype: HTMLInputElement for
  // <input>, HTMLTextAreaElement for <textarea>. Using the wrong one throws
  // `TypeError: Illegal invocation` (caught by activity-broadcast scenario
  // 2026-06-04 — was hardcoded to HTMLInputElement.prototype).
  fillCss(selector, value) {
    const safeSel = String(selector).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const safeVal = String(value).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const js = `(() => {
      const el = document.querySelector("${safeSel}");
      if (!el) return false;
      const proto = el instanceof window.HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : el instanceof window.HTMLSelectElement
          ? window.HTMLSelectElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, "${safeVal}");
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`;
    const out = this.ab(`eval "${js.replace(/"/g, '\\"')}"`);
    if (!out.includes("true")) throw new Error(`fillCss: element not found "${selector}"`);
  }

  // Open a combobox by its label, then click the option matching optionText.
  //
  // Two-stage interaction: pointer-clicking the combobox or the option in a
  // Radix Dialog modal can dismiss the modal via Radix's outside-click trap.
  // We work around it by:
  //   1. focus + Space to expand the dropdown (keeps focus in the modal),
  //   2. dispatching the option click via JS eval rather than agent-browser's
  //      pointer events (synthetic clicks bypass the Radix dismiss path).
  selectByLabel(label, optionText) {
    this.locateAndAct((snap) => {
      // Combobox bracket may include other attributes alongside expanded/ref.
      // Accept attribute soup before `ref=`. Must also still match the label
      // in the trailing accessible name.
      const cb = snap.match(
        new RegExp(`combobox \\[[^\\]]*?ref=(e\\d+)\\]: .*?${escapeRegex(label)}`),
      );
      if (!cb) throw new Error(`selectByLabel: no combobox "${label}" in snapshot`);
      this.ab(`focus @${cb[1]}`);
      // Some FloatingSelect components only open on Enter, not Space. Try both.
      this.ab(`press Space`);
      this.sleep(150);
    });
    this.sleep(300);
    // JS-dispatched click on the option text. Returns 'clicked' if found,
    // 'empty' if the option list is still loading (async dropdowns —
    // e.g. mark-present's Lesson + Mission pickers fetch from the server
    // when the modal opens), or 'no_match' if options exist but none match.
    const safe = String(optionText).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const js = `(() => {
      const opts = document.querySelectorAll('[role="option"]');
      if (opts.length === 0) return 'empty';
      for (const o of opts) {
        if (o.textContent && o.textContent.trim().includes("${safe}")) {
          o.click();
          return 'clicked';
        }
      }
      return 'no_match';
    })()`;
    // Retry the option lookup a handful of times so async-loaded dropdowns
    // have a chance to settle. Total wait budget ≈ 3s.
    let out = "";
    for (let attempt = 0; attempt < 6; attempt++) {
      out = this.ab(`eval "${js.replace(/"/g, '\\"')}"`);
      if (out.includes("clicked")) break;
      if (out.includes("no_match")) break; // options loaded, just not ours — fail fast
      this.sleep(500);
    }
    if (!out.includes("clicked")) {
      throw new Error(`selectByLabel: no option "${optionText}" after opening "${label}" (last state: ${out.trim()})`);
    }
    this.sleep(250);
  }

  // Searchable-combobox variant of selectByLabel. Opens the combobox by its
  // label, types `query` into the inner search input, waits for the filtered
  // option list to populate, then clicks the option whose text contains
  // `optionText` (defaults to `query`).
  //
  // Needed for the Take-Attendance modal's Student field (and similar
  // FloatingSelect with `searchable=true`) — those open with an empty list
  // and rely on the user typing to filter.
  searchAndPick(label, query, optionText) {
    const wanted = optionText ?? query;
    // Step 1: open the combobox by label.  Match the label at the END of
    // the accessible-name string so we don't accidentally pick a different
    // combobox whose *value* happens to contain the same word (e.g. Scope
    // combobox shows value "Branch" — would race the Branch combobox).
    this.locateAndAct((snap) => {
      const cb = snap.match(
        new RegExp(`combobox \\[[^\\]]*?ref=(e\\d+)\\]: [^\\n]*?${escapeRegex(label)}\\s*$`, "m"),
      );
      if (!cb) throw new Error(`searchAndPick: no combobox "${label}" in snapshot`);
      this.ab(`click @${cb[1]}`);
      this.sleep(200);
    });

    // Step 2: focus the inner search input and type via real keystrokes.
    // The earlier approach (setter + dispatch input) didn't trigger the
    // FloatingSelect's React onChange reliably — the input value stayed
    // empty and the server search never fired (caught by individual-multi-slot
    // 2026-06-04). Using `keyboard type` sends per-key events that React's
    // controlled-input handler picks up correctly.
    const focusJs = `(() => {
      const inputs = [...document.querySelectorAll('input')].filter(i => i.offsetParent !== null);
      const search = inputs.find(i => (i.placeholder || '').toLowerCase() === 'search...' || (i.placeholder || '').toLowerCase().includes('search'));
      const target = search || inputs[inputs.length - 1];
      if (!target) return 'no_input';
      target.focus();
      return 'focused';
    })()`;
    const focused = this.ab(`eval "${focusJs.replace(/"/g, '\\"')}"`);
    if (focused.includes("no_input")) {
      throw new Error(`searchAndPick: search input not found in open combobox "${label}"`);
    }
    this.sleep(150);
    // Send the query as real keystrokes. Empty-string check avoids a no-op
    // shell command.
    const safeKeys = String(query).replace(/"/g, '\\"');
    this.ab(`keyboard type "${safeKeys}"`);
    // Debounced server search (~250ms) + fetch + state update + re-render —
    // give it a generous breath.
    this.sleep(700);

    // Step 3: pick the option. Retry a few times so async-loaded results
    // have a chance to settle.
    const safeW = String(wanted).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const pickJs = `(() => {
      const opts = document.querySelectorAll('[role="option"]');
      if (opts.length === 0) return 'empty';
      for (const o of opts) {
        if (o.textContent && o.textContent.includes("${safeW}")) {
          o.click();
          return 'clicked';
        }
      }
      return 'no_match';
    })()`;
    let out = "";
    for (let attempt = 0; attempt < 8; attempt++) {
      out = this.ab(`eval "${pickJs.replace(/"/g, '\\"')}"`);
      if (out.includes("clicked")) break;
      if (out.includes("no_match")) break;
      this.sleep(500);
    }
    if (!out.includes("clicked")) {
      throw new Error(`searchAndPick: no option containing "${wanted}" after typing "${query}" in "${label}" (last: ${out.trim()})`);
    }
    this.sleep(250);
  }

  selectOption(optionText) {
    this.locateAndAct((snap) => {
      const m = snap.match(new RegExp(`option "${escapeRegex(optionText)}".*?\\[ref=(e\\d+)\\]`));
      if (!m) throw new Error(`selectOption: no option "${optionText}" in snapshot`);
      this.ab(`click @${m[1]}`);
    });
  }

  screenshot(path) {
    this.ab(`screenshot ${path}`);
  }

  getText(refOrSelector) {
    return this.ab(`get text ${refOrSelector}`).trim();
  }

  // Internal: re-snapshot before each action, with retry-once-on-logout.
  locateAndAct(fn) {
    const snap = this.snapshot();
    if (snap.includes("Login to your account") || (this.ab(`get url`).trim()).endsWith("/login")) {
      this.login();
      this.ab(`wait --load networkidle`);
      return this.locateAndAct(fn);
    }
    return fn(snap);
  }

  close() {
    try {
      this.ab(`close`);
    } catch {
      // ignore
    }
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
