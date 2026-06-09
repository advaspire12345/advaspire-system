import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { WhatsAppButton } from "@/components/marketing/whatsapp-button";
import { AIChatWidget } from "@/components/marketing/ai-chat-widget";
import { MarketingRevealController } from "@/components/marketing/use-reveal";

export const metadata: Metadata = {
  title: "Free Robotics & Coding Lessons for Kids",
  description:
    "Free intro lessons in robotics, game coding, app coding, and AI — for kids aged 7–18. Watch, follow along, and ship your first project. No payment, no signup.",
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Free Robotics & Coding Lessons for Kids · Advaspire",
    description:
      "Browse our free intro lessons — robotics, games, apps, and AI. Built for curious kids 7–18.",
    url: "https://www.advaspire.com/learn",
    type: "website",
  },
};

const FREE_LESSONS = [
  {
    id: "FL01",
    track: "Robotics",
    title: "Wire your first LED with Arduino",
    duration: "12 min",
    age: "Ages 9+",
    level: "Beginner",
    accent: "#E81B23",
    blurb: "Make a real LED blink using an Arduino board. Your first hello-world in hardware.",
    emoji: "💡",
  },
  {
    id: "FL02",
    track: "Game Coding",
    title: "Build a Pong clone in Scratch",
    duration: "20 min",
    age: "Ages 7+",
    level: "Beginner",
    accent: "#E91E96",
    blurb: "Drag, drop, code. A working two-player paddle game in one sitting.",
    emoji: "🏓",
  },
  {
    id: "FL03",
    track: "App Coding",
    title: "Your first Flutter screen",
    duration: "25 min",
    age: "Ages 11+",
    level: "Beginner",
    accent: "#22A6DC",
    blurb: "Hello-world in Flutter — buttons, text, and your first interactive UI.",
    emoji: "📱",
  },
  {
    id: "FL04",
    track: "Data + AI",
    title: "What is AI, really? (in 8 minutes)",
    duration: "8 min",
    age: "Ages 10+",
    level: "Beginner",
    accent: "#1A1A2E",
    blurb: "No jargon. Just a clean explainer of how machines learn from examples.",
    emoji: "🧠",
  },
  {
    id: "FL05",
    track: "Robotics",
    title: "Reading a sensor in Python",
    duration: "18 min",
    age: "Ages 12+",
    level: "Intermediate",
    accent: "#E81B23",
    blurb: "Use a Raspberry Pi + ultrasonic sensor to detect distance and trigger LEDs.",
    emoji: "📡",
  },
  {
    id: "FL06",
    track: "Game Coding",
    title: "Make a platformer in Unity",
    duration: "35 min",
    age: "Ages 13+",
    level: "Intermediate",
    accent: "#E91E96",
    blurb: "Sprite, gravity, jump physics, level — your first runnable Unity build.",
    emoji: "🦘",
  },
  {
    id: "FL07",
    track: "App Coding",
    title: "Storing data with Firebase",
    duration: "30 min",
    age: "Ages 14+",
    level: "Intermediate",
    accent: "#22A6DC",
    blurb: "Add a real backend to your app. Save & fetch user data with zero servers.",
    emoji: "🔥",
  },
  {
    id: "FL08",
    track: "Data + AI",
    title: "Train a classifier in 10 minutes",
    duration: "15 min",
    age: "Ages 14+",
    level: "Intermediate",
    accent: "#1A1A2E",
    blurb: "Use scikit-learn to train your first model on real-world data.",
    emoji: "🔬",
  },
];

const TRACKS = ["All", "Robotics", "Game Coding", "App Coding", "Data + AI"];

export default function LearnPage() {
  return (
    <main className="bg-[#FAF7F2] text-[#1A1A2E] selection:bg-[#D4FF1A] selection:text-[#1A1A2E] min-h-screen">
      <MarketingRevealController />
      <MarketingNav />

      {/* Hero */}
      <section className="relative pt-32 sm:pt-40 pb-16 overflow-hidden">
        <div
          aria-hidden
          className="absolute -top-20 right-1/4 h-[420px] w-[420px] rounded-full opacity-50 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(212,255,26,0.5) 0%, rgba(233,30,150,0.15) 50%, transparent 75%)",
            filter: "blur(60px)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-10" data-reveal>
            <Link
              href="/"
              className="font-mono text-[10px] sm:text-xs text-[#1A1A2E]/55 tracking-[0.3em] hover:text-[#E91E96] transition-colors"
            >
              ← BACK TO HOME
            </Link>
            <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
            <span className="font-mono text-[10px] sm:text-xs text-[#E91E96] tracking-[0.3em] font-bold">
              FREE / NO SIGNUP
            </span>
          </div>
          <h1
            className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-[#1A1A2E] max-w-4xl"
            data-reveal
          >
            Free lessons for
            <br />
            <span className="adv-grad-text italic">curious kids.</span>
          </h1>
          <p
            className="mt-8 max-w-2xl text-lg text-[#1A1A2E]/70 leading-relaxed"
            data-reveal
            style={{ ["--reveal-delay" as string]: "120ms" }}
          >
            Eight hand-picked intro lessons across our four tracks. Watch, follow
            along, and ship something. No payment, no email gate, no upsell at
            the end of the video.
          </p>

          {/* Track pills */}
          <div className="mt-10 flex flex-wrap gap-2" data-reveal style={{ ["--reveal-delay" as string]: "240ms" }}>
            {TRACKS.map((t, i) => (
              <span
                key={t}
                className={[
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest",
                  i === 0
                    ? "bg-[#1A1A2E] text-white"
                    : "border border-[#1A1A2E]/15 bg-white text-[#1A1A2E]/70",
                ].join(" ")}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Lessons grid */}
      <section className="relative pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FREE_LESSONS.map((lesson, i) => (
              <article
                key={lesson.id}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
                className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-25px_rgba(26,26,46,0.25)] hover:shadow-[0_25px_50px_-22px_rgba(26,26,46,0.35)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col"
              >
                <div
                  className="relative aspect-video flex items-center justify-center overflow-hidden"
                  style={{ background: `${lesson.accent}10` }}
                >
                  <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background: `radial-gradient(circle at 70% 30%, ${lesson.accent}30, transparent 60%)`,
                    }}
                  />
                  <span className="relative text-6xl select-none transition-transform duration-500 group-hover:scale-110">
                    {lesson.emoji}
                  </span>
                  <span
                    className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white font-bold"
                    style={{ background: lesson.accent }}
                  >
                    {lesson.track}
                  </span>
                  {/* Play badge */}
                  <span className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition-transform duration-500 group-hover:scale-110">
                    <svg className="h-4 w-4 text-[#1A1A2E]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#1A1A2E]/50 mb-2">
                    <span>{lesson.duration}</span>
                    <span className="h-1 w-1 rounded-full bg-[#1A1A2E]/30" />
                    <span>{lesson.age}</span>
                    <span className="h-1 w-1 rounded-full bg-[#1A1A2E]/30" />
                    <span style={{ color: lesson.accent }}>{lesson.level}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#1A1A2E] tracking-tight leading-snug">
                    {lesson.title}
                  </h3>
                  <p className="mt-2 text-xs text-[#1A1A2E]/60 leading-relaxed flex-1">
                    {lesson.blurb}
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#1A1A2E] uppercase tracking-widest hover:text-[#E91E96] transition-colors"
                  >
                    Start free lesson
                    <svg className="h-3 w-3 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Coming-soon note */}
          <div
            className="mt-12 rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 p-8 sm:p-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6"
            data-reveal
          >
            <div>
              <div className="font-mono text-[10px] text-[#E91E96] tracking-[0.3em] font-bold mb-2">
                COMING SOON
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#1A1A2E] tracking-tight">
                Want the full track?
              </h3>
              <p className="mt-2 text-sm text-[#1A1A2E]/65 max-w-xl">
                The free lessons get you started. Our paid tracks give your child
                an instructor, project materials, weekly progress, and a real
                portfolio.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/#trial"
                className="group inline-flex items-center gap-2 rounded-full bg-[#1A1A2E] px-5 py-3 text-xs font-bold text-white uppercase tracking-widest hover:bg-[#E91E96] transition-colors"
              >
                Book free trial
                <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/#pricing"
                className="inline-flex items-center gap-2 rounded-full border border-[#1A1A2E]/15 bg-white px-5 py-3 text-xs font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-[#FAF7F2] transition-colors"
              >
                See pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
      <WhatsAppButton />
      <AIChatWidget />
    </main>
  );
}
