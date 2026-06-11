// Curated Unsplash photo IDs — swap to your own classroom shots in /public.
const BRANCHES = [
  {
    n: "01",
    name: "ADVASPIRE SEMENYIH",
    role: "HQ",
    city: "Semenyih, Selangor",
    accent: "#E81B23",
    tint: "rgba(232,27,35,0.08)",
    photoId: "1503676260728-1c00da094a0b",
  },
  {
    n: "02",
    name: "ADVASPIRE KEPONG",
    role: "BRANCH",
    city: "Kepong, Kuala Lumpur",
    accent: "#22A6DC",
    tint: "rgba(34,166,220,0.10)",
    photoId: "1517694712202-14dd9538aa97",
  },
];

const photoUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=1000&h=600&fit=crop&q=78&auto=format`;

export function MarketingBranches() {
  return (
    <section id="branches" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E91E96] tracking-[0.3em] font-bold">
            11 / VISIT US
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16">
          <div className="lg:col-span-7" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Two branches.
              <br />
              <span className="adv-grad-text italic">Pick your nearest.</span>
            </h2>
          </div>
          <div className="lg:col-span-5 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-md">
              Walk in any day during operating hours. Or book a trial below — we&apos;ll
              hold the door.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {BRANCHES.map((b, i) => (
            <div
              key={b.n}
              data-reveal
              style={{ ["--reveal-delay" as string]: `${i * 140}ms` }}
              className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_12px_40px_-22px_rgba(26,26,46,0.25)] hover:shadow-[0_30px_55px_-22px_rgba(26,26,46,0.35)] hover:-translate-y-1 transition-all duration-500"
            >
              {/* Stock classroom photo — swap `photoId` to update */}
              <div className="relative aspect-[16/9] overflow-hidden bg-[#1A1A2E]">
                <img
                  src={photoUrl(b.photoId)}
                  alt={`${b.name} classroom`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 mix-blend-multiply opacity-35"
                  style={{ background: b.accent }}
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                <span
                  className="absolute top-4 right-4 text-[10px] font-mono uppercase tracking-widest rounded-full px-3 py-1 text-white backdrop-blur-sm"
                  style={{ background: b.accent }}
                >
                  {b.role}
                </span>
              </div>

              <div className="relative p-8 sm:p-10">
                <div className="flex items-start justify-between mb-4">
                  <span className="font-mono text-xs tracking-widest font-bold" style={{ color: b.accent }}>
                    {b.n}
                  </span>
                </div>
                <h3 className="relative text-2xl sm:text-3xl font-bold text-[#1A1A2E] tracking-tight">{b.name}</h3>
                <div className="relative mt-3 text-xs font-mono text-[#1A1A2E]/55 uppercase tracking-widest">
                  📍 {b.city}
                </div>

                <div className="relative mt-8 flex flex-wrap gap-3">
                <a
                  href="https://wa.me/60173180089"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white uppercase tracking-widest hover:bg-[#1da851] transition-colors shadow-[0_10px_24px_-10px_rgba(37,211,102,0.6)]"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  WhatsApp
                </a>
                <a
                  href="tel:+60173180089"
                  className="inline-flex items-center gap-2 rounded-full border border-[#1A1A2E]/15 bg-[#FAF7F2] px-4 py-2.5 text-xs font-bold text-[#1A1A2E] uppercase tracking-widest hover:bg-white transition-colors"
                >
                  +60 17-318 0089
                </a>
              </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
