"use client";

import { useState } from "react";

// Real social handles + URLs.  Update these when accounts are confirmed.
const TIKTOK_HANDLE = "advaspire";
const TIKTOK_URL = `https://www.tiktok.com/@${TIKTOK_HANDLE}`;
const FB_HANDLE = "advaspire";
const FB_URL = `https://www.facebook.com/${FB_HANDLE}`;
const IG_HANDLE = "advaspire";
const IG_URL = `https://www.instagram.com/${IG_HANDLE}`;

type Post = {
  platform: "tiktok" | "facebook" | "instagram";
  title: string;
  caption: string;
  stat: string;
  thumb: string; // emoji or short label
  accentBg: string;
  href: string;
};

const POSTS: Post[] = [
  {
    platform: "tiktok",
    title: "Maze-solver in 60 seconds",
    caption: "LEGO bot + 1 sonar = curiosity. Aiden, age 10.",
    stat: "12.4k views · 1.2k likes",
    thumb: "🤖",
    accentBg: "linear-gradient(135deg,#E81B23,#E91E96)",
    href: TIKTOK_URL,
  },
  {
    platform: "facebook",
    title: "Parent's Day recap — Kepong",
    caption: "Live project demos, free pizza, and zero PowerPoint.",
    stat: "37 reactions · 8 shares",
    thumb: "🎉",
    accentBg: "linear-gradient(135deg,#22A6DC,#1A1A2E)",
    href: FB_URL,
  },
  {
    platform: "tiktok",
    title: "She trained an AI to spot weeds",
    caption: "Priya (15) shipping a CNN from scratch. Trial-to-portfolio.",
    stat: "8.1k views · save'd 420x",
    thumb: "🌿",
    accentBg: "linear-gradient(135deg,#D4FF1A,#22A6DC)",
    href: TIKTOK_URL,
  },
  {
    platform: "instagram",
    title: "Term project wall",
    caption: "Carousel of 12 finished projects from the August cohort.",
    stat: "1.3k impressions",
    thumb: "📸",
    accentBg: "linear-gradient(135deg,#E91E96,#FFB300)",
    href: IG_URL,
  },
];

const FILTERS = [
  { key: "all" as const, label: "All" },
  { key: "tiktok" as const, label: "TikTok" },
  { key: "facebook" as const, label: "Facebook" },
  { key: "instagram" as const, label: "Instagram" },
];

export function MarketingSocial() {
  const [filter, setFilter] = useState<"all" | "tiktok" | "facebook" | "instagram">("all");
  const filtered = filter === "all" ? POSTS : POSTS.filter((p) => p.platform === filter);

  return (
    <section id="social" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E81B23] tracking-[0.3em] font-bold">
            10 / SOCIAL
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Straight from
              <br />
              <span className="adv-grad-text italic">our classroom feed.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Follow what kids ship every week. Behind-the-scenes builds, parent
              recaps, and instructor breakdowns — across TikTok, Facebook, and
              Instagram.
            </p>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-10" data-reveal>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={[
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                  active
                    ? "bg-[#1A1A2E] text-white"
                    : "border border-[#1A1A2E]/15 bg-white text-[#1A1A2E]/70 hover:bg-[#1A1A2E]/5",
                ].join(" ")}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p, i) => (
            <a
              key={p.title}
              href={p.href}
              target="_blank"
              rel="noopener"
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
              className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-22px_rgba(26,26,46,0.25)] hover:shadow-[0_30px_55px_-22px_rgba(26,26,46,0.35)] hover:-translate-y-1.5 transition-all duration-500"
            >
              <div
                className="relative aspect-[9/12] flex items-center justify-center overflow-hidden"
                style={{ background: p.accentBg }}
              >
                <span className="text-7xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110 select-none">
                  {p.thumb}
                </span>
                <PlatformBadge platform={p.platform} />
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" />
                  {p.stat}
                </span>
              </div>
              <div className="p-5 space-y-2">
                <h3 className="text-sm font-bold text-[#1A1A2E] tracking-tight leading-snug">
                  {p.title}
                </h3>
                <p className="text-xs text-[#1A1A2E]/60 leading-relaxed">{p.caption}</p>
                <div className="pt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#1A1A2E]/50">
                  <span>Open post</span>
                  <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Follow strip */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4" data-reveal>
          <FollowCard
            label="TikTok"
            handle={`@${TIKTOK_HANDLE}`}
            href={TIKTOK_URL}
            bg="linear-gradient(135deg,#1A1A2E,#E91E96)"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.55a8.16 8.16 0 0 0 4.77 1.52V6.69h-1.84Z"/></svg>
            }
          />
          <FollowCard
            label="Facebook"
            handle={`/${FB_HANDLE}`}
            href={FB_URL}
            bg="linear-gradient(135deg,#1877F2,#22A6DC)"
            icon={
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.79c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.77l-.44 2.89h-2.33v6.99A10 10 0 0 0 22 12Z"/></svg>
            }
          />
          <FollowCard
            label="Instagram"
            handle={`@${IG_HANDLE}`}
            href={IG_URL}
            bg="linear-gradient(135deg,#F58529,#DD2A7B,#8134AF)"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <path d="M16 11.37a4 4 0 1 1-7.92 1.24A4 4 0 0 1 16 11.37Z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      </div>
    </section>
  );
}

function PlatformBadge({ platform }: { platform: Post["platform"] }) {
  const map: Record<Post["platform"], { label: string; bg: string }> = {
    tiktok: { label: "TikTok", bg: "#1A1A2E" },
    facebook: { label: "Facebook", bg: "#1877F2" },
    instagram: { label: "Instagram", bg: "#DD2A7B" },
  };
  const cfg = map[platform];
  return (
    <span
      className="absolute top-3 right-3 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
      style={{ background: cfg.bg }}
    >
      {cfg.label}
    </span>
  );
}

function FollowCard({
  label,
  handle,
  href,
  bg,
  icon,
}: {
  label: string;
  handle: string;
  href: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group relative overflow-hidden rounded-3xl p-6 text-white shadow-[0_15px_40px_-20px_rgba(26,26,46,0.4)] hover:shadow-[0_25px_55px_-20px_rgba(26,26,46,0.5)] hover:-translate-y-1 transition-all duration-500"
      style={{ background: bg }}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
          <span className="h-5 w-5">{icon}</span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest opacity-80">
          Follow
        </span>
      </div>
      <div className="mt-6">
        <div className="text-[10px] font-mono uppercase tracking-widest opacity-80">{label}</div>
        <div className="mt-1 text-2xl font-bold tracking-tight">{handle}</div>
      </div>
      <svg className="absolute bottom-5 right-5 h-5 w-5 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>
  );
}
