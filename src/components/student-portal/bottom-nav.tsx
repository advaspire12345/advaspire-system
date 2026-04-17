"use client";

export type TabId = "home" | "transfer" | "ranking" | "portfolio" | "shop" | "missions";

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const leftTabs: { id: TabId; label: string }[] = [
  { id: "home", label: "HOME" },
];

const rightTabs: { id: TabId; label: string }[] = [
  { id: "transfer", label: "TRANS" },
  { id: "ranking", label: "RANK" },
  { id: "shop", label: "SHOP" },
  { id: "portfolio", label: "PORT" },
  { id: "missions", label: "QUEST" },
];

const tabIcons: Record<TabId, React.ReactNode> = {
  home: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M3 12l9-9 9 9"/><path d="M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9"/>
    </svg>
  ),
  transfer: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M7 17l-4-4 4-4"/><path d="M3 13h13"/><path d="M17 7l4 4-4 4"/><path d="M21 11H8"/>
    </svg>
  ),
  ranking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M6 9H4.5a2.5 2.5 0 010-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 000-5C17 4 17 7 17 7"/>
      <path d="M4 22h16"/><path d="M10 22V8a2 2 0 012-2h0a2 2 0 012 2v14"/>
      <path d="M8 22v-5a2 2 0 012-2h4a2 2 0 012 2v5"/>
    </svg>
  ),
  shop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  ),
  portfolio: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
      <line x1="9" y1="7" x2="16" y2="7"/><line x1="9" y1="11" x2="14" y2="11"/>
    </svg>
  ),
  missions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
};

function NavButton({
  tab,
  isActive,
  onTabChange,
}: {
  tab: { id: TabId; label: string };
  isActive: boolean;
  onTabChange: (tab: TabId) => void;
}) {
  const btnImg = isActive ? "/portal/btn-yellow-md.svg" : "/portal/btn-red-md.svg";
  const neonColor = isActive ? "#7dffdb" : "#ffffff";
  const glowShadow = isActive
    ? "drop-shadow(0 0 3px rgba(125,255,219,0.8)) drop-shadow(0 0 6px rgba(125,255,219,0.4))"
    : "drop-shadow(0 0 2px rgba(255,255,255,0.6))";

  return (
    <button
      onClick={() => onTabChange(tab.id)}
      className={`relative transition-all active:scale-95 flex-shrink-0 w-[48px] sm:w-[clamp(80px,13vw,120px)] ${isActive ? "animate-bounce-slow" : ""}`}
    >
      <div
        className={`w-full relative ${isActive ? "brightness-110" : "brightness-90 hover:brightness-100"} transition-all`}
      >
        <img
          src={btnImg}
          alt={tab.label}
          className="w-full h-auto object-contain drop-shadow-lg"
        />
        {/* Icon + Text overlaid on the yellow/red face */}
        <div
          className="absolute flex flex-col items-center justify-center gap-[2px] sm:gap-1"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="w-[14px] h-[14px] sm:w-[22px] sm:h-[22px]"
            style={{
              color: neonColor,
              filter: glowShadow,
            }}
          >
            {tabIcons[tab.id]}
          </div>
          <span
            className="font-black tracking-wider text-center whitespace-nowrap"
            style={{
              fontFamily: "monospace",
              fontSize: "clamp(5px, 1.4vw, 11px)",
              color: neonColor,
              WebkitTextStroke: "1.5px black",
              paintOrder: "stroke fill",
              textShadow: isActive
                ? "0 0 8px rgba(125,255,219,0.7), 0 0 16px rgba(125,255,219,0.3)"
                : "0 0 6px rgba(255,255,255,0.5), 0 0 12px rgba(255,255,255,0.2)",
              lineHeight: 1,
            }}
          >
            {tab.label}
          </span>
        </div>
      </div>
    </button>
  );
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  /* The SVG concave notch spans ~22.8% to ~35.5% of the width.
     HOME sits left of the notch, the other 5 sit right of it.
     Buttons straddle the top edge of the bar — half above, half below. */
  return (
    <nav
      className="relative z-50 w-full overflow-visible"
      style={{
        backgroundImage: "url(/portal/deco-lower.svg)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "bottom center",
        height: "80px",
        minHeight: "80px",
      }}
    >
      {/* Button layer — above the aurora */}
      <div
        className="absolute left-0 right-0 flex items-start top-[-8px] sm:top-[-42px]"
        style={{ zIndex: 70 }}
      >
        {/* Left section — HOME, right-aligned before the concave */}
        <div
          className="flex items-start justify-end pr-1"
          style={{ width: "22%" }}
        >
          {leftTabs.map((tab) => (
            <NavButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onTabChange={onTabChange}
            />
          ))}
        </div>

        {/* Concave gap */}
        <div style={{ width: "13%" }} />

        {/* Right section — evenly spread across the remaining space */}
        <div className="flex items-start gap-0.5 sm:gap-8 pl-1">
          {rightTabs.map((tab) => (
            <NavButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onTabChange={onTabChange}
            />
          ))}
        </div>
      </div>
      {/* Northern light — stroke-dash along the top edge */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1734 132"
        preserveAspectRatio="none"
        style={{ zIndex: 60 }}
      >
        <defs>
          <filter id="aurora-glow-lower"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="aurora-glow-lower-sm"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {/* Aurora glow — wide, soft green tail */}
        <path
          d="M0,2 L395,2 L412,10 L434,33 L578,33 L603,8 L615,2 L1734,2"
          fill="none" stroke="#7dffdb" strokeWidth="14" strokeLinecap="round"
          filter="url(#aurora-glow-lower)" opacity="0.6"
          strokeDasharray="250 1800"
        >
          <animate attributeName="stroke-dashoffset" from="250" to="-1800" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Core streak — cyan light */}
        <path
          d="M0,2 L395,2 L412,10 L434,33 L578,33 L603,8 L615,2 L1734,2"
          fill="none" stroke="#8DDDF5" strokeWidth="6" strokeLinecap="round"
          filter="url(#aurora-glow-lower-sm)" opacity="0.9"
          strokeDasharray="180 1800"
        >
          <animate attributeName="stroke-dashoffset" from="180" to="-1870" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Bright white center */}
        <path
          d="M0,2 L395,2 L412,10 L434,33 L578,33 L603,8 L615,2 L1734,2"
          fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="120 1800"
        >
          <animate attributeName="stroke-dashoffset" from="120" to="-1930" dur="2.5s" repeatCount="indefinite" />
        </path>
      </svg>
    </nav>
  );
}
