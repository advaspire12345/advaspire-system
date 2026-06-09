// Stock photos from Unsplash — verified 200 OK. Swap `photoId` to update.
const TIERS = [
  {
    n: "01",
    label: "APPRENTICE",
    ages: "7-10",
    blurb: "Drag-and-drop coding, LEGO robotics, and gentle Scratch projects. Builds confidence through finished things.",
    accent: "#E81B23",
    tint: "rgba(232,27,35,0.08)",
    tools: ["Scratch", "LEGO Spike", "Micro:bit"],
    emoji: "🧱",
    photoId: "1611224923853-80b023f02d71",
  },
  {
    n: "02",
    label: "CRAFTSMAN",
    ages: "11-14",
    blurb: "Real Python and JavaScript. Arduino + sensors. Their first published game and their first deployable app.",
    accent: "#E91E96",
    tint: "rgba(233,30,150,0.08)",
    tools: ["Python", "Arduino", "Unity"],
    emoji: "⚙️",
    photoId: "1623479322729-28b25c16b011",
  },
  {
    n: "03",
    label: "EXPERTISE",
    ages: "15-18",
    blurb: "AI agents, full-stack apps, competition robotics. Portfolio-grade projects ready for STEM scholarships.",
    accent: "#22A6DC",
    tint: "rgba(34,166,220,0.10)",
    tools: ["Flutter", "TensorFlow", "Full-stack"],
    emoji: "🧠",
    photoId: "1573164574572-cb89e39749b4",
  },
];

const photoUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=700&fit=crop&q=78&auto=format`;

export function MarketingAgeTiers() {
  return (
    <section id="ages" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#22A6DC] tracking-[0.3em] font-bold">
            05 / JOURNEY
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              A path that
              <br />
              <span className="adv-grad-text italic">grows with them.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Three age tiers, each calibrated for how kids actually learn — not
              how textbooks pretend they do.
            </p>
          </div>
        </div>

        <div className="relative">
          {/* Connecting line on desktop */}
          <div aria-hidden className="hidden md:block absolute top-12 left-[10%] right-[10%] h-px bg-gradient-to-r from-[#E81B23] via-[#E91E96] to-[#22A6DC] opacity-30" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((t, i) => (
              <div
                key={t.n}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 140}ms` }}
                className="relative group"
              >
                {/* Numbered orb on the connector */}
                <div className="hidden md:flex absolute top-12 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-6 w-6 rounded-full bg-white shadow-lg ring-2 items-center justify-center" style={{ ["--ring-color" as string]: t.accent, boxShadow: `0 0 0 3px ${t.accent}` }}>
                  <span className="font-mono text-[10px] font-bold" style={{ color: t.accent }}>
                    {t.n}
                  </span>
                </div>

                <div className="mt-12 relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_12px_40px_-22px_rgba(26,26,46,0.25)] hover:shadow-[0_25px_55px_-22px_rgba(26,26,46,0.35)] hover:-translate-y-1.5 transition-all duration-500">
                  {/* Stock photo header */}
                  <div className="relative aspect-[5/3] overflow-hidden bg-[#1A1A2E]">
                    <img
                      src={photoUrl(t.photoId)}
                      alt={`${t.label} tier`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div
                      aria-hidden
                      className="absolute inset-0 mix-blend-multiply opacity-45 transition-opacity duration-500 group-hover:opacity-30"
                      style={{ background: t.accent }}
                    />
                    <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 to-transparent" />
                    <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest font-bold text-[#1A1A2E]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
                      Ages {t.ages}
                    </span>
                    <span className="absolute top-4 right-4 text-3xl select-none drop-shadow-lg">{t.emoji}</span>
                    <h3 className="absolute bottom-4 left-4 right-4 text-3xl sm:text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                      {t.label}
                    </h3>
                  </div>

                  <div className="relative p-8">
                    <p className="text-sm text-[#1A1A2E]/70 leading-relaxed">{t.blurb}</p>
                    <div className="mt-6 flex flex-wrap gap-1.5">
                      {t.tools.map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center text-[10px] font-mono uppercase tracking-wider bg-[#FAF7F2] text-[#1A1A2E]/70 border border-[#1A1A2E]/10 px-2.5 py-1.5 rounded-full"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
