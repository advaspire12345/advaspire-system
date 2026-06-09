const PLANS = [
  {
    n: "01",
    name: "MONTHLY",
    price: "RM 180",
    period: "/month · 4 sessions",
    description: "Pay-as-you-go. Perfect to start.",
    perks: ["4 × 1.5h classes", "Project materials", "Parent portal access"],
    accent: "#22A6DC",
    featured: false,
  },
  {
    n: "02",
    name: "QUARTERLY",
    price: "RM 480",
    period: "/3 months · 12 sessions",
    description: "Most parents pick this. Save RM 60.",
    perks: ["12 × 1.5h classes", "All project materials", "Parent portal access", "RM 60 off vs monthly"],
    accent: "#E91E96",
    featured: true,
  },
  {
    n: "03",
    name: "SEMI-ANNUAL",
    price: "RM 900",
    period: "/6 months · 24 sessions",
    description: "Biggest savings + free certification.",
    perks: ["24 × 1.5h classes", "All project materials", "Parent portal access", "Free completion certificate", "Up to RM 180 off"],
    accent: "#E81B23",
    featured: false,
  },
];

export function MarketingPricing() {
  return (
    <section id="pricing" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#22A6DC] tracking-[0.3em] font-bold">
            08 / PRICING
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Honest pricing.
              <br />
              <span className="adv-grad-text italic">No surprises.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              All packages include materials, parent reporting, and project access.
              Save more when you commit longer.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p, i) => {
            const isFeatured = p.featured;
            return (
              <div
                key={p.n}
                data-reveal
                style={{ ["--reveal-delay" as string]: `${i * 120}ms` }}
                className={[
                  "group relative overflow-hidden rounded-3xl p-8 flex flex-col ring-1 transition-all duration-500 hover:-translate-y-1.5",
                  isFeatured
                    ? "bg-[#1A1A2E] text-white ring-[#1A1A2E] shadow-[0_30px_60px_-20px_rgba(26,26,46,0.5)] md:scale-[1.03] md:-mt-2"
                    : "bg-white text-[#1A1A2E] ring-[#1A1A2E]/8 shadow-[0_10px_40px_-20px_rgba(26,26,46,0.2)] hover:shadow-[0_25px_50px_-20px_rgba(26,26,46,0.3)]",
                ].join(" ")}
              >
                {isFeatured && (
                  <span className="absolute top-0 right-0 bg-[#D4FF1A] text-[#1A1A2E] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-bl-2xl">
                    Most Popular
                  </span>
                )}
                {isFeatured && (
                  <div
                    aria-hidden
                    className="absolute -top-32 -right-32 h-64 w-64 rounded-full opacity-50"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(233,30,150,0.55) 0%, rgba(233,30,150,0) 70%)",
                      filter: "blur(20px)",
                    }}
                  />
                )}

                <div className="relative flex items-center justify-between mb-8">
                  <span className="font-mono text-xs tracking-widest font-bold" style={{ color: isFeatured ? "#D4FF1A" : p.accent }}>
                    {p.n}
                  </span>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: isFeatured ? "#D4FF1A" : p.accent }} />
                </div>
                <h3 className={["relative text-2xl font-bold tracking-tight", isFeatured ? "text-white" : "text-[#1A1A2E]"].join(" ")}>
                  {p.name}
                </h3>
                <div className="relative mt-3">
                  <div className={["text-5xl font-bold tracking-tight", isFeatured ? "text-white" : "text-[#1A1A2E]"].join(" ")}>
                    {p.price}
                  </div>
                  <div className={["mt-1 text-xs font-mono uppercase tracking-wider", isFeatured ? "text-white/55" : "text-[#1A1A2E]/45"].join(" ")}>
                    {p.period}
                  </div>
                </div>
                <p className={["relative mt-3 text-sm", isFeatured ? "text-white/75" : "text-[#1A1A2E]/65"].join(" ")}>
                  {p.description}
                </p>

                <ul className="relative mt-8 space-y-3 flex-1">
                  {p.perks.map((perk) => (
                    <li
                      key={perk}
                      className={["flex items-start gap-2.5 text-sm", isFeatured ? "text-white/85" : "text-[#1A1A2E]/80"].join(" ")}
                    >
                      <svg className="h-4 w-4 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke={isFeatured ? "#D4FF1A" : p.accent} strokeWidth="3">
                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href="#trial"
                  className={[
                    "relative mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-bold uppercase tracking-widest transition-all",
                    isFeatured
                      ? "bg-[#D4FF1A] text-[#1A1A2E] hover:bg-white"
                      : "bg-[#1A1A2E] text-white hover:bg-[#E91E96]",
                  ].join(" ")}
                >
                  {isFeatured ? "Book Free Trial" : "Start Free Trial"}
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
