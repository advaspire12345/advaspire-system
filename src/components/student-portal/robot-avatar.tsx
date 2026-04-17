"use client";

import { useEffect, useState } from "react";

export function RobotAvatar({ className = "" }: { className?: string }) {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 200);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Outer glow rings */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-36 h-8 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(0,229,255,0.15) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-28 h-4 rounded-full"
          style={{
            background: "radial-gradient(ellipse, rgba(0,229,255,0.25) 0%, transparent 70%)",
          }}
        />

        <svg
          width="180"
          height="220"
          viewBox="0 0 180 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_20px_rgba(0,255,255,0.2)]"
        >
          <defs>
            <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a2d50" />
              <stop offset="100%" stopColor="#0f1a30" />
            </linearGradient>
            <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>
            <linearGradient id="cyanGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#00e5ff" />
              <stop offset="100%" stopColor="#0891b2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="redGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Antenna with energy orb */}
          <line x1="90" y1="30" x2="90" y2="12" stroke="#4a5568" strokeWidth="3" strokeLinecap="round" />
          <circle cx="90" cy="8" r="5" fill="#00e5ff" filter="url(#glow)">
            <animate attributeName="r" values="4;6;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite" />
          </circle>
          {/* Secondary antenna lines */}
          <line x1="90" y1="30" x2="72" y2="18" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" />
          <line x1="90" y1="30" x2="108" y2="18" stroke="#4a5568" strokeWidth="2" strokeLinecap="round" />
          <circle cx="72" cy="16" r="3" fill="#e53e3e" opacity="0.7">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="108" cy="16" r="3" fill="#e53e3e" opacity="0.7">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" begin="0.75s" />
          </circle>

          {/* Head - with beveled look */}
          <rect x="48" y="32" width="84" height="62" rx="14" fill="url(#bodyGrad)" stroke="#00e5ff" strokeWidth="1.5" />
          {/* Head inner frame */}
          <rect x="52" y="36" width="76" height="54" rx="10" fill="none" stroke="#00e5ff" strokeWidth="0.5" opacity="0.3" />
          {/* Visor */}
          <rect x="56" y="44" width="68" height="28" rx="8" fill="#050d1a" stroke="#0e7490" strokeWidth="1" />

          {/* Eyes */}
          <circle cx="72" cy="58" r={blink ? 1 : 7} fill="#050d1a" />
          <circle cx="108" cy="58" r={blink ? 1 : 7} fill="#050d1a" />
          {!blink && (
            <>
              <circle cx="72" cy="58" r="5" fill="#00e5ff" filter="url(#glow)">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="108" cy="58" r="5" fill="#00e5ff" filter="url(#glow)">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Eye highlights */}
              <circle cx="70" cy="56" r="1.5" fill="white" opacity="0.7" />
              <circle cx="106" cy="56" r="1.5" fill="white" opacity="0.7" />
            </>
          )}

          {/* Mouth - animated */}
          <rect x="76" y="76" width="28" height="3" rx="1.5" fill="#00e5ff" opacity="0.5">
            <animate attributeName="width" values="28;20;28" dur="4s" repeatCount="indefinite" />
            <animate attributeName="x" values="76;80;76" dur="4s" repeatCount="indefinite" />
          </rect>

          {/* Neck */}
          <rect x="78" y="94" width="24" height="14" rx="6" fill="#2d3748" stroke="#4a5568" strokeWidth="0.5" />
          {/* Neck detail lines */}
          <line x1="82" y1="97" x2="82" y2="105" stroke="#4a5568" strokeWidth="0.5" />
          <line x1="90" y1="97" x2="90" y2="105" stroke="#4a5568" strokeWidth="0.5" />
          <line x1="98" y1="97" x2="98" y2="105" stroke="#4a5568" strokeWidth="0.5" />

          {/* Body - armored */}
          <rect x="36" y="108" width="108" height="70" rx="16" fill="url(#bodyGrad)" stroke="url(#redGrad)" strokeWidth="2" />
          {/* Body inner frame */}
          <rect x="42" y="114" width="96" height="58" rx="12" fill="none" stroke="#e53e3e" strokeWidth="0.5" opacity="0.3" />

          {/* Chest plate with hexagonal design */}
          <rect x="56" y="118" width="68" height="38" rx="10" fill="#050d1a" stroke="#e53e3e" strokeWidth="1" />
          {/* Chest hex grid decoration */}
          <path d="M72 130 L78 126 L84 130 L84 138 L78 142 L72 138 Z" fill="none" stroke="#e53e3e" strokeWidth="0.5" opacity="0.4" />
          <path d="M96 130 L102 126 L108 130 L108 138 L102 142 L96 138 Z" fill="none" stroke="#e53e3e" strokeWidth="0.5" opacity="0.4" />

          {/* Core reactor */}
          <circle cx="90" cy="137" r="10" fill="#e53e3e" opacity="0.08" />
          <circle cx="90" cy="137" r="7" fill="#e53e3e" opacity="0.15" />
          <circle cx="90" cy="137" r="4" fill="#e53e3e" filter="url(#redGlow)">
            <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Shoulder pads */}
          <rect x="22" y="108" width="22" height="12" rx="4" fill="url(#bodyGrad)" stroke="#e53e3e" strokeWidth="1" />
          <rect x="136" y="108" width="22" height="12" rx="4" fill="url(#bodyGrad)" stroke="#e53e3e" strokeWidth="1" />

          {/* Arms */}
          <rect x="16" y="120" width="20" height="48" rx="10" fill="url(#bodyGrad)" stroke="#4a5568" strokeWidth="1.5" />
          <rect x="144" y="120" width="20" height="48" rx="10" fill="url(#bodyGrad)" stroke="#4a5568" strokeWidth="1.5" />
          {/* Arm details */}
          <line x1="22" y1="135" x2="30" y2="135" stroke="#0e7490" strokeWidth="0.5" opacity="0.5" />
          <line x1="22" y1="145" x2="30" y2="145" stroke="#0e7490" strokeWidth="0.5" opacity="0.5" />
          <line x1="150" y1="135" x2="158" y2="135" stroke="#0e7490" strokeWidth="0.5" opacity="0.5" />
          <line x1="150" y1="145" x2="158" y2="145" stroke="#0e7490" strokeWidth="0.5" opacity="0.5" />

          {/* Hands */}
          <circle cx="26" cy="174" r="9" fill="#2d3748" stroke="#00e5ff" strokeWidth="1" />
          <circle cx="154" cy="174" r="9" fill="#2d3748" stroke="#00e5ff" strokeWidth="1" />
          <circle cx="26" cy="174" r="3" fill="#00e5ff" opacity="0.3" />
          <circle cx="154" cy="174" r="3" fill="#00e5ff" opacity="0.3" />

          {/* Legs */}
          <rect x="52" y="178" width="24" height="30" rx="10" fill="url(#bodyGrad)" stroke="#4a5568" strokeWidth="1.5" />
          <rect x="104" y="178" width="24" height="30" rx="10" fill="url(#bodyGrad)" stroke="#4a5568" strokeWidth="1.5" />

          {/* Feet - wider */}
          <rect x="44" y="206" width="40" height="10" rx="5" fill="#2d3748" stroke="#00e5ff" strokeWidth="1" />
          <rect x="96" y="206" width="40" height="10" rx="5" fill="#2d3748" stroke="#00e5ff" strokeWidth="1" />
          {/* Foot lights */}
          <rect x="54" y="210" width="20" height="2" rx="1" fill="#00e5ff" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="106" y="210" width="20" height="2" rx="1" fill="#00e5ff" opacity="0.4">
            <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2s" repeatCount="indefinite" begin="1s" />
          </rect>
        </svg>
      </div>
    </div>
  );
}
