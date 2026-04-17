"use client";

interface TopBarProps {
  name: string;
  level: number;
  adcoinBalance: number;
  photo: string | null;
  onLogout: () => void;
}

/* Coin icon — golden circle with "AC" */
function CoinIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="14" fill="#e5a835" stroke="#b8871a" strokeWidth="2" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#b8871a" strokeWidth="1" opacity="0.5" />
      <text
        x="16" y="17" textAnchor="middle" dominantBaseline="middle"
        fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="9"
      >AC</text>
    </svg>
  );
}

/* Star icon — 5-point star */
function StarIcon() {
  return (
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <polygon
        points="16,2 20.5,11.5 31,13 23.5,20.5 25,31 16,26 7,31 8.5,20.5 1,13 11.5,11.5"
        fill="#e5a835" stroke="#b8871a" strokeWidth="1.5"
      />
    </svg>
  );
}

/* Counter display — icon + dark square number + plus button */
function Counter({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: number;
}) {
  return (
    <div className="flex items-center">
      {/* Icon — overlaps left edge of the dark square */}
      <div className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 relative z-10">{icon}</div>
      {/* Dark square with number — no border, icon overlaps left, plus overlaps right */}
      <div
        className="h-5 sm:h-7 flex items-center justify-center px-5 sm:px-16 -ml-2 sm:-ml-3"
        style={{ background: "#0f1e2e" }}
      >
        <span
          className="text-white font-bold text-[10px] sm:text-sm tracking-wide"
          style={{ fontFamily: "monospace", textShadow: "0 0 4px rgba(255,255,255,0.15)" }}
        >
          {value}
        </span>
      </div>
      {/* Plus button — overlaps right edge of the dark square */}
      <button className="w-7 h-7 sm:w-9 sm:h-9 flex-shrink-0 -ml-2 sm:-ml-3 relative z-10 hover:brightness-125 transition-all active:scale-90">
        <img src="/portal/counter-plus.svg" alt="+" className="w-full h-full object-contain" />
      </button>
    </div>
  );
}

export function TopBar({ level, adcoinBalance, onLogout }: TopBarProps) {
  return (
    <header
      className="relative z-50 w-full"
      style={{
        backgroundImage: "url(/portal/deco-upper.svg)",
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        height: "clamp(48px, 7vw, 72px)",
        minHeight: "48px",
      }}
    >
      {/* Content positioned inside the bar — above the aurora */}
      <div
        className="absolute inset-0 flex items-center justify-between"
        style={{ paddingLeft: "3%", paddingRight: "3%", zIndex: 70 }}
      >
        {/* Left: Counters — sits in the main flat area */}
        <div className="flex items-center gap-3 sm:gap-24">
          <Counter icon={<CoinIcon />} value={adcoinBalance} />
          <Counter icon={<StarIcon />} value={level} />
        </div>

        {/* Right: Action buttons — sits in the right area before the concave */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Bell button */}
          <button
            className="relative w-11 h-11 sm:w-16 sm:h-16 flex-shrink-0 hover:brightness-110 transition-all active:scale-95"
          >
            <img src="/portal/btn-red-sm.svg" alt="bell" className="w-full h-full object-contain" />
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6" style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))" }}>
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>
          {/* Logout button */}
          <button
            onClick={onLogout}
            className="relative w-11 h-11 sm:w-16 sm:h-16 flex-shrink-0 hover:brightness-110 transition-all active:scale-95"
            title="Logout"
          >
            <img src="/portal/btn-red-sm.svg" alt="logout" className="w-full h-full object-contain" />
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 sm:w-6 sm:h-6" style={{ filter: "drop-shadow(0 0 2px rgba(255,255,255,0.5))" }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
      {/* Northern light — starts from middle-right, wraps continuously */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 1733 116"
        preserveAspectRatio="none"
        style={{ zIndex: 60 }}
      >
        <defs>
          <filter id="aurora-glow-upper"><feGaussianBlur stdDeviation="8" /></filter>
          <filter id="aurora-glow-upper-sm"><feGaussianBlur stdDeviation="3" /></filter>
        </defs>
        {/* Aurora glow — wide, soft green tail */}
        <path
          d="M0,114 L980,114 L1001,108 L1051,69 L1459,69 L1475,78 L1499,109 L1733,114"
          fill="none" stroke="#7dffdb" strokeWidth="14" strokeLinecap="round"
          filter="url(#aurora-glow-upper)" opacity="0.6"
          strokeDasharray="250 1800"
        >
          <animate attributeName="stroke-dashoffset" values="-632;-1765;250;-632" keyTimes="0;0.562;0.563;1" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Core streak — cyan light */}
        <path
          d="M0,114 L980,114 L1001,108 L1051,69 L1459,69 L1475,78 L1499,109 L1733,114"
          fill="none" stroke="#8DDDF5" strokeWidth="6" strokeLinecap="round"
          filter="url(#aurora-glow-upper-sm)" opacity="0.9"
          strokeDasharray="180 1800"
        >
          <animate attributeName="stroke-dashoffset" values="-702;-1835;180;-702" keyTimes="0;0.562;0.563;1" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Bright white center */}
        <path
          d="M0,114 L980,114 L1001,108 L1051,69 L1459,69 L1475,78 L1499,109 L1733,114"
          fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="120 1800"
        >
          <animate attributeName="stroke-dashoffset" values="-762;-1895;120;-762" keyTimes="0;0.562;0.563;1" dur="2.5s" repeatCount="indefinite" />
        </path>
      </svg>
    </header>
  );
}
