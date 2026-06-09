// Curated Unsplash photo IDs (free for commercial use under the Unsplash license).
// To swap any photo: replace the `id` with another Unsplash photo ID, or point
// `src` at your own /public/<filename>.jpg.
const SHOTS = [
  {
    id: "1581091226825-a6a2a5aee158",
    span: "lg:col-span-5 lg:row-span-2",
    aspect: "aspect-[4/5]",
    label: "FOCUSED · APP CODING",
    accent: "#22A6DC",
  },
  {
    id: "1518770660439-4636190af475",
    span: "lg:col-span-4",
    aspect: "aspect-[5/4]",
    label: "CIRCUITS · ROBOTICS",
    accent: "#E81B23",
  },
  {
    id: "1607799279861-4dd421887fb3",
    span: "lg:col-span-3",
    aspect: "aspect-square",
    label: "HANDS-ON · LEGO",
    accent: "#E91E96",
  },
  {
    id: "1517694712202-14dd9538aa97",
    span: "lg:col-span-3",
    aspect: "aspect-[5/4]",
    label: "CODE · LIVE",
    accent: "#1A1A2E",
  },
  {
    id: "1503676260728-1c00da094a0b",
    span: "lg:col-span-4",
    aspect: "aspect-[5/4]",
    label: "BUILD · TEST · DEMO",
    accent: "#D4FF1A",
  },
];

const URL = (id: string, w = 800, h = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&q=78&auto=format`;

export function MarketingGallery() {
  return (
    <section id="gallery" className="relative bg-[#FAF7F2] overflow-hidden">
      <div
        aria-hidden
        className="absolute -top-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(34,166,220,0.45) 0%, rgba(212,255,26,0.15) 50%, transparent 75%)",
          filter: "blur(70px)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#22A6DC] tracking-[0.3em] font-bold">
            04 / INSIDE THE ROOM
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              See where the
              <br />
              <span className="adv-grad-text italic">magic happens.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Bright rooms, real benches, soldering irons that actually heat up.
              Step inside any session — visitors welcome, parents always.
            </p>
          </div>
        </div>

        {/* Asymmetric photo grid (Sweeping-style) */}
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4">
          {SHOTS.map((s, i) => (
            <figure
              key={s.id}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 90}ms` }}
              className={[
                "group relative overflow-hidden rounded-3xl ring-1 ring-[#1A1A2E]/8 bg-[#1A1A2E]",
                s.span,
                s.aspect,
              ].join(" ")}
            >
              {/* Stock photo from Unsplash. Replace `id` to swap or point to /public. */}
              <img
                src={URL(s.id, 1200, 1200)}
                alt={s.label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Color wash + dark bottom-fade so labels stay readable */}
              <div
                aria-hidden
                className="absolute inset-0 mix-blend-multiply opacity-40 transition-opacity duration-500 group-hover:opacity-25"
                style={{ background: s.accent }}
              />
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
              />
              <figcaption className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-[#1A1A2E] font-bold backdrop-blur-sm"
                  style={{ background: s.accent === "#1A1A2E" ? "#D4FF1A" : "white" }}
                >
                  {s.label}
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#1A1A2E] opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M7 17L17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-8 text-xs font-mono uppercase tracking-widest text-[#1A1A2E]/45 text-center" data-reveal>
          Photos are placeholders · Real classroom shots from our Semenyih &amp; Kepong branches drop in soon.
        </p>
      </div>
    </section>
  );
}
