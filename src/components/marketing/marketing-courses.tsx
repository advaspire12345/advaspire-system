// Stock photos from Unsplash — verified 200 OK. Swap `photoId` with another
// Unsplash photo ID, or change `src` below to `/your-photo.jpg` after dropping
// a file into /public.
const COURSES = [
  {
    n: "01",
    title: "ROBOTICS",
    blurb: "Build, wire, and program physical robots. Hands stay busy, minds stay curious.",
    tools: ["LEGO Spike", "Arduino", "Sensors", "3D parts"],
    accent: "#E81B23",
    tint: "rgba(232,27,35,0.08)",
    emoji: "🤖",
    photoId: "1485827404703-89b55fcc595e",
  },
  {
    n: "02",
    title: "GAME CODING",
    blurb: "Design and publish your own playable games — from puzzles to multiplayer worlds.",
    tools: ["Scratch", "Unity", "Roblox", "C# basics"],
    accent: "#E91E96",
    tint: "rgba(233,30,150,0.08)",
    emoji: "🎮",
    photoId: "1542751371-adc38448a05e",
  },
  {
    n: "03",
    title: "APP CODING",
    blurb: "Ship a working app to your parents' phone. Real screens, real interactions.",
    tools: ["Flutter", "Dart", "UI/UX", "Firebase"],
    accent: "#22A6DC",
    tint: "rgba(34,166,220,0.10)",
    emoji: "📱",
    photoId: "1581092795360-fd1ca04f0952",
  },
  {
    n: "04",
    title: "DATA + AI",
    blurb: "Train models, analyse the world, and let your robot make decisions on its own.",
    tools: ["Python", "Pandas", "ML basics", "AI agents"],
    accent: "#1A1A2E",
    tint: "rgba(212,255,26,0.20)",
    emoji: "🧠",
    photoId: "1551434678-e076c223a692",
  },
];

const photoUrl = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=600&fit=crop&q=78&auto=format`;

export function MarketingCourses() {
  return (
    <section id="tracks" className="relative bg-[#FAF7F2]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="flex items-center gap-4 mb-16" data-reveal>
          <span className="font-mono text-[10px] sm:text-xs text-[#E91E96] tracking-[0.3em] font-bold">
            02 / WHAT WE TEACH
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A]" />
          <div className="h-px flex-1 bg-[#1A1A2E]/15" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-20">
          <div className="lg:col-span-6" data-reveal>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[0.95] tracking-tight text-[#1A1A2E]">
              Four tracks.
              <br />
              <span className="adv-grad-text italic">One curious mind.</span>
            </h2>
          </div>
          <div className="lg:col-span-6 lg:pl-12 flex items-end" data-reveal style={{ ["--reveal-delay" as string]: "120ms" }}>
            <p className="text-base text-[#1A1A2E]/70 leading-relaxed max-w-xl">
              Pick the path your child connects with — or rotate through all four
              as they grow. Every track is project-based and ends with something
              they can demo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {COURSES.map((c, i) => (
            <article
              key={c.n}
              data-reveal
              style={{
                ["--reveal-delay" as string]: `${i * 80}ms`,
              }}
              className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-[#1A1A2E]/8 shadow-[0_10px_40px_-20px_rgba(26,26,46,0.18)] hover:shadow-[0_30px_60px_-25px_rgba(26,26,46,0.35)] transition-all duration-500 hover:-translate-y-1.5"
            >
              {/* Stock photo header */}
              <div className="relative aspect-[16/9] overflow-hidden bg-[#1A1A2E]">
                <img
                  src={photoUrl(c.photoId)}
                  alt={c.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 mix-blend-multiply opacity-40 transition-opacity duration-500 group-hover:opacity-25"
                  style={{ background: c.accent }}
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                <span
                  className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest font-bold"
                  style={{ color: c.accent }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.accent }} />
                  {c.n} / TRACK
                </span>
                <span className="absolute top-4 right-4 text-3xl select-none drop-shadow-lg">{c.emoji}</span>
              </div>

              <div className="relative p-8 sm:p-10">
                <h3 className="relative text-3xl sm:text-4xl font-bold text-[#1A1A2E] tracking-tight">
                  {c.title}
                </h3>
                <p className="relative mt-3 text-sm sm:text-base text-[#1A1A2E]/65 leading-relaxed">
                  {c.blurb}
                </p>

                <div className="relative mt-7 flex flex-wrap gap-1.5">
                  {c.tools.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center text-[10px] font-mono text-[#1A1A2E]/70 uppercase tracking-wider bg-[#FAF7F2] border border-[#1A1A2E]/10 px-2.5 py-1.5 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div
                  aria-hidden
                  className="relative mt-8 h-1 w-12 rounded-full transition-all duration-500 group-hover:w-24"
                  style={{ background: c.accent }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
