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

  open(path) {
    this.ensureLoggedIn();
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;
    this.ab(`open ${url}`);
    this.ab(`wait --load networkidle`);
    return this.ifLoggedOutRetry(() => this.ab(`open ${url}`));
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
    return this.locateAndAct((snap) => {
      const re = new RegExp(`button (?:"${escapeRegex(name)}"|"[^"]*${escapeRegex(name)}[^"]*")`);
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
    const js = `(() => {
      const dlg = document.querySelector('[role="dialog"]');
      if (!dlg) return 'no_dialog';
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

  // Fill an input via its CSS selector using the React-aware value setter.
  // agent-browser's `fill` updates the DOM value but doesn't always trigger
  // React's onChange (especially for date/time inputs). Using the prototype
  // value setter + dispatching an `input` event is the well-known workaround.
  fillCss(selector, value) {
    const safeSel = String(selector).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const safeVal = String(value).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const js = `(() => {
      const el = document.querySelector("${safeSel}");
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
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
    // JS-dispatched click on the option text. Returns true if found+clicked.
    const safe = String(optionText).replace(/"/g, '\\"').replace(/'/g, "\\'");
    const js = `(() => {
      const opts = document.querySelectorAll('[role="option"]');
      for (const o of opts) {
        if (o.textContent && o.textContent.trim().includes("${safe}")) {
          o.click();
          return true;
        }
      }
      return false;
    })()`;
    const out = this.ab(`eval "${js.replace(/"/g, '\\"')}"`);
    if (!out.includes("true")) {
      throw new Error(`selectByLabel: no option "${optionText}" after opening "${label}"`);
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
