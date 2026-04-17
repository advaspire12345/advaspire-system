"use client";

interface ComingSoonTabProps {
  title: string;
  description: string;
}

export function ComingSoonTab({ title, description }: ComingSoonTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Lock icon using small red button */}
      <div className="relative mb-5">
        <div className="w-16 h-16 flex items-center justify-center">
          <img
            src="/portal/btn-red-sm.png"
            alt=""
            className="w-14 h-14 object-contain opacity-60"
            style={{ imageRendering: "pixelated" }}
          />
        </div>
        {/* Rotating ring */}
        <div
          className="absolute -inset-2 rounded-full border border-dashed animate-spin"
          style={{ borderColor: "rgba(196,90,90,0.2)", animationDuration: "20s" }}
        />
      </div>

      <div className="text-[#6a8a9f] text-[9px] font-bold tracking-[0.3em] mb-2" style={{ fontFamily: "monospace" }}>
        LOCKED MODULE
      </div>
      <h2
        className="text-xl font-bold text-amber-300 tracking-wider mb-3"
        style={{ fontFamily: "monospace", textShadow: "0 0 8px rgba(245,158,11,0.25), 2px 2px 4px rgba(0,0,0,0.5)" }}
      >
        {title}
      </h2>
      <p className="text-[#6a8a9f] text-xs max-w-xs leading-relaxed" style={{ fontFamily: "monospace" }}>
        {description}
      </p>

      {/* Divider */}
      <div className="w-16 h-px my-5" style={{ background: "linear-gradient(90deg, transparent, rgba(196,90,90,0.3), transparent)" }} />

      {/* Adcoin hint */}
      <div
        className="flex items-center gap-2 text-xs px-4 py-2 rounded"
        style={{
          fontFamily: "monospace",
          background: "rgba(229,168,53,0.06)",
          border: "1px solid rgba(229,168,53,0.12)",
          color: "#e5a835",
        }}
      >
        &#9733; Save your adcoins!
      </div>
    </div>
  );
}
