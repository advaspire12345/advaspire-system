"use client";

import { useState } from "react";

export function MarketingTrialForm() {
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "err">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/trial-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_name: form.get("parent_name"),
          parent_phone: form.get("parent_phone"),
          parent_email: form.get("parent_email"),
          child_name: form.get("child_name"),
          child_age: Number(form.get("child_age")),
          branch: form.get("branch"),
          message: form.get("message"),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? "Submission failed.");
        setStatus("err");
        return;
      }
      setStatus("ok");
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setStatus("err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="trial" className="relative bg-[#FAF7F2] overflow-hidden">
      {/* Decorative gradient bloom */}
      <div
        aria-hidden
        className="absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full opacity-60 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(212,255,26,0.55) 0%, rgba(233,30,150,0.15) 50%, transparent 75%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E81B23] tracking-[0.3em] font-bold">
            09 / FREE TRIAL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              See it in action.
              <br />
              <span className="adv-grad-text italic">Zero commitment.</span>
            </h2>
            <p className="mt-8 text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              One free 90-minute session. Your child builds something they can
              take home that day. We follow up only if you want us to.
            </p>

            <ul className="mt-10 space-y-5">
              {[
                ["NO PAYMENT NEEDED", "We won't ask for card details.", "#E81B23"],
                ["90-MIN SESSION", "Real tools, real project — not a sales pitch.", "#E91E96"],
                ["PARENTS WELCOME", "Sit in, ask questions, see the room.", "#22A6DC"],
              ].map(([t, b, accent], i) => (
                <li key={t} className="grid grid-cols-[auto_1fr] gap-4 items-start">
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: accent as string }}
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <div className="font-bold text-[#1A1A2E] text-sm tracking-widest uppercase">{t}</div>
                    <div className="text-sm text-[#1A1A2E]/65 mt-1">{b}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7" data-reveal style={{ ["--reveal-delay" as string]: "180ms" }}>
            <form
              onSubmit={handleSubmit}
              className="relative rounded-3xl bg-white ring-1 ring-[#1A1A2E]/10 p-7 sm:p-10 space-y-5 shadow-[0_25px_60px_-30px_rgba(26,26,46,0.3)]"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field name="parent_name" label="Parent name" required />
                <Field name="parent_phone" label="Phone" type="tel" required placeholder="+60 12-345 6789" />
              </div>
              <Field name="parent_email" label="Email (optional)" type="email" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field name="child_name" label="Child's name" required />
                <Field name="child_age" label="Child's age" type="number" min={5} max={18} required />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]/55 mb-2">
                  Preferred branch <span className="text-[#E81B23]">*</span>
                </label>
                <select
                  name="branch"
                  required
                  defaultValue=""
                  className="w-full rounded-xl bg-[#FAF7F2] border border-[#1A1A2E]/15 px-4 py-3 text-sm font-bold text-[#1A1A2E] focus:border-[#E91E96] focus:outline-none focus:ring-4 focus:ring-[#E91E96]/15 transition-all"
                >
                  <option value="" disabled>Choose a branch</option>
                  <option value="semenyih">Advaspire Semenyih</option>
                  <option value="kepong">Advaspire Kepong</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]/55 mb-2">
                  Anything we should know? (optional)
                </label>
                <textarea
                  name="message"
                  rows={3}
                  className="w-full rounded-xl bg-[#FAF7F2] border border-[#1A1A2E]/15 px-4 py-3 text-sm text-[#1A1A2E] focus:border-[#E91E96] focus:outline-none focus:ring-4 focus:ring-[#E91E96]/15 transition-all"
                  placeholder="Interests, scheduling needs, anything helpful…"
                />
              </div>

              {status === "ok" && (
                <div className="rounded-xl bg-[#D4FF1A]/20 border border-[#D4FF1A] px-4 py-3 text-sm font-bold text-[#1A1A2E] uppercase tracking-wider">
                  ✓ Got it — we&apos;ll contact you within 1 business day.
                </div>
              )}
              {status === "err" && error && (
                <div className="rounded-xl bg-[#E81B23]/10 border border-[#E81B23]/30 px-4 py-3 text-sm font-bold text-[#E81B23]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-3 rounded-full bg-[#1A1A2E] px-6 py-4 text-sm font-bold text-white uppercase tracking-widest transition-all hover:bg-[#E91E96] disabled:opacity-60 shadow-[0_15px_30px_-10px_rgba(26,26,46,0.4)]"
              >
                {submitting ? "Sending..." : "Book My Free Trial"}
                {!submitting && (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              <p className="text-[10px] text-[#1A1A2E]/50 text-center uppercase tracking-widest">
                We never share your information.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  placeholder,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-[#1A1A2E]/55 mb-2">
        {label}
        {required && <span className="ml-1 text-[#E81B23]">*</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full rounded-xl bg-[#FAF7F2] border border-[#1A1A2E]/15 px-4 py-3 text-sm font-bold text-[#1A1A2E] focus:border-[#E91E96] focus:outline-none focus:ring-4 focus:ring-[#E91E96]/15 placeholder:text-[#1A1A2E]/30 transition-all"
      />
    </div>
  );
}
