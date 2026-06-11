"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const NAV_LINKS = [
  { href: "#tracks", label: "Tracks", index: "02" },
  { href: "#projects", label: "Projects", index: "03" },
  { href: "#gallery", label: "Gallery", index: "04" },
  { href: "#ages", label: "Journey", index: "05" },
  { href: "/learn", label: "Free Courses", index: "06", external: true },
  { href: "#pricing", label: "Pricing", index: "08" },
  { href: "#branches", label: "Branches", index: "11" },
];

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!loginOpen) return;
    const onClick = (e: MouseEvent) => {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [loginOpen]);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-[#FAF7F2]/85 backdrop-blur-md border-b border-[#1A1A2E]/10"
          : "bg-transparent",
      ].join(" ")}
    >
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative inline-flex items-center justify-center h-10 w-10 rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(233,30,150,0.45)] ring-1 ring-[#1A1A2E]/5 transition-transform group-hover:scale-105">
            <Image src="/advaspire-logo.png" alt="Advaspire" width={28} height={28} priority className="h-7 w-7" />
          </span>
          <div className="leading-none">
            <div className="font-bold text-sm text-[#1A1A2E] tracking-widest uppercase">Advaspire</div>
            <div className="font-mono text-[10px] text-[#1A1A2E]/45 tracking-widest uppercase">Robotics · Coding</div>
          </div>
        </Link>

        <ul className="hidden lg:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <li key={l.href}>
              {l.external ? (
                <Link
                  href={l.href}
                  className="group flex items-center gap-1.5 text-xs font-bold text-[#1A1A2E]/65 uppercase tracking-widest hover:text-[#1A1A2E] transition-colors"
                >
                  <span className="font-mono text-[#E91E96]/70 group-hover:text-[#E91E96]">{l.index}</span>
                  {l.label}
                </Link>
              ) : (
                <a
                  href={l.href}
                  className="group flex items-center gap-1.5 text-xs font-bold text-[#1A1A2E]/65 uppercase tracking-widest hover:text-[#1A1A2E] transition-colors"
                >
                  <span className="font-mono text-[#E91E96]/70 group-hover:text-[#E91E96]">{l.index}</span>
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Login dropdown */}
          <div ref={loginRef} className="relative">
            <button
              type="button"
              onClick={() => setLoginOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1A2E]/15 bg-white/70 px-4 py-2.5 text-xs font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-white transition-colors"
              aria-expanded={loginOpen}
              aria-haspopup="menu"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="hidden sm:inline">Login</span>
              <svg className={["h-3 w-3 transition-transform", loginOpen ? "rotate-180" : ""].join(" ")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {loginOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white ring-1 ring-[#1A1A2E]/10 shadow-[0_25px_60px_-20px_rgba(26,26,46,0.35)] overflow-hidden"
              >
                <LoginRow
                  href="/login"
                  label="Parent Login"
                  hint="Track classes, payments, progress"
                  accent="#E91E96"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="8.5" cy="7" r="4" />
                    </svg>
                  }
                />
                <LoginRow
                  href="/student-login"
                  label="Student Login"
                  hint="Adcoins, leaderboard, missions"
                  accent="#22A6DC"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  }
                />
                <LoginRow
                  href="/login"
                  label="Staff Login"
                  hint="Instructors & administrators"
                  accent="#E81B23"
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  }
                />
              </div>
            )}
          </div>

          <a
            href="#trial"
            className="group relative inline-flex items-center gap-2 rounded-full bg-[#1A1A2E] px-4 sm:px-5 py-2.5 text-xs font-bold text-white uppercase tracking-widest transition-all hover:bg-[#E91E96] shadow-[0_8px_24px_-10px_rgba(26,26,46,0.6)] hover:shadow-[0_12px_28px_-10px_rgba(233,30,150,0.55)]"
          >
            <span className="hidden sm:inline">Free Trial</span>
            <span className="sm:hidden">Trial</span>
            <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1A1A2E]/15 bg-white/70 text-[#1A1A2E] hover:bg-white transition-colors"
            aria-label="Toggle navigation"
            aria-expanded={mobileOpen}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
              ) : (
                <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#1A1A2E]/10 bg-[#FAF7F2]">
          <ul className="px-4 py-4 space-y-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                {l.external ? (
                  <Link
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-white"
                  >
                    <span className="font-mono text-xs text-[#E91E96]">{l.index}</span>
                    {l.label}
                  </Link>
                ) : (
                  <a
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-white"
                  >
                    <span className="font-mono text-xs text-[#E91E96]">{l.index}</span>
                    {l.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}

function LoginRow({
  href,
  label,
  hint,
  accent,
  icon,
}: {
  href: string;
  label: string;
  hint: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 px-4 py-3.5 hover:bg-[#FAF7F2] transition-colors"
      role="menuitem"
    >
      <span
        className="mt-0.5 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: accent }}
      >
        <span className="h-4 w-4">{icon}</span>
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-[#1A1A2E] tracking-wide">{label}</span>
        <span className="block text-[11px] text-[#1A1A2E]/55">{hint}</span>
      </span>
      <svg className="mt-3 h-3 w-3 text-[#1A1A2E]/30 group-hover:text-[#1A1A2E]/70 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
