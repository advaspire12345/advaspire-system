const WORKS = [
  {
    title: "MOON LANDER",
    student: "Aiden, 12",
    track: "Game Coding",
    outcome: "Top-5 finalist · KL STEM Jam '25",
    accent: "#E91E96",
    art: "lander",
  },
  {
    title: "MAZE BOT v2",
    student: "Hana, 10",
    track: "Robotics",
    outcome: "Built in 3 sessions · Live demo at parent day",
    accent: "#E81B23",
    art: "maze",
  },
  {
    title: "CHORE TRACKER",
    student: "Marcus & Emma, 13",
    track: "App Coding",
    outcome: "Used daily by the family · Published to family TestFlight",
    accent: "#22A6DC",
    art: "chore",
  },
  {
    title: "LEAF DOCTOR AI",
    student: "Priya, 15",
    track: "Data + AI",
    outcome: "Scholarship portfolio piece · 89% accuracy on 4 plant species",
    accent: "#1A1A2E",
    art: "leaf",
  },
  {
    title: "TRAFFIC SIM",
    student: "Liam, 11",
    track: "Game Coding",
    outcome: "Shared on Roblox · 1.2k plays first week",
    accent: "#E91E96",
    art: "traffic",
  },
  {
    title: "SMART BIN",
    student: "Aisha, 14",
    track: "Robotics + AI",
    outcome: "School science fair, 2nd place",
    accent: "#22A6DC",
    art: "bin",
  },
];

export function MarketingPortfolio() {
  return (
    <section id="portfolio" className="relative bg-[#FAF7F2] overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 left-1/3 h-[420px] w-[420px] rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(233,30,150,0.4) 0%, rgba(34,166,220,0.15) 50%, transparent 75%)",
          filter: "blur(70px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E91E96] tracking-[0.3em] font-bold">
            07 / PORTFOLIO
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Real kids.
              <br />
              <span className="adv-grad-text italic">Real shipped work.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              A rolling wall of student projects from the last 12 months. Names
              shortened, parental consent on file. Every piece is something a
              kid actually finished, tested, and demoed.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {WORKS.map((w, i) => (
            <article
              key={w.title}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 80}ms` }}
              className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-22px_rgba(26,26,46,0.25)] hover:shadow-[0_30px_55px_-22px_rgba(26,26,46,0.35)] hover:-translate-y-1.5 transition-all duration-500"
            >
              <div
                className="aspect-[4/3] flex items-center justify-center relative overflow-hidden"
                style={{ background: `${w.accent}10` }}
              >
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-90"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${w.accent}25, transparent 60%)`,
                  }}
                />
                <div className="relative transition-transform duration-700 group-hover:scale-110">
                  <WorkArt kind={w.art} accent={w.accent === "#1A1A2E" ? "#D4FF1A" : w.accent} />
                </div>
                <span
                  className="absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-white font-bold"
                  style={{ background: w.accent }}
                >
                  {w.track}
                </span>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-lg font-bold text-[#1A1A2E] tracking-tight">{w.title}</h3>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-[#1A1A2E]/80">{w.student}</span>
                </div>
                <p className="text-xs text-[#1A1A2E]/65 leading-relaxed border-t border-[#1A1A2E]/8 pt-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#1A1A2E]/40 mr-1.5">
                    outcome
                  </span>
                  {w.outcome}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center" data-reveal>
          <a
            href="https://wa.me/60173180089?text=Hi%20Advaspire%2C%20can%20I%20see%20more%20student%20projects%3F"
            target="_blank"
            rel="noopener"
            className="group inline-flex items-center gap-3 rounded-full border border-[#1A1A2E]/15 bg-white pl-6 pr-2 py-2 text-xs font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-[#1A1A2E] hover:text-white transition-all"
          >
            Ask to see more
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D4FF1A] text-[#1A1A2E] group-hover:bg-[#E91E96] group-hover:text-white transition-colors">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function WorkArt({ kind, accent }: { kind: string; accent: string }) {
  const a = accent;
  if (kind === "lander") {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <circle cx="60" cy="80" r="40" fill={a} opacity="0.15" />
        <path d="M60 25 L50 55 H70 Z" fill={a} />
        <rect x="48" y="55" width="24" height="22" rx="3" fill={a} />
        <circle cx="60" cy="40" r="4" fill="#D4FF1A" />
        <path d="M50 77 L42 92 M70 77 L78 92" stroke={a} strokeWidth="3" strokeLinecap="round" />
        <path d="M40 92 L80 92" stroke={a} strokeWidth="2" />
        <circle cx="22" cy="30" r="1.5" fill="#1A1A2E" />
        <circle cx="100" cy="22" r="1" fill="#1A1A2E" />
        <circle cx="95" cy="55" r="1.5" fill="#1A1A2E" />
      </svg>
    );
  }
  if (kind === "maze") {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <rect x="20" y="20" width="80" height="80" rx="6" fill={a} opacity="0.15" />
        <path d="M20 40 H60 V20 M40 100 V60 H80 M80 100 V80 M40 40 V60" stroke={a} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="70" y="50" width="14" height="10" rx="2" fill={a} />
        <circle cx="75" cy="56" r="1.5" fill="#D4FF1A" />
        <circle cx="80" cy="56" r="1.5" fill="#D4FF1A" />
      </svg>
    );
  }
  if (kind === "chore") {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <rect x="38" y="20" width="44" height="80" rx="6" fill="white" stroke={a} strokeWidth="2" />
        <rect x="44" y="30" width="32" height="6" rx="2" fill={a} opacity="0.3" />
        <circle cx="48" cy="48" r="3" fill={a} />
        <rect x="55" y="46" width="20" height="4" rx="1" fill={a} opacity="0.5" />
        <circle cx="48" cy="60" r="3" fill={a} />
        <rect x="55" y="58" width="16" height="4" rx="1" fill={a} opacity="0.5" />
        <circle cx="48" cy="72" r="3" fill="white" stroke={a} strokeWidth="1.5" />
        <rect x="55" y="70" width="22" height="4" rx="1" fill={a} opacity="0.3" />
        <rect x="44" y="85" width="32" height="8" rx="2" fill={a} />
      </svg>
    );
  }
  if (kind === "leaf") {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <path d="M60 90 Q30 70 30 40 Q40 25 60 25 Q80 25 90 40 Q90 70 60 90 Z" fill={a} opacity="0.2" />
        <path d="M60 90 Q30 70 30 40 Q40 25 60 25 Q80 25 90 40 Q90 70 60 90 Z" stroke={a} strokeWidth="2" fill="none" />
        <path d="M60 30 V85" stroke={a} strokeWidth="1.5" />
        <path d="M60 50 Q45 50 38 60" stroke={a} strokeWidth="1" fill="none" />
        <path d="M60 65 Q75 65 82 75" stroke={a} strokeWidth="1" fill="none" />
        <circle cx="75" cy="42" r="6" fill="#E81B23" opacity="0.7" />
        <text x="69" y="46" fontSize="8" fill="white" fontWeight="bold">!</text>
      </svg>
    );
  }
  if (kind === "traffic") {
    return (
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <rect x="25" y="50" width="70" height="20" fill={a} opacity="0.15" />
        <rect x="25" y="50" width="70" height="2" fill={a} />
        <rect x="25" y="68" width="70" height="2" fill={a} />
        <rect x="40" y="55" width="18" height="10" rx="2" fill={a} />
        <rect x="65" y="55" width="14" height="10" rx="2" fill="#E81B23" />
        <circle cx="55" cy="35" r="10" fill="white" stroke={a} strokeWidth="2" />
        <circle cx="55" cy="32" r="2.5" fill="#E81B23" />
        <circle cx="55" cy="38" r="2.5" fill="#D4FF1A" />
        <line x1="55" y1="45" x2="55" y2="50" stroke={a} strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 120" className="w-32 h-32">
      <rect x="35" y="35" width="50" height="60" rx="6" fill={a} opacity="0.2" />
      <rect x="35" y="35" width="50" height="60" rx="6" stroke={a} strokeWidth="2" fill="none" />
      <circle cx="60" cy="55" r="6" fill="white" stroke={a} strokeWidth="2" />
      <path d="M52 55 L60 47 L68 55" stroke={a} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="42" y="70" width="36" height="3" rx="1" fill={a} opacity="0.5" />
      <rect x="42" y="78" width="24" height="3" rx="1" fill={a} opacity="0.3" />
      <rect x="42" y="86" width="30" height="3" rx="1" fill={a} opacity="0.3" />
      <circle cx="60" cy="28" r="4" fill="#D4FF1A" />
    </svg>
  );
}
