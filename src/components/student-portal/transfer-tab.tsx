"use client";

import { useState, useRef } from "react";

interface SearchResult {
  id: string;
  name: string;
  studentId: string | null;
  photo: string | null;
  coins: number;
}

interface TransferTabProps {
  currentStudentName: string;
  adcoinBalance: number;
  onBalanceChange: () => void;
}

export function TransferTab({ currentStudentName, adcoinBalance, onBalanceChange }: TransferTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [recipientOpen, setRecipientOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<SearchResult | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/student-portal/search-students?query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
  };

  const openRecipientSearch = () => {
    setRecipientOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeRecipientSearch = () => {
    setRecipientOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const selectStudent = (s: SearchResult) => {
    setSelectedStudent(s);
    closeRecipientSearch();
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(""); setSuccess("");
    if (!selectedStudent) { setError("Select a recipient"); return; }
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) { setError("Invalid amount"); return; }
    if (numAmount > adcoinBalance) { setError("Insufficient balance"); return; }
    if (!password) { setError("Password required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/student-portal/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: selectedStudent.id, amount: numAmount, message: message.trim() || undefined, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Transfer failed"); return; }
      setSuccess(`Sent ${numAmount} AC to ${selectedStudent.name}`);
      setSelectedStudent(null); setAmount(""); setMessage(""); setPassword(""); onBalanceChange();
    } catch { setError("Transfer failed"); }
    finally { setLoading(false); }
  };

  /* ── sci-fi field styles (same as transfer-modal) ── */
  const fieldBox: React.CSSProperties = {
    background: "#397392",
    borderRadius: "6px",
    padding: "8px",
    position: "relative",
    boxSizing: "border-box",
  };
  const fieldLabel: React.CSSProperties = {
    position: "absolute",
    top: "-8px",
    left: "10px",
    background: "transparent",
    color: "#8DDDF5",
    fontSize: "9px",
    fontWeight: 800,
    fontFamily: "monospace",
    letterSpacing: "0.18em",
    padding: "0",
    lineHeight: 1.3,
    WebkitTextStroke: "3px #1C3752",
    paintOrder: "stroke fill",
    textShadow: "0 0 6px rgba(141,221,245,0.4)",
  };
  const fieldInput: React.CSSProperties = {
    background: "#1C3752",
    border: "none",
    borderRadius: "5px",
    fontFamily: "monospace",
    width: "100%",
    minWidth: 0,
    padding: "8px 10px 8px 28px",
    color: "#fff",
    fontSize: "clamp(11px, 2.5vw, 13px)",
    outline: "none",
    boxSizing: "border-box",
  };
  const fieldIconWrap: React.CSSProperties = {
    position: "absolute",
    left: "14px",
    bottom: "15px",
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  };

  const hasRecipient = !!selectedStudent;

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-0 w-full mt-6 sm:mt-0">
      <style>{`
        .spaceship-container {
          --sender-shrink: scale(0.9) translate(-60px, 0);
          --recipient-show: scale(1) translate(60px, 0);
          --recipient-hide: scale(0.3) translate(90px, 0);
          --seq-delay: 0.8s;
        }
        @media (min-width: 640px) {
          .spaceship-container {
            --sender-shrink: scale(0.55) translate(-340px, -145px);
            --recipient-show: scale(1) translate(25px, 0);
            --recipient-hide: scale(0.3) translate(90px, 0);
            --seq-delay: 1.35s;
          }
        }
        @keyframes linkage-mobile-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes linkage-top-anim {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(1px); }
        }
        @keyframes linkage-bottom-anim {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes linkage-draw-h {
          from { clip-path: inset(0 100% 0 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes linkage-draw-v {
          from { clip-path: inset(0 0 100% 0); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes linkage-draw-rect {
          from { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes linkage-neon-trace {
          0% { top: 0px; left: 0px; opacity: 1; }
          17% { top: 0px; left: 12px; }
          18% { top: 0px; left: 12px; }
          41% { top: 40px; left: 12px; }
          59% { top: 40px; left: 12px; }
          82% { top: 82px; left: 12px; }
          83% { top: 82px; left: 12px; }
          97% { top: 82px; left: 24px; opacity: 1; }
          100% { top: 82px; left: 24px; opacity: 0; }
        }
        @keyframes linkage-draw-h-right {
          from { clip-path: inset(0 0 0 100%); }
          to { clip-path: inset(0 0 0 0); }
        }
        @keyframes linkage-draw-rect-mobile {
          from { transform: translate(-50%, -120%) scaleX(0); opacity: 0; }
          to { transform: translate(-50%, -120%) scaleX(1); opacity: 1; }
        }
        @keyframes linkage-neon-trace-mobile {
          0% { left: 25px; top: 50%; opacity: 1; }
          30% { left: 35px; top: 50%; }
          45% { left: 40px; top: 50%; }
          55% { left: 40px; top: 50%; }
          70% { left: 45px; top: 50%; }
          95% { left: 55px; top: 50%; opacity: 1; }
          100% { left: 55px; top: 50%; opacity: 0; }
        }
      `}</style>
      {/* Spaceships section */}
      <div className="spaceship-container flex-shrink-0 self-center sm:self-end relative mb-16 sm:mb-0 sm:mr-4 mt-8 sm:mt-0 z-30">

        {/* Sender spaceship — big by default, shrinks to small position when recipient selected */}
        <div style={{
          transition: "transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)",
          transform: hasRecipient ? "var(--sender-shrink)" : "scale(1) translate(0, 0)",
          position: 'relative',
          zIndex: 10,
        }}>
          <div className="relative animate-spaceship-float">
            {/* Lights — fade out when recipient spaceship appears */}
            <div style={{
              opacity: hasRecipient ? 0 : 1,
              transition: `opacity 0.5s ease ${hasRecipient ? 'var(--seq-delay)' : '0s'}`,
            }}>
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
            </div>
            <img
              src="/portal/spaceship.svg"
              alt=""
              className="w-[100px] sm:w-[240px] h-auto relative z-10"
            />
            <div className="absolute left-1/2 -translate-x-1/2 z-[1] bottom-[-38px] sm:bottom-[-100px]" style={{ width: "62%" }}>
              <img src="/portal/flame-outer.svg" alt="" className="w-full h-[50px] sm:h-[150px] animate-flame-outer" style={{ transformOrigin: "top center" }} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 z-[2] bottom-[-33px] sm:bottom-[-95px]" style={{ width: "57%" }}>
              <img src="/portal/flame-inner.svg" alt="" className="w-full h-[45px] sm:h-[140px] animate-flame-inner" style={{ transformOrigin: "top center" }} />
            </div>
            {/* Name plate + tick button */}
            <div className="absolute bottom-[3px] sm:bottom-[10px] left-0 right-0 flex items-center justify-center gap-0.5 sm:gap-1 z-20">
              <div className="relative flex-shrink-0">
                <img src="/portal/name-plate.svg" alt="" className="w-[60px] sm:w-[140px] h-auto" />
                <span
                  className="absolute font-bold tracking-wider text-white uppercase whitespace-nowrap flex items-center justify-center"
                  style={{ fontFamily: "monospace", fontSize: "clamp(5px, 1.2vw, 14px)", top: "9%", left: "8%", width: "84%", height: "71%" }}
                >
                  {currentStudentName}
                </span>
              </div>
              <button className="relative flex-shrink-0 hover:brightness-110 active:scale-95 transition-all">
                <img src="/portal/btn-red-md.svg" alt="" className="w-5 h-5 sm:w-10 sm:h-10 object-contain" />
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-4 sm:h-4 pointer-events-none" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#00FF1A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Linkage connector between ships — draws in sequentially */}
        <div
          className="absolute pointer-events-none hidden sm:block"
          style={{
            zIndex: 5,
            width: '24px',
            height: '82px',
            top: '-45px',
            left: '0px',
          }}
        >
          {/* Top section — floats */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
            animation: 'linkage-top-anim 3s ease-in-out infinite',
          }}>
            {/* Top horizontal — draws left→right */}
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '13px', height: '2px', background: '#EAD020',
              clipPath: hasRecipient ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
              animation: hasRecipient ? 'linkage-draw-h 0.15s ease-out 0.5s both' : 'none',
            }} />
            {/* Top vertical half — draws top→bottom */}
            <div style={{
              position: 'absolute', top: 0, left: '12px', width: '2px', height: '100%', background: '#EAD020',
              clipPath: hasRecipient ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
              animation: hasRecipient ? 'linkage-draw-v 0.2s ease-out 0.65s both' : 'none',
            }} />
          </div>

          {/* Golden rectangle — pops in at center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '8px', height: '36px', borderRadius: '4px', background: '#EAD021',
            zIndex: 1,
            transform: hasRecipient ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0)',
            opacity: hasRecipient ? 1 : 0,
            animation: hasRecipient ? 'linkage-draw-rect 0.15s ease-out 0.85s both' : 'none',
          }} />

          {/* Bottom section — floats */}
          <div style={{
            position: 'absolute', bottom: '-6px', left: 0, right: 0, height: '50%',
            animation: 'linkage-bottom-anim 3s ease-in-out infinite',
            animationDelay: '0.1s',
          }}>
            {/* Bottom vertical half — draws top→bottom */}
            <div style={{
              position: 'absolute', top: 0, left: '12px', width: '2px', height: '100%', background: '#EAD020',
              clipPath: hasRecipient ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)',
              animation: hasRecipient ? 'linkage-draw-v 0.2s ease-out 1.0s both' : 'none',
            }} />
            {/* Bottom horizontal — draws left→right */}
            <div style={{
              position: 'absolute', bottom: 0, left: '12px', width: '13px', height: '2px', background: '#EAD020',
              clipPath: hasRecipient ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
              animation: hasRecipient ? 'linkage-draw-h 0.15s ease-out 1.2s both' : 'none',
            }} />
          </div>

          {/* Neon yellow light tracer */}
          <div style={{
            position: 'absolute',
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#EAD020',
            boxShadow: '0 0 4px 1px rgba(234,208,32,0.6)',
            transform: 'translate(-50%, -50%)',
            animation: hasRecipient ? 'linkage-neon-trace 0.85s ease-in-out 0.5s both' : 'none',
            opacity: 0,
            zIndex: 3,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Mobile linkage — horizontal between side-by-side ships */}
        <div
          className="absolute pointer-events-none block sm:hidden"
          style={{
            zIndex: 1,
            width: '80px',
            height: '16px',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Left line — follows sender ship float */}
          <div style={{
            position: 'absolute', top: '50%', left: '28px', width: '10px', height: '1px',
            marginTop: '-4px',
            animation: 'linkage-mobile-float 3s ease-in-out infinite',
          }}>
            <div style={{
              width: '100%', height: '100%', background: '#EAD020',
              animation: hasRecipient ? 'linkage-draw-h 0.12s ease-out 0.35s both' : 'none',
              clipPath: 'inset(0 100% 0 0)',
            }} />
          </div>

          {/* Golden rectangle — center */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: '10px', height: '6px', borderRadius: '3px', background: '#EAD021',
            zIndex: 1,
            transform: hasRecipient ? 'translate(-50%, -120%) scaleX(1)' : 'translate(-50%, -120%) scaleX(0)',
            opacity: hasRecipient ? 1 : 0,
            animation: hasRecipient ? 'linkage-draw-rect-mobile 0.12s ease-out 0.47s both' : 'none',
          }} />

          {/* Right line — follows recipient ship float */}
          <div style={{
            position: 'absolute', top: '50%', right: '28px', width: '10px', height: '1px',
            marginTop: '-4px',
            animation: 'linkage-mobile-float 3s ease-in-out infinite',
            animationDelay: '0.4s',
          }}>
            <div style={{
              width: '100%', height: '100%', background: '#EAD020',
              animation: hasRecipient ? 'linkage-draw-h-right 0.12s ease-out 0.59s both' : 'none',
              clipPath: 'inset(0 0 0 100%)',
            }} />
          </div>

          {/* Neon yellow tracer — mobile */}
          <div style={{
            position: 'absolute',
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: '#EAD020',
            boxShadow: '0 0 4px 1px rgba(234,208,32,0.6)',
            transform: 'translate(-50%, -50%)',
            marginTop: '-4px',
            animation: hasRecipient ? 'linkage-neon-trace-mobile 0.4s ease-in-out 0.33s both' : 'none',
            opacity: 0,
            zIndex: 3,
            pointerEvents: 'none',
          }} />
        </div>

        {/* Recipient spaceship — hidden initially, appears big & tilted when recipient selected */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0"
          style={{
            transition: `transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${hasRecipient ? 'var(--seq-delay)' : '0s'}, opacity 0.5s ease ${hasRecipient ? 'var(--seq-delay)' : '0s'}`,
            opacity: hasRecipient ? 1 : 0,
            transform: hasRecipient ? "var(--recipient-show)" : "var(--recipient-hide)",
            pointerEvents: hasRecipient ? "auto" : "none",
            zIndex: 10,
          }}
        >
          <div className="relative animate-spaceship-float" style={{ animationDelay: "0.4s" }}>
            {/* Lights — start hidden, turn on after recipient ship appears */}
            <div style={{
              opacity: hasRecipient ? 1 : 0,
              transition: `opacity 0.8s ease ${hasRecipient ? 'calc(var(--seq-delay) + 0.5s)' : '0s'}`,
            }}>
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
            </div>
            <img
              src="/portal/spaceship.svg"
              alt=""
              className="w-[100px] sm:w-[240px] h-auto relative z-10"
            />
            <div className="absolute left-1/2 -translate-x-1/2 z-[1] bottom-[-38px] sm:bottom-[-100px]" style={{ width: "62%" }}>
              <img src="/portal/flame-outer.svg" alt="" className="w-full h-[50px] sm:h-[150px] animate-flame-outer" style={{ transformOrigin: "top center" }} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 z-[2] bottom-[-33px] sm:bottom-[-95px]" style={{ width: "57%" }}>
              <img src="/portal/flame-inner.svg" alt="" className="w-full h-[45px] sm:h-[140px] animate-flame-inner" style={{ transformOrigin: "top center" }} />
            </div>
            {/* Name plate — shows recipient name */}
            <div className="absolute bottom-[3px] sm:bottom-[10px] left-0 right-0 flex items-center justify-center gap-0.5 sm:gap-1 z-20">
              <div className="relative flex-shrink-0">
                <img src="/portal/name-plate.svg" alt="" className="w-[60px] sm:w-[140px] h-auto" />
                <span
                  className="absolute font-bold tracking-wider text-white uppercase whitespace-nowrap flex items-center justify-center"
                  style={{ fontFamily: "monospace", fontSize: "clamp(5px, 1.2vw, 14px)", top: "9%", left: "8%", width: "84%", height: "71%" }}
                >
                  {selectedStudent?.name || ""}
                </span>
              </div>
              <button className="relative flex-shrink-0 hover:brightness-110 active:scale-95 transition-all">
                <img src="/portal/btn-red-md.svg" alt="" className="w-5 h-5 sm:w-10 sm:h-10 object-contain" />
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-4 sm:h-4 pointer-events-none" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" stroke="#00FF1A" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Board section */}
      <div className="relative w-full sm:flex-1 max-w-lg">
        {/* Sign — behind the board */}
        <div
          className="absolute z-[1] left-1/2 -translate-x-1/2 w-[180px] sm:w-[280px] top-[-45px] sm:top-[-68px]"
        >
          <img src="/portal/rank-sign.svg" alt="" className="w-full h-auto" />
          <div
            className="absolute"
            style={{ top: "6%", left: "16%", width: "68%", height: "46%", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            {selectedStudent ? (
              <div
                className="font-black tracking-[0.15em] flex items-center justify-center gap-1"
                style={{ fontFamily: "monospace", fontSize: "clamp(6px, 1.6vw, 13px)", color: "#e5a835", WebkitTextStroke: "1px black", paintOrder: "stroke fill", textShadow: "0 0 8px rgba(229,168,53,0.7), 0 0 16px rgba(229,168,53,0.3)" }}
              >
                <svg viewBox="0 0 32 32" className="w-[12px] h-[12px] sm:w-[18px] sm:h-[18px] flex-shrink-0">
                  <circle cx="16" cy="16" r="14" fill="#e5a835" stroke="#b8871a" strokeWidth="2" />
                  <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="9">AC</text>
                </svg>
                {selectedStudent.coins}
              </div>
            ) : (
              <div
                className="font-black tracking-[0.15em] flex items-center justify-center gap-1"
                style={{ fontFamily: "monospace", fontSize: "clamp(6px, 1.6vw, 13px)", color: "#7dffdb", WebkitTextStroke: "1px black", paintOrder: "stroke fill", textShadow: "0 0 8px rgba(125,255,219,0.7), 0 0 16px rgba(125,255,219,0.3)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[10px] h-[10px] sm:w-[16px] sm:h-[16px] flex-shrink-0">
                  <circle cx="18" cy="5" r="3" stroke="#7dffdb" strokeWidth="2" />
                  <circle cx="6" cy="12" r="3" stroke="#7dffdb" strokeWidth="2" />
                  <circle cx="18" cy="19" r="3" stroke="#7dffdb" strokeWidth="2" />
                  <path d="M8.5 10.5L15.5 6.5M8.5 13.5L15.5 17.5" stroke="#7dffdb" strokeWidth="2" strokeLinecap="round" />
                </svg>
                SHARE ADCOIN
              </div>
            )}
          </div>
        </div>

        {/* Board section — img-based sizing like home page */}
        <div className="relative w-[70%] sm:w-[65%] mx-auto">
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
          <img
            src="/portal/modal-board.svg"
            alt=""
            className="relative z-10 w-full h-auto"
          />

          {/* Content overlay — vertically centered on the board */}
          <form onSubmit={handleSubmit} className="absolute z-20 flex flex-col justify-center gap-2.5 sm:gap-3" style={{ top: "0", left: "8%", right: "8%", bottom: "0" }}>
            {/* Recipient — clickable with inline dropdown */}
            <div className="relative">
              <div style={{ ...fieldBox, cursor: "pointer" }} onClick={() => { if (!recipientOpen) openRecipientSearch(); }}>
                <span style={fieldLabel}>RECIPIENT</span>
                <div style={fieldIconWrap}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="#8DDDF5" strokeWidth="2"/></svg>
                </div>
                {recipientOpen ? (
                  <div className="flex items-center" style={{ ...fieldInput, cursor: "text" }} onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search name or ID..."
                      className="flex-1 min-w-0 bg-transparent outline-none text-white placeholder:text-[#3a5a6f]"
                      style={{ fontFamily: "monospace", fontSize: "clamp(11px, 2.5vw, 13px)", padding: 0 }}
                    />
                    <button type="button" onClick={(e) => { e.stopPropagation(); closeRecipientSearch(); }} className="text-[#4a6a7f] hover:text-[#8DDDF5] ml-1">
                      <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                    </button>
                  </div>
                ) : (
                  <div style={{ ...fieldInput, cursor: "pointer" }}>
                    {selectedStudent ? (
                      <span>{selectedStudent.name}{selectedStudent.studentId ? <span style={{ color: "#4a6a7f", marginLeft: "6px" }}>#{selectedStudent.studentId}</span> : null}</span>
                    ) : (
                      <span style={{ color: "#3a5a6f" }}>Tap to search...</span>
                    )}
                  </div>
                )}
              </div>
              {/* Inline dropdown results */}
              {recipientOpen && (
                <div className="absolute left-0 right-0 mt-1 rounded overflow-hidden z-20 max-h-32 overflow-y-auto" style={{ background: "rgba(10,25,40,0.97)", border: "1px solid rgba(100,160,200,0.2)" }}>
                  {searching ? (
                    <div className="text-center py-3 text-amber-300/70 text-[10px] font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>SEARCHING...</div>
                  ) : searchQuery.length < 2 ? (
                    <div className="text-center py-3 text-[#6a8a9f] text-[9px]" style={{ fontFamily: "monospace" }}>TYPE AT LEAST 2 CHARACTERS</div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-3 text-[#6a8a9f] text-[9px]" style={{ fontFamily: "monospace" }}>NO RESULTS FOUND</div>
                  ) : (
                    searchResults.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => selectStudent(s)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-left transition-colors border-b border-white/5 last:border-0"
                      >
                        {s.photo ? (
                          <img src={s.photo} alt="" className="w-6 h-6 rounded object-cover" style={{ border: "1px solid #2a4a5e" }} />
                        ) : (
                          <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold" style={{ background: "rgba(20,50,70,0.8)", border: "1px solid #2a4a5e", color: "#8aa8c0", fontFamily: "monospace" }}>
                            {s.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-[11px] font-bold truncate" style={{ fontFamily: "monospace" }}>{s.name}</div>
                          {s.studentId && <div className="text-[#4a6a7f] text-[8px]" style={{ fontFamily: "monospace" }}>#{s.studentId}</div>}
                        </div>
                        <div className="text-amber-400 text-[9px] font-bold flex-shrink-0" style={{ fontFamily: "monospace" }}>{s.coins} AC</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div style={fieldBox}>
              <span style={fieldLabel}>AMOUNT</span>
              <div style={fieldIconWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8DDDF5" strokeWidth="2"/><path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" stroke="#8DDDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" max={adcoinBalance} className="placeholder:text-[#3a5a6f]" style={fieldInput} />
            </div>

            {/* Message */}
            <div style={fieldBox}>
              <span style={fieldLabel}>MESSAGE</span>
              <div style={fieldIconWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional" maxLength={100} className="placeholder:text-[#3a5a6f]" style={fieldInput} />
            </div>

            {/* Password */}
            <div style={fieldBox}>
              <span style={fieldLabel}>PASSWORD</span>
              <div style={fieldIconWrap}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#8DDDF5" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#8DDDF5"/></svg>
              </div>
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm with password" className="placeholder:text-[#3a5a6f]" style={fieldInput} />
            </div>

            {error && <div className="text-red-400 text-[10px] font-bold rounded p-2" style={{ fontFamily: "monospace", background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.2)" }}>ERROR: {error}</div>}
            {success && <div className="text-green-400 text-[10px] font-bold rounded p-2" style={{ fontFamily: "monospace", background: "rgba(50,180,80,0.1)", border: "1px solid rgba(50,180,80,0.2)" }}>{success}</div>}
          </form>

          {/* Send button — straddles bottom edge */}
          {selectedStudent && (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={loading}
              className="absolute z-20 left-[15%] right-[15%] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40"
              style={{ bottom: 0, transform: "translateY(50%)" }}
            >
              <img src="/portal/btn-red-long.svg" alt="" className="h-11 sm:h-16 w-auto mx-auto" />
              <span
                className="absolute inset-0 flex items-center justify-center font-bold tracking-wider text-white"
                style={{ fontFamily: "monospace", fontSize: "clamp(9px, 2vw, 14px)" }}
              >
                {loading ? "SENDING..." : `SEND ${amount || "0"}`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
