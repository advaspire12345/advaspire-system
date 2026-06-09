const TOOLS = [
  "LEGO Spike",
  "Scratch",
  "Python",
  "Arduino",
  "Unity",
  "Roblox Studio",
  "Flutter",
  "Minecraft Edu",
  "Micro:bit",
  "Raspberry Pi",
  "JavaScript",
  "C# basics",
  "Blender",
  "TensorFlow Lite",
  "AI agents",
];

const ACCENTS = ["#E81B23", "#22A6DC", "#E91E96", "#1A1A2E"];

export function MarketingTechMarquee() {
  const items = [...TOOLS, ...TOOLS];
  return (
    <section className="relative py-8 bg-[#1A1A2E] overflow-hidden border-y-4 border-[#D4FF1A]">
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#1A1A2E] to-transparent z-10 pointer-events-none"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#1A1A2E] to-transparent z-10 pointer-events-none"
      />

      <div className="flex w-max animate-marquee gap-3 sm:gap-4">
        {items.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] ring-1 ring-white/15 px-5 py-2.5 text-sm font-bold text-white whitespace-nowrap"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: ACCENTS[i % ACCENTS.length] === "#1A1A2E" ? "#D4FF1A" : ACCENTS[i % ACCENTS.length] }}
            />
            {t}
          </span>
        ))}
      </div>
    </section>
  );
}
