"use client";

import { useEffect, useRef } from "react";

// Hero stock photo — kid + robot. Round mask makes it feel cutout / PNG-like.
// Swap by replacing the ID below, or point `src` at /your-photo.jpg in /public.
const HERO_PHOTO_ID = "1633613286848-e6f43bbafb8d";
const HERO_PHOTO_URL = `https://images.unsplash.com/photo-${HERO_PHOTO_ID}?w=900&h=900&fit=crop&q=82&auto=format`;

export function MarketingHero() {
  const blobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    let raf = 0;
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const current = { x: target.x, y: target.y };

    const onMove = (e: MouseEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
    };

    const tick = () => {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      if (blobRef.current) {
        blobRef.current.style.transform = `translate3d(${current.x - 260}px, ${current.y - 260}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center bg-[#FAF7F2] overflow-hidden pt-24 sm:pt-28 pb-12 adv-grain">
      {/* Mouse-follow RED/magenta blur — cursor-follow gradient */}
      <div
        ref={blobRef}
        aria-hidden
        className="adv-blob pointer-events-none absolute top-0 left-0 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(232,27,35,0.42) 0%, rgba(233,30,150,0.22) 40%, rgba(212,255,26,0) 70%)",
        }}
      />
      {/* Soft static blue blob bottom-left */}
      <div
        aria-hidden
        className="absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(34,166,220,0.45) 0%, rgba(34,166,220,0) 65%)",
          filter: "blur(60px)",
        }}
      />

      {/* Faint dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(26,26,46,0.65) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative w-full">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-10" data-reveal>
            <span className="font-mono text-[10px] sm:text-xs text-[#E81B23] tracking-[0.3em] font-bold">
              01 / INTRO
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
            <div className="h-px flex-1 bg-[#1A1A2E]/15" />
            <span className="font-mono text-[10px] text-[#1A1A2E]/50 tracking-widest hidden sm:inline">
              EST. 2018 · MALAYSIA
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* LEFT — Title + paragraph + CTA (col-span-6) */}
            <div className="lg:col-span-6">
              <h1
                className="text-[clamp(2.5rem,7.5vw,6rem)] font-bold leading-[0.92] tracking-tight text-[#1A1A2E]"
                data-reveal
              >
                <span className="block">Curiosity,</span>
                <span className="block">
                  <span className="adv-grad-text italic">engineered</span>
                  <span className="text-[#1A1A2E]">.</span>
                </span>
              </h1>

              <p
                className="mt-8 max-w-xl text-lg text-[#1A1A2E]/70 leading-relaxed"
                data-reveal
                style={{ ["--reveal-delay" as string]: "120ms" }}
              >
                Project-based <span className="adv-underline font-bold text-[#1A1A2E]">robotics &amp; coding</span> for
                kids 7–18. Small classes. Real tools. Things they actually built —
                not slideshows of things they could have built.
              </p>

              <div
                className="mt-10 flex flex-wrap items-center gap-4"
                data-reveal
                style={{ ["--reveal-delay" as string]: "260ms" }}
              >
                <a
                  href="#trial"
                  className="group inline-flex items-center gap-3 rounded-full bg-[#1A1A2E] pl-7 pr-2 py-2 text-sm font-bold text-white uppercase tracking-widest transition-all hover:bg-[#E91E96] shadow-[0_12px_30px_-12px_rgba(26,26,46,0.55)]"
                >
                  Book Free Trial
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D4FF1A] text-[#1A1A2E] transition-transform group-hover:translate-x-1">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </a>
                <a
                  href="#tracks"
                  className="inline-flex items-center gap-2 text-xs font-bold text-[#1A1A2E]/65 uppercase tracking-widest hover:text-[#E81B23] transition-colors"
                >
                  Explore tracks <span aria-hidden>↓</span>
                </a>
              </div>
            </div>

            {/* MIDDLE — Big circular kid+robot photo (col-span-3) */}
            <div className="lg:col-span-3 flex justify-center" data-reveal style={{ ["--reveal-delay" as string]: "180ms" }}>
              <div className="relative">
                {/* Soft halo behind the photo */}
                <div
                  aria-hidden
                  className="absolute -inset-8 rounded-full opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(232,27,35,0.20) 0%, rgba(233,30,150,0.12) 50%, transparent 75%)",
                    filter: "blur(24px)",
                  }}
                />
                {/* Circular cutout — feels like a PNG */}
                <div className="relative h-72 w-72 sm:h-80 sm:w-80 rounded-full overflow-hidden ring-8 ring-white shadow-[0_30px_60px_-20px_rgba(26,26,46,0.4)]">
                  <img
                    src={HERO_PHOTO_URL}
                    alt="Student building a robot at Advaspire"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>

                {/* Caption pill anchored bottom-center */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-[#1A1A2E] px-4 py-2 text-[10px] font-mono uppercase tracking-widest font-bold text-white whitespace-nowrap shadow-[0_15px_30px_-10px_rgba(26,26,46,0.5)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" />
                  Build · Code · Ship
                </div>

                {/* Floating sticker A — spinning gear top-left */}
                <div
                  aria-hidden
                  className="adv-float-a absolute -top-4 -left-6 hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_15px_30px_-10px_rgba(232,27,35,0.45)]"
                  style={{ ["--rot" as string]: "-10deg" }}
                >
                  <svg className="adv-spin-slow h-8 w-8 text-[#E81B23]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65a7.3 7.3 0 0 0-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.64-.07.98s.03.66.07.98L2.46 14.63a.5.5 0 0 0-.12.64l2 3.46a.5.5 0 0 0 .61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65A.49.49 0 0 0 10 22h4c.25 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
                  </svg>
                </div>

                {/* Floating sticker B — code bracket top-right */}
                <div
                  aria-hidden
                  className="adv-float-b absolute top-6 -right-6 hidden sm:flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1A2E] shadow-[0_15px_30px_-10px_rgba(26,26,46,0.55)]"
                  style={{ ["--rot" as string]: "10deg" }}
                >
                  <span className="font-mono font-bold text-[#D4FF1A] text-base">&lt;/&gt;</span>
                </div>

                {/* Floating sticker C — lime rocket bottom-right */}
                <div
                  aria-hidden
                  className="adv-float-c absolute bottom-10 -right-8 hidden sm:flex h-12 w-12 items-center justify-center rounded-full bg-[#D4FF1A] shadow-[0_15px_30px_-10px_rgba(212,255,26,0.7)]"
                  style={{ ["--rot" as string]: "0deg" }}
                >
                  <span className="text-xl">🚀</span>
                </div>
              </div>
            </div>

            {/* RIGHT — Stats column (col-span-3) */}
            <div
              className="lg:col-span-3 lg:border-l lg:border-[#1A1A2E]/12 lg:pl-8"
              data-reveal
              style={{ ["--reveal-delay" as string]: "360ms" }}
            >
              <div className="space-y-6">
                <Stat n="200+" label="Students enrolled" accent="#E81B23" />
                <Stat n="4" label="Specialised tracks" accent="#22A6DC" />
                <Stat n="7yr" label="Building curious kids" accent="#E91E96" />
              </div>
            </div>
          </div>

          {/* Bottom status bar */}
          <div className="mt-16 sm:mt-20 pt-6 border-t border-[#1A1A2E]/12 flex flex-wrap items-center justify-between gap-4" data-reveal>
            <div className="flex items-center gap-3 text-[10px] sm:text-xs text-[#1A1A2E]/55 font-mono tracking-wider uppercase">
              <span className="relative inline-flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E81B23] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E81B23]" />
              </span>
              FREE TRIAL · ZERO COMMITMENT · BRING A PARENT
            </div>
            <div className="text-[10px] sm:text-xs text-[#1A1A2E]/55 font-mono tracking-wider uppercase">
              SEMENYIH ↔ KEPONG
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label, accent }: { n: string; label: string; accent: string }) {
  return (
    <div className="relative pl-4">
      <span className="absolute left-0 top-1.5 h-8 w-1 rounded-full" style={{ background: accent }} />
      <div className="text-5xl font-bold text-[#1A1A2E] tracking-tight leading-none">{n}</div>
      <div className="mt-2 text-[10px] text-[#1A1A2E]/55 uppercase tracking-widest font-mono">
        {label}
      </div>
    </div>
  );
}
