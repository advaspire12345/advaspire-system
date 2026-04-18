"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
}

const ITEMS: ShopItem[] = [
  { id: "1", name: "XP BOOST", description: "Double XP for 1 week", price: 100 },
  { id: "2", name: "AVATAR FRAME", description: "Legendary border", price: 250 },
  { id: "3", name: "NAME COLOR", description: "Custom name color", price: 150 },
  { id: "4", name: "BADGE", description: "Exclusive badge", price: 200 },
  { id: "5", name: "EMOTE PACK", description: "5 custom emotes", price: 300 },
  { id: "6", name: "TITLE", description: "Custom profile title", price: 180 },
  { id: "7", name: "SKIN PACK", description: "3 exclusive skins", price: 400 },
];

function ArrowSvg({ prefix, flip }: { prefix: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 130 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M11.7441 134.711C3.98363 126.439 3.98363 113.561 11.7441 105.289L61.8203 51.915C75.1532 37.7038 98.9998 47.1385 99 66.625L99 173.375C98.9998 192.862 75.1532 202.296 61.8203 188.085L11.7441 134.711Z" fill="#D9D9D9" stroke="black" strokeWidth="3"/>
      <path d="M13.5674 133C6.70947 125.69 6.70947 114.31 13.5674 107L63.6436 53.625C75.4262 41.0664 96.4998 49.4044 96.5 66.625L96.5 173.375C96.4998 190.596 75.4262 198.934 63.6436 186.375L13.5674 133Z" fill="#D46836" stroke="white" strokeWidth="2"/>
      <path d="M17.7096 132.136C10.5503 124.455 10.5503 112.545 17.7096 104.864L60.3695 59.0936C72.7507 45.8097 95 54.5707 95 72.7298L95 164.27C95 182.429 72.7507 191.19 60.3695 177.906L17.7096 132.136Z" fill={`url(#${prefix}0)`}/>
      <path d="M20.6642 132.621C12.1932 124.714 12.1933 111.286 20.6643 103.379L61.3533 65.4008C74.1375 53.4682 95 62.5337 95 80.0216L95 155.978C95 173.466 74.1375 182.532 61.3533 170.599L20.6642 132.621Z" fill="#FBA73F"/>
      <path d="M44.8866 123.646C42.7814 121.671 42.7814 118.329 44.8866 116.354L68.5789 94.1256C71.7718 91.1301 77 93.3939 77 97.772V142.228C77 146.606 71.7718 148.87 68.5789 145.874L44.8866 123.646Z" fill="#D46836"/>
      <ellipse cx="78.3886" cy="55.8832" rx="6" ry="3" transform="rotate(8.80601 78.3886 55.8832)" fill="white"/>
      <defs>
        <linearGradient id={`${prefix}0`} x1="65" y1="6.99998" x2="65" y2="106.166" gradientUnits="userSpaceOnUse">
          <stop offset="0.65" stopColor="#FDC990"/>
          <stop offset="1" stopColor="#F57E3B"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function useCardsPerView() {
  const [count, setCount] = useState(3);
  const [gap, setGap] = useState(12);

  const calc = useCallback(() => {
    const w = window.innerWidth;
    if (w >= 1024) { setCount(4); setGap(8); }
    else if (w >= 640) { setCount(3); setGap(6); }
    else { setCount(2); setGap(5); }
  }, []);

  useEffect(() => {
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, [calc]);

  return { count, gap };
}

export function ShopTab() {
  const { count: cardsPerView, gap: gapPx } = useCardsPerView();
  const [startIndex, setStartIndex] = useState(0);

  // Clamp startIndex on resize so we don't overshoot
  useEffect(() => {
    const maxStart = Math.max(0, ITEMS.length - cardsPerView);
    if (startIndex > maxStart) setStartIndex(maxStart);
  }, [startIndex, cardsPerView]);

  const hasPrev = startIndex > 0;
  const hasNext = startIndex + cardsPerView < ITEMS.length;

  const containerRef = useRef<HTMLDivElement>(null);
  const [cardStep, setCardStep] = useState(0);

  // Measure one card width + gap from the container
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cards = container.children;
    if (cards.length < 2) {
      if (cards.length === 1) setCardStep(cards[0].getBoundingClientRect().width);
      return;
    }
    // step = distance between left edges of two adjacent cards (card width + gap)
    const left0 = cards[0].getBoundingClientRect().left;
    const left1 = cards[1].getBoundingClientRect().left;
    setCardStep(left1 - left0);
  }, []);

  useEffect(() => {
    // Delay measurement to after layout paint for accurate values
    const raf = requestAnimationFrame(() => measure());
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
    };
  }, [measure, cardsPerView, gapPx]);

  // Touch swipe support
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);

  const maxStart = Math.max(0, ITEMS.length - cardsPerView);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    isSwiping.current = true;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping.current) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
    setDragOffset(touchDeltaX.current);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const threshold = cardStep * 0.25;
    if (touchDeltaX.current < -threshold) {
      setStartIndex((i) => Math.min(maxStart, i + 1));
    } else if (touchDeltaX.current > threshold) {
      setStartIndex((i) => Math.max(0, i - 1));
    }
    setDragOffset(0);
  }, [cardStep, maxStart]);

  const baseOffset = -(startIndex * cardStep);
  const offset = baseOffset + dragOffset;

  return (
    <div className="relative flex items-center w-full max-w-5xl mx-auto gap-2 sm:gap-3">
      {/* Left arrow — always visible, dimmed when no prev */}
      <button
        onClick={() => setStartIndex((i) => Math.max(0, i - 1))}
        disabled={!hasPrev}
        className="flex-shrink-0 w-[28px] sm:w-[38px] md:w-[48px] bg-transparent border-0 p-0 cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
        style={{ opacity: hasPrev ? 1 : 0.3 }}
      >
        <ArrowSvg prefix="sl" />
      </button>

      {/* Cards — overflow hidden viewport with sliding strip */}
      <div
        className="flex-1 overflow-hidden touch-pan-y"
        style={{ paddingBottom: "5%" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          ref={containerRef}
          className={`flex ${dragOffset === 0 ? "transition-transform duration-400 ease-in-out" : ""}`}
          style={{ transform: `translateX(${offset}px)`, gap: `${gapPx}px` }}
        >
          {ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0"
              style={{ width: `calc((100% - ${(cardsPerView - 1) * gapPx}px) / ${cardsPerView})` }}
            >
              <div
                className="relative w-full"
                style={{
                  aspectRatio: "300/632",
                  backgroundImage: "url(/portal/shop-card.svg)",
                  backgroundSize: "100% 100%",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <div className="absolute inset-0 flex flex-col items-center" style={{ padding: "18% 10% 0" }}>
                  <div className="text-center">
                    <h3
                      className="text-amber-300 font-bold tracking-wider"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "clamp(9px, 1.8vw, 14px)",
                        textShadow: "0 0 8px rgba(245,158,11,0.4)",
                      }}
                    >
                      {item.name}
                    </h3>
                    <p
                      className="text-[#8aa8c0] mt-1"
                      style={{ fontFamily: "monospace", fontSize: "clamp(7px, 1.3vw, 10px)" }}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Button straddles the bottom edge — half inside, half outside */}
                <button
                  className="absolute left-[10%] right-[10%] hover:brightness-110 active:scale-[0.98] transition-all"
                  style={{ bottom: 0, transform: "translateY(50%)" }}
                >
                  <img src="/portal/btn-red-long.svg" alt="" className="h-11 sm:h-16 w-auto mx-auto" />
                  <span
                    className="absolute inset-0 flex items-center justify-center font-bold text-white tracking-wider"
                    style={{ fontFamily: "monospace", fontSize: "clamp(7px, 1.4vw, 11px)" }}
                  >
                    {item.price} AC
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right arrow — always visible, dimmed when no next */}
      <button
        onClick={() => setStartIndex((i) => Math.min(ITEMS.length - cardsPerView, i + 1))}
        disabled={!hasNext}
        className="flex-shrink-0 w-[28px] sm:w-[38px] md:w-[48px] bg-transparent border-0 p-0 cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
        style={{ opacity: hasNext ? 1 : 0.3 }}
      >
        <ArrowSvg prefix="sr" flip />
      </button>
    </div>
  );
}
