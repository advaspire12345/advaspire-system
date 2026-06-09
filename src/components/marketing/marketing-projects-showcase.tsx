const PROJECTS = [
  {
    n: "01",
    title: "MAZE-SOLVER ROBOT",
    age: "Age 9",
    track: "Robotics",
    accent: "#E81B23",
    tint: "rgba(232,27,35,0.10)",
    description: "A LEGO bot that maps a maze with one sonar and finds the exit.",
    art: "robot",
  },
  {
    n: "02",
    title: "DRAGON RUN",
    age: "Age 11",
    track: "Game Coding",
    accent: "#E91E96",
    tint: "rgba(233,30,150,0.10)",
    description: "An endless runner with pixel art and 3 boss fights — built in Scratch.",
    art: "game",
  },
  {
    n: "03",
    title: "HOMEWORK TRACKER",
    age: "Age 13",
    track: "App Coding",
    accent: "#22A6DC",
    tint: "rgba(34,166,220,0.12)",
    description: "A Flutter app for siblings to track chores with streaks + rewards.",
    art: "app",
  },
  {
    n: "04",
    title: "PLANT DOCTOR",
    age: "Age 15",
    track: "Data + AI",
    accent: "#1A1A2E",
    tint: "rgba(212,255,26,0.25)",
    description: "Trained a small CNN to spot leaf disease from a phone camera.",
    art: "ai",
  },
];

export function MarketingProjectsShowcase() {
  return (
    <section id="projects" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E81B23] tracking-[0.3em] font-bold">
            03 / EVIDENCE
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Not theory.
              <br />
              <span className="adv-grad-text italic">Shipped projects.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Every kid leaves a term with something running. A sample from the
              last few cohorts.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PROJECTS.map((p, i) => (
            <article
              key={p.n}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 100}ms` }}
              className="group relative bg-white rounded-3xl p-6 ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-25px_rgba(26,26,46,0.25)] hover:shadow-[0_30px_50px_-25px_rgba(26,26,46,0.35)] hover:-translate-y-1 transition-all duration-500 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-xs tracking-widest font-bold" style={{ color: p.accent }}>
                  {p.n}
                </span>
                <span className="text-[10px] font-mono text-[#1A1A2E]/50 uppercase tracking-wider rounded-full bg-[#FAF7F2] px-2 py-1">
                  {p.age}
                </span>
              </div>
              <div
                className="aspect-[5/4] mb-6 rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.03]"
                style={{ background: p.tint }}
                data-clip-reveal
              >
                <ProjectArt kind={p.art} accent={p.accent === "#1A1A2E" ? "#D4FF1A" : p.accent} />
              </div>
              <div className="space-y-2 flex-1">
                <div className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: p.accent }}>
                  {p.track}
                </div>
                <h3 className="text-lg font-bold text-[#1A1A2E] tracking-tight">{p.title}</h3>
                <p className="text-xs text-[#1A1A2E]/60 leading-relaxed">{p.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectArt({ kind, accent }: { kind: string; accent: string }) {
  if (kind === "robot") {
    return (
      <svg viewBox="0 0 200 120" className="w-3/4 h-3/4">
        <rect x="60" y="20" width="80" height="60" rx="8" fill={accent} />
        <rect x="75" y="35" width="50" height="28" rx="4" fill="#1A1A2E" />
        <circle cx="92" cy="49" r="5" fill="#D4FF1A" />
        <circle cx="108" cy="49" r="5" fill="#D4FF1A" />
        <rect x="50" y="80" width="20" height="10" rx="3" fill="#1A1A2E" />
        <rect x="130" y="80" width="20" height="10" rx="3" fill="#1A1A2E" />
        <circle cx="60" cy="100" r="8" fill="#1A1A2E" />
        <circle cx="140" cy="100" r="8" fill="#1A1A2E" />
        <path d="M 100 20 L 100 10" stroke={accent} strokeWidth="2" strokeLinecap="round" />
        <circle cx="100" cy="8" r="3" fill="#D4FF1A" />
      </svg>
    );
  }
  if (kind === "game") {
    return (
      <div className="w-3/4 h-3/4 overflow-hidden rounded-lg ring-2 ring-[#1A1A2E]/10 bg-[#1A1A2E]">
        <div className="h-full flex items-end justify-around p-2">
          {[0.3, 0.5, 0.4, 0.7, 0.4, 0.6, 0.5].map((h, i) => (
            <div key={i} style={{ width: "8%", height: `${h * 100}%`, background: i === 3 ? accent : "#22A6DC" }} />
          ))}
        </div>
      </div>
    );
  }
  if (kind === "app") {
    return (
      <div className="rounded-xl ring-2 ring-[#1A1A2E]/15 shadow-lg" style={{ background: "#fafaff", width: "30%", aspectRatio: "9/19" }}>
        <div className="p-2 space-y-1.5">
          <div className="h-3 rounded" style={{ background: `${accent}40`, width: "60%" }} />
          <div className="h-6 rounded" style={{ background: accent, width: "100%" }} />
          <div className="h-2 rounded bg-black/10" style={{ width: "80%" }} />
          <div className="h-2 rounded bg-black/10" style={{ width: "60%" }} />
          <div className="h-2 rounded bg-black/10" style={{ width: "70%" }} />
        </div>
      </div>
    );
  }
  return (
    <svg viewBox="0 0 200 120" className="w-3/4 h-3/4">
      <circle cx="60" cy="60" r="6" fill={accent} />
      <circle cx="60" cy="30" r="4" fill={accent} opacity="0.5" />
      <circle cx="60" cy="90" r="4" fill={accent} opacity="0.5" />
      <circle cx="100" cy="50" r="6" fill={accent} />
      <circle cx="100" cy="80" r="6" fill={accent} />
      <circle cx="140" cy="60" r="8" fill={accent} />
      <line x1="60" y1="60" x2="100" y2="50" stroke={accent} strokeOpacity="0.4" strokeWidth="1" />
      <line x1="60" y1="60" x2="100" y2="80" stroke={accent} strokeOpacity="0.4" strokeWidth="1" />
      <line x1="100" y1="50" x2="140" y2="60" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" />
      <line x1="100" y1="80" x2="140" y2="60" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" />
    </svg>
  );
}
