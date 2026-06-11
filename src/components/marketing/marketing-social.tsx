"use client";

import { useEffect, useRef, useState } from "react";

// Real social handles + URLs.
const TIKTOK_HANDLE = "advaspire";
const TIKTOK_URL = `https://www.tiktok.com/@${TIKTOK_HANDLE}`;
const FB_HANDLE = "advaspire";
const FB_URL = `https://www.facebook.com/${FB_HANDLE}`;
const IG_HANDLE = "advaspire_robotics";
const IG_URL = `https://www.instagram.com/${IG_HANDLE}`;

type Post = {
  platform: "tiktok" | "facebook" | "instagram";
  title: string;
  caption: string;
  stat: string;
  /** Optional image path under /public (e.g. "/social/tiktok-1.jpg"). When set,
   *  it replaces the emoji fallback as the card thumbnail. Use a 9:12 (vertical)
   *  screenshot of the post so it fills the tile cleanly. */
  image?: string;
  /** Emoji fallback shown when `image` is empty or fails to load. */
  thumb: string;
  accentBg: string;
  /** Direct URL to the specific post / video. Falls back to the channel URL
   *  while you're still collecting the per-post links. */
  href: string;
};

// 4 posts per platform so every filter feels populated.
//
// HOW TO REPLACE WITH REAL POSTS:
//   1. Open the post on the platform and copy its full URL (e.g.
//      https://www.tiktok.com/@advaspire/video/7385... or
//      https://www.facebook.com/advaspire/videos/1234567890/ or
//      https://www.instagram.com/reel/CxyzABCD123/). Paste it into `href`.
//   2. Take a vertical screenshot of the post's thumbnail and drop it in
//      /public/social/ (e.g. /public/social/tiktok-1.jpg). Set `image` to
//      "/social/tiktok-1.jpg". 9:12 ratio looks best.
//   3. If you skip step 2, the emoji `thumb` renders as a placeholder over
//      the gradient — the link still works.
const POSTS: Post[] = [
  // TikTok — 4
  {
    platform: "tiktok",
    title: "Maze-solver in 60 seconds",
    caption: "LEGO bot + 1 sonar = curiosity. Aiden, age 10.",
    stat: "12.4k views · 1.2k likes",
    thumb: "🤖",
    accentBg: "linear-gradient(135deg,#E81B23,#E91E96)",
    href: "https://www.tiktok.com/@advaspire/video/7577932062875880724",
    // image: "/social/tiktok-1.jpg",  // TODO: add screenshot then uncomment
  },
  {
    platform: "tiktok",
    title: "She trained an AI to spot weeds",
    caption: "Priya (15) shipping a CNN from scratch. Trial-to-portfolio.",
    stat: "8.1k views · saved 420x",
    thumb: "🌿",
    accentBg: "linear-gradient(135deg,#D4FF1A,#22A6DC)",
    href: TIKTOK_URL, // TODO: replace with the specific TikTok video URL
    // image: "/social/tiktok-2.jpg",
  },
  {
    platform: "tiktok",
    title: "Scratch → real game in 90s",
    caption: "Yi Han (8) ships her first side-scroller.",
    stat: "9.6k views",
    thumb: "🎮",
    accentBg: "linear-gradient(135deg,#FF6B6B,#FFB300)",
    href: TIKTOK_URL, // TODO: replace
    // image: "/social/tiktok-3.jpg",
  },
  {
    platform: "tiktok",
    title: "Sumo bot battle, finals night",
    caption: "Three rounds, two upsets, one champion.",
    stat: "21k views · 2.4k likes",
    thumb: "🥋",
    accentBg: "linear-gradient(135deg,#1A1A2E,#E81B23)",
    href: TIKTOK_URL, // TODO: replace
    // image: "/social/tiktok-4.jpg",
  },
  // Facebook — 4
  {
    platform: "facebook",
    title: "Parent's Day recap — Kepong",
    caption: "Live project demos, free pizza, and zero PowerPoint.",
    stat: "37 reactions · 8 shares",
    thumb: "🎉",
    accentBg: "linear-gradient(135deg,#22A6DC,#1A1A2E)",
    href: FB_URL, // TODO: replace with https://www.facebook.com/advaspire/posts/... or /videos/...
    // image: "/social/facebook-1.jpg",
  },
  {
    platform: "facebook",
    title: "Term gallery — Semenyih",
    caption: "Photos from every cohort that finished this term.",
    stat: "62 reactions · 14 shares",
    thumb: "📷",
    accentBg: "linear-gradient(135deg,#1877F2,#615DFA)",
    href: FB_URL, // TODO: replace
    // image: "/social/facebook-2.jpg",
  },
  {
    platform: "facebook",
    title: "Free trial weekend — open house",
    caption: "RSVP'd parents got a hands-on coding session.",
    stat: "94 RSVPs",
    thumb: "🎟️",
    accentBg: "linear-gradient(135deg,#615DFA,#22A6DC)",
    href: FB_URL, // TODO: replace
    // image: "/social/facebook-3.jpg",
  },
  {
    platform: "facebook",
    title: "Instructor spotlight: Cikgu Hafiz",
    caption: "From competitive robotics to teaching the next batch.",
    stat: "120 reactions",
    thumb: "🧑‍🏫",
    accentBg: "linear-gradient(135deg,#22A6DC,#D4FF1A)",
    href: FB_URL, // TODO: replace
    // image: "/social/facebook-4.jpg",
  },
  // Instagram — 4
  {
    platform: "instagram",
    title: "Term project wall",
    caption: "Carousel of 12 finished projects from the August cohort.",
    stat: "1.3k impressions",
    thumb: "📸",
    accentBg: "linear-gradient(135deg,#E91E96,#FFB300)",
    href: IG_URL, // TODO: replace with https://www.instagram.com/p/... or /reel/...
    // image: "/social/instagram-1.jpg",
  },
  {
    platform: "instagram",
    title: "Reel: LEGO EV3 line follower",
    caption: "30 seconds of clean curve-tracking. Built in class.",
    stat: "4.4k plays",
    thumb: "🛣️",
    accentBg: "linear-gradient(135deg,#F58529,#DD2A7B)",
    href: IG_URL, // TODO: replace
    // image: "/social/instagram-2.jpg",
  },
  {
    platform: "instagram",
    title: "Behind the scenes — build day",
    caption: "Time-lapse of the Saturday senior class shipping their final.",
    stat: "2.1k plays",
    thumb: "⚙️",
    accentBg: "linear-gradient(135deg,#DD2A7B,#8134AF)",
    href: IG_URL, // TODO: replace
    // image: "/social/instagram-3.jpg",
  },
  {
    platform: "instagram",
    title: "Carousel: parent reactions",
    caption: "Real screenshots from parents after demo day.",
    stat: "880 saves",
    thumb: "💬",
    accentBg: "linear-gradient(135deg,#8134AF,#615DFA)",
    href: IG_URL, // TODO: replace
    // image: "/social/instagram-4.jpg",
  },
];

const FILTERS = [
  { key: "all" as const, label: "All" },
  { key: "tiktok" as const, label: "TikTok" },
  { key: "facebook" as const, label: "Facebook" },
  { key: "instagram" as const, label: "Instagram" },
];

// Turn a post URL into the platform's official embed iframe URL.
//   TikTok:    https://www.tiktok.com/@user/video/<id>            → /embed/v2/<id>
//   Instagram: https://www.instagram.com/(p|reel|tv)/<shortcode>/ → /<...>/<shortcode>/embed
//   Facebook:  any FB post / video URL                            → /plugins/video.php?href=<encoded>
//
// Returns null if we don't have a specific URL yet (channel-page placeholder)
// — the card then falls back to opening the channel in a new tab.
function embedUrlFor(platform: Post["platform"], href: string): string | null {
  try {
    const u = new URL(href);
    if (platform === "tiktok") {
      const m = u.pathname.match(/\/video\/(\d+)/);
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
      return null;
    }
    if (platform === "instagram") {
      const m = u.pathname.match(/\/(p|reel|tv)\/([^/]+)/);
      if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed/`;
      return null;
    }
    if (platform === "facebook") {
      // Channel root URLs (e.g. facebook.com/advaspire) have no post id — skip.
      if (u.pathname === "/" || u.pathname.replace(/\/$/, "").split("/").filter(Boolean).length <= 1) {
        return null;
      }
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false&width=560`;
    }
  } catch {
    /* malformed URL */
  }
  return null;
}

export function MarketingSocial() {
  const [filter, setFilter] = useState<"all" | "tiktok" | "facebook" | "instagram">("all");
  const filtered = filter === "all" ? POSTS : POSTS.filter((p) => p.platform === filter);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  // The post currently playing inline (its iframe is mounted). null = none yet
  // clicked; the rest of the cards still show their thumbnail. We key by href
  // since href is unique per post.
  const [playingHref, setPlayingHref] = useState<string | null>(null);
  // TikTok oEmbed responses keyed by post href — gives us the real video
  // thumbnail TikTok shows on tiktok.com so the card matches their own image.
  // Facebook/Instagram oEmbed require an access token we don't have, so for
  // those we fall back to the emoji on the gradient until you drop a
  // /public/social/<platform>-N.jpg in.
  const [tiktokThumbs, setTiktokThumbs] = useState<Record<string, string>>({});

  // Fetch TikTok thumbnails once on mount. Only for posts whose href looks
  // like a specific /video/<id> URL — channel-page placeholders skip this.
  useEffect(() => {
    let cancelled = false;
    const candidates = POSTS.filter(
      (p) => p.platform === "tiktok" && /\/video\/\d+/.test(p.href),
    );
    for (const p of candidates) {
      fetch(`/api/social/tiktok-oembed?url=${encodeURIComponent(p.href)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data?.thumbnail_url) return;
          setTiktokThumbs((prev) => ({ ...prev, [p.href]: data.thumbnail_url }));
        })
        .catch(() => {
          /* network / rate-limit — fall back to emoji */
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Scroll the post strip by one card width's worth.
  const scrollBy = (direction: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardEl = el.querySelector<HTMLElement>("[data-card]");
    const cardW = cardEl?.offsetWidth ?? 280;
    el.scrollBy({ left: direction * (cardW + 20), behavior: "smooth" });
  };

  // Count per platform — shown next to each filter pill so an empty filter
  // never surprises the visitor.
  const counts = {
    all: POSTS.length,
    tiktok: POSTS.filter((p) => p.platform === "tiktok").length,
    facebook: POSTS.filter((p) => p.platform === "facebook").length,
    instagram: POSTS.filter((p) => p.platform === "instagram").length,
  };

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
              Instagram. Tap any tile to open the channel.
            </p>
          </div>
        </div>

        {/* Filter pills + arrow nav */}
        <div className="flex flex-wrap items-center gap-2 mb-6" data-reveal>
          <div className="flex flex-wrap gap-2 flex-1">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all",
                    active
                      ? "bg-[#1A1A2E] text-white"
                      : "border border-[#1A1A2E]/15 bg-white text-[#1A1A2E]/70 hover:bg-[#1A1A2E]/5",
                  ].join(" ")}
                >
                  {f.label}
                  <span className={active ? "rounded-full bg-white/20 px-1.5 py-0.5 text-[9px]" : "rounded-full bg-[#1A1A2E]/8 px-1.5 py-0.5 text-[9px]"}>
                    {counts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollBy(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1A1A2E]/15 bg-white text-[#1A1A2E] hover:bg-[#1A1A2E] hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollBy(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1A1A2E]/15 bg-white text-[#1A1A2E] hover:bg-[#1A1A2E] hover:text-white transition"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Posts strip — horizontal scroll, snap to card edges, arrows above
            advance one card. On wide screens the strip behaves like a row of
            tiles that overflow to the right (a clear visual cue there's more). */}
        <div
          ref={scrollerRef}
          // Keep the strip inside the centered max-w-7xl container so the
          // first card aligns with the headline above (no negative margin
          // bleed-out). Vertical padding gives hover shadows breathing room so
          // overflow-y-hidden doesn't clip them into a hard box.
          className="flex gap-5 overflow-x-auto overflow-y-hidden snap-x snap-mandatory py-6 -my-6"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered.map((p, i) => {
            const embedUrl = embedUrlFor(p.platform, p.href);
            const canEmbed = embedUrl !== null;
            const isPlaying = playingHref === p.href && canEmbed;
            const realThumb = tiktokThumbs[p.href];

            return (
              <div
                key={`${p.platform}-${p.title}`}
                data-card
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 50}ms` }}
                className="relative shrink-0 w-[260px] sm:w-[280px] snap-start overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-22px_rgba(26,26,46,0.25)] hover:shadow-[0_30px_55px_-22px_rgba(26,26,46,0.35)] transition-all duration-500"
              >
                {/* Thumbnail / player slot. Idle: thumbnail + play overlay.
                    Playing: iframe replaces it in place. */}
                {isPlaying ? (
                  <div className="relative aspect-[9/12] overflow-hidden bg-black">
                    <iframe
                      src={embedUrl!}
                      title={p.title}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      // `scrolling="no"` is the deprecated-but-still-honored hint
                      // that tells the iframe not to expose its own scrollbars.
                      // TikTok / IG / FB embeds otherwise add a vertical scroll
                      // because their internal UI is taller than our card slot.
                      scrolling="no"
                      className="absolute inset-0 h-full w-full overflow-hidden"
                      style={{ border: 0 }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (canEmbed) {
                        setPlayingHref(p.href);
                      } else {
                        window.open(p.href, "_blank", "noopener");
                      }
                    }}
                    className="group relative block w-full text-left aspect-[9/12] overflow-hidden"
                    style={{ background: p.accentBg }}
                  >
                    {realThumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={realThumb}
                        alt={p.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : p.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image}
                        alt={p.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center text-7xl drop-shadow-lg transition-transform duration-500 group-hover:scale-110 select-none">
                        {p.thumb}
                      </span>
                    )}
                    <PlatformBadge platform={p.platform} />
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" />
                      {p.stat}
                    </span>
                    {/* Centered play button — visible always (TikTok-style),
                        scales on hover. Tap anywhere on the thumbnail plays. */}
                    {canEmbed && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/95 shadow-lg ring-1 ring-black/10 transition-transform duration-300 group-hover:scale-110">
                          <svg className="h-5 w-5 text-[#1A1A2E] translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </span>
                    )}
                    {!canEmbed && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/35 transition">
                        <span className="opacity-0 group-hover:opacity-100 transition flex items-center gap-2 rounded-full bg-white text-[#1A1A2E] px-4 py-2 text-xs font-bold uppercase tracking-widest shadow-lg">
                          Open
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      </span>
                    )}
                  </button>
                )}
                <div className="p-5 space-y-2">
                  <h3 className="text-sm font-bold text-[#1A1A2E] tracking-tight leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-xs text-[#1A1A2E]/60 leading-relaxed">{p.caption}</p>
                  <div className="pt-2 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#E81B23]">
                    <a
                      href={p.href}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1.5 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Open on {p.platform}
                      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    {isPlaying && (
                      <button
                        type="button"
                        onClick={() => setPlayingHref(null)}
                        className="text-[#1A1A2E]/60 hover:text-[#1A1A2E] transition"
                      >
                        Stop
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
