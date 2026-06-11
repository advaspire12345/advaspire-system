const REASONS = [
  { n: "01", title: "SMALL CLASSES, BIG FOCUS", body: "Capped class sizes so every child gets real instructor time — not just a stream they passively watch.", accent: "#E81B23" },
  { n: "02", title: "PROJECTS, NOT LESSONS", body: "Every term ends with something they built, ran, and can demo to family. Real outcomes parents can see.", accent: "#E91E96" },
  { n: "03", title: "CERTIFIED INSTRUCTORS", body: "Educators trained in both the tech AND in teaching young learners. Working with kids since 2018.", accent: "#22A6DC" },
  { n: "04", title: "PORTFOLIO THAT OPENS DOORS", body: "By age 14 your child has shipped games, apps, and robots. We help compile a portfolio for scholarships.", accent: "#1A1A2E" },
  { n: "05", title: "CURRICULUM THAT PIVOTS", body: "We update tracks every year so kids learn current tools — Python, AI agents, Unity — not yesterday's stack.", accent: "#E81B23" },
  { n: "06", title: "PARENT-FRIENDLY VISIBILITY", body: "Weekly progress, attendance, and project photos — all in your portal. No guessing what your child did today.", accent: "#22A6DC" },
];

export function MarketingWhyUs() {
  return (
    <section id="why" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#1A1A2E] tracking-[0.3em] font-bold">
            06 / DIFFERENCE
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Success measured in
              <br />
              <span className="adv-grad-text italic">things they made.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Not screen time. Not certificates collecting dust. Six things that
              make Advaspire different from the average after-school programme.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {REASONS.map((r, i) => (
            <div
              key={r.n}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 70}ms` }}
              className="group relative overflow-hidden rounded-3xl bg-white p-7 ring-1 ring-[#1A1A2E]/8 shadow-[0_8px_30px_-15px_rgba(26,26,46,0.2)] hover:shadow-[0_25px_45px_-20px_rgba(26,26,46,0.3)] hover:-translate-y-1 transition-all duration-500"
            >
              <div
                aria-hidden
                className="absolute top-0 left-0 h-1 w-full transition-all duration-500 group-hover:h-1.5"
                style={{ background: r.accent }}
              />
              <div className="font-mono text-xs tracking-widest font-bold mb-4" style={{ color: r.accent }}>
                {r.n}
              </div>
              <h3 className="text-lg font-bold text-[#1A1A2E] tracking-tight mb-2.5">{r.title}</h3>
              <p className="text-sm text-[#1A1A2E]/65 leading-relaxed">{r.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
