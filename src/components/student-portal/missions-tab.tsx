"use client";

import { useRef, useCallback, useState, useEffect } from "react";

interface MissionsTabProps {
  studentName: string;
}

export function MissionsTab({ studentName }: MissionsTabProps) {
  const [arrowBounce, setArrowBounce] = useState(false);
  const [arrowClicked, setArrowClicked] = useState(false);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const totalSquares = 6;

  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const wheelAccum = useRef(0);
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Measure square step
  const measureStep = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const squares = el.querySelectorAll<HTMLElement>("[data-square]");
    if (squares.length < 2) {
      if (squares.length === 1) setStep(squares[0].offsetHeight);
      return;
    }
    setStep(squares[1].getBoundingClientRect().top - squares[0].getBoundingClientRect().top);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => measureStep());
    window.addEventListener("resize", measureStep);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", measureStep); };
  }, [measureStep]);

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(totalSquares - 2, index));
    setScrollIndex(clamped);
    setDragOffset(0);
  }, []);

  // Non-passive wheel listener to prevent page scroll
  const scrollIndexRef = useRef(scrollIndex);
  scrollIndexRef.current = scrollIndex;
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const threshold = (stepRef.current || 60) * 0.5;
      wheelAccum.current += e.deltaY;
      if (Math.abs(wheelAccum.current) >= threshold) {
        const dir = Math.sign(wheelAccum.current);
        wheelAccum.current = 0;
        goTo(scrollIndexRef.current + dir);
      }
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [goTo]);

  const scrollUp = useCallback(() => {
    if (!arrowClicked) setArrowClicked(true);
    goTo(scrollIndex + 1);
    setArrowBounce(true);
    setTimeout(() => setArrowBounce(false), 400);
  }, [scrollIndex, goTo, arrowClicked]);

  // Mouse drag
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    dragStartY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    setDragOffset(e.clientY - dragStartY.current);
  }, []);

  const onPointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const threshold = (step || 60) * 0.25;
    if (dragOffset < -threshold) {
      goTo(scrollIndex + 1);
    } else if (dragOffset > threshold) {
      goTo(scrollIndex - 1);
    } else {
      setDragOffset(0);
    }
  }, [dragOffset, scrollIndex, goTo]);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-0 w-full mt-6 sm:mt-0">
      {/* Vertical list of squares beside spaceship (left) */}
      <style>{`
        @keyframes arrow-pulse {
          0%, 100% { transform: scale(1) translateY(0); }
          15% { transform: scale(1.3) translateY(-4px); }
          30% { transform: scale(1) translateY(0); }
          45% { transform: scale(1.3) translateY(-4px); }
          60% { transform: scale(1) translateY(0); }
        }
      `}</style>
      <div className="flex-shrink-0 self-end mr-2 sm:mr-4 z-20 flex flex-col items-center gap-1 sm:gap-1.5">
        {/* Up arrow */}
        <button
          onClick={scrollUp}
          className="flex-shrink-0 bg-transparent border-0 p-0 cursor-pointer hover:scale-110 active:scale-95"
          style={{
            transform: arrowBounce ? "translateY(-6px)" : "translateY(0)",
            transition: "transform 0.2s ease-out",
            animation: arrowClicked ? "none" : "arrow-pulse 3s ease-in-out infinite",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 sm:w-6 sm:h-6" style={{ filter: "drop-shadow(0 0 6px rgba(125,255,219,0.8))", transition: "filter 0.2s" }}>
            <path d="M12 3L4 11M12 3L20 11" stroke="#7dffdb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 11L4 19M12 11L20 19" stroke="#7dffdb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div
          ref={viewportRef}
          className="overflow-hidden touch-none cursor-grab active:cursor-grabbing"
          style={{ maxHeight: "clamp(140px, 22vw, 250px)" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
        <div
          ref={containerRef}
          className={`flex flex-col gap-1 sm:gap-1.5 ${dragOffset === 0 ? "transition-transform duration-300 ease-out" : ""}`}
          style={{ transform: `translateY(${-scrollIndex * step + dragOffset}px)` }}
        >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} data-square className="w-[55px] sm:w-[100px] flex-shrink-0">
            <svg viewBox="0 0 186 186" fill="none" className="w-full h-full">
              <rect x="1.5" y="1.5" width="183" height="183" rx="21.5" fill={`url(#msq${i})`} stroke="black" strokeWidth="3"/>
              <rect x="11.5" y="11.5" width="163" height="163" rx="16.5" fill="#243D5B" stroke="black" strokeWidth="3"/>
              <defs>
                <linearGradient id={`msq${i}`} x1="93" y1="3" x2="93" y2="183" gradientUnits="userSpaceOnUse">
                  <stop offset="0.8" stopColor="#1D4965"/>
                  <stop offset="0.8085" stopColor="#1C3D52"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        ))}
        </div>
        </div>
      </div>

      {/* Spaceship on TOP (mobile) / LEFT (desktop) */}
      <div className="flex-shrink-0 self-center sm:self-end relative mb-16 sm:mb-0 sm:mr-4 mt-8 sm:mt-0 z-30 animate-spaceship-float">
        {/* Light beams */}
        <img
          src="/portal/light-outer.svg"
          alt=""
          className="absolute left-1/2 -translate-x-1/2 z-[0] w-[120%] h-[80px] sm:h-[180px] animate-light-on"
          style={{ bottom: "70%" }}
        />
        <img
          src="/portal/light-inner.svg"
          alt=""
          className="absolute left-1/2 -translate-x-1/2 z-[1] w-[95%] h-[70px] sm:h-[160px] animate-light-on"
          style={{ bottom: "70%", animationDelay: "0.4s" }}
        />
        <img
          src="/portal/spaceship.svg"
          alt=""
          className="w-[100px] sm:w-[240px] h-auto relative z-10"
        />
        {/* Flames */}
        <div className="absolute left-1/2 -translate-x-1/2 z-[1] bottom-[-38px] sm:bottom-[-100px]" style={{ width: "62%" }}>
          <img
            src="/portal/flame-outer.svg"
            alt=""
            className="w-full h-[50px] sm:h-[150px] animate-flame-outer"
            style={{ transformOrigin: "top center" }}
          />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 z-[2] bottom-[-33px] sm:bottom-[-95px]" style={{ width: "57%" }}>
          <img
            src="/portal/flame-inner.svg"
            alt=""
            className="w-full h-[45px] sm:h-[140px] animate-flame-inner"
            style={{ transformOrigin: "top center" }}
          />
        </div>
        {/* Name plate + tick button */}
        <div className="absolute bottom-[3px] sm:bottom-[10px] left-0 right-0 flex items-center justify-center gap-0.5 sm:gap-1 z-20">
          <div className="relative flex-shrink-0">
            <img src="/portal/name-plate.svg" alt="" className="w-[60px] sm:w-[140px] h-auto" />
            <span
              className="absolute font-bold tracking-wider text-white uppercase whitespace-nowrap flex items-center justify-center"
              style={{
                fontFamily: "monospace",
                fontSize: "clamp(5px, 1.2vw, 14px)",
                top: "9%",
                left: "8%",
                width: "84%",
                height: "71%",
              }}
            >
              {studentName}
            </span>
          </div>
          {/* Tick button */}
          <button className="relative flex-shrink-0 hover:brightness-110 active:scale-95 transition-all">
            <img src="/portal/btn-red-md.svg" alt="" className="w-5 h-5 sm:w-10 sm:h-10 object-contain" />
            <svg
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-4 sm:h-4 pointer-events-none"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="#00FF1A"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Right side (desktop) / Bottom (mobile): sign + board */}
      <div className="relative w-full sm:flex-1 max-w-lg">
        {/* Sign */}
        <div
          className="absolute z-[1] left-1/2 -translate-x-1/2 w-[180px] sm:w-[280px] top-[-45px] sm:top-[-68px]"
        >
          <img src="/portal/rank-sign.svg" alt="" className="w-full h-auto" />
          <div
            className="absolute flex items-center justify-center"
            style={{
              top: "6%",
              left: "16%",
              width: "68%",
              height: "46%",
            }}
          >
            <span
              className="font-black tracking-[0.15em]"
              style={{
                fontFamily: "monospace",
                fontSize: "clamp(6px, 1.6vw, 13px)",
                color: "#7dffdb",
                WebkitTextStroke: "1px black",
                paintOrder: "stroke fill",
                textShadow: "0 0 8px rgba(125,255,219,0.7), 0 0 16px rgba(125,255,219,0.3)",
              }}
            >
              MISSIONS
            </span>
          </div>
        </div>

        {/* Left handle */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute z-[1] w-[20px] sm:w-[35px] h-[60px] sm:h-[100px]"
          style={{ left: 0, top: "50%", transform: "translateX(-50%) translateY(-50%)" }}
        />
        {/* Right handle */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute z-[1] w-[20px] sm:w-[35px] h-[60px] sm:h-[100px]"
          style={{ right: 0, top: "50%", transform: "translateX(50%) translateY(-50%) scaleX(-1)" }}
        />

        {/* Board */}
        <div
          className="relative z-10 rounded-xl"
          style={{
            backgroundImage: "url(/portal/rank-board.svg)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            minHeight: "auto",
            padding: "clamp(16px, 3vw, 28px) 0",
          }}
        >
          {/* Mission squares grid */}
          <div className="flex items-center justify-center px-4 sm:px-6">
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 w-full max-w-md">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="aspect-square">
                  <svg viewBox="0 0 183 183" fill="none" className="w-full h-full">
                    <rect width="180" height="180" rx="20" fill="#1A2A47" />
                    <rect x="3" y="3" width="180" height="180" rx="20" fill="#2B5371" />
                    <rect x="48" y="48" width="90" height="90" rx="20" fill="#839DB0" />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
