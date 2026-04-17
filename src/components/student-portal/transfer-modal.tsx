"use client";

import { useState } from "react";
import { createPortal } from "react-dom";

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  receiverDisplayId: string | null;
  receiverPhoto: string | null;
  senderBalance: number;
  onSuccess: () => void;
}

export function TransferModal({
  open, onClose, receiverId, receiverName, receiverDisplayId, receiverPhoto, senderBalance, onSuccess,
}: TransferModalProps) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) { setError("Invalid amount"); return; }
    if (numAmount > senderBalance) { setError("Insufficient balance"); return; }
    if (!password) { setError("Password required"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/student-portal/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId, amount: numAmount, message: message.trim() || undefined, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Transfer failed"); return; }
      onSuccess(); onClose(); setAmount(""); setMessage(""); setPassword("");
    } catch { setError("Transfer failed"); }
    finally { setLoading(false); }
  };

  /* ── sci-fi field wrapper (outer teal container) ── */
  const fieldBox: React.CSSProperties = {
    background: "#397392",
    borderRadius: "6px",
    padding: "10px 10px 10px 10px",
    position: "relative",
  };
  /* ── pixel-art label that overlaps the top edge ── */
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
  /* ── dark inner input area ── */
  const fieldInput: React.CSSProperties = {
    background: "#1C3752",
    border: "none",
    borderRadius: "5px",
    fontFamily: "monospace",
    width: "100%",
    padding: "8px 10px 8px 32px",
    color: "#fff",
    fontSize: "13px",
    outline: "none",
  };
  /* ── small icon on left of input ── */
  const fieldIconWrap: React.CSSProperties = {
    position: "absolute",
    left: "18px",
    bottom: "17px",
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  };

  return createPortal(
    <>
      <style>{`
        @keyframes modal-grow {
          0% { transform: scale(0.3); opacity: 0; }
          60% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes backdrop-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes meteor-orbit {
          0%   { offset-distance: 25%; opacity: 1; }
          85%  { opacity: 1; }
          100% { offset-distance: 125%; opacity: 0; }
        }
      `}</style>
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      {/* Backdrop — clickable to close */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} style={{ animation: "backdrop-in 0.3s ease-out" }} />

      <div className="relative overflow-visible pointer-events-none" style={{ width: "fit-content", animation: "modal-grow 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards" }}>
        {/* Left handle — peeks out from board edge */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute w-[18px] sm:w-[28px] h-[55px] sm:h-[85px] top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: "-2px", zIndex: 1 }}
        />
        {/* Right handle (flipped) */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute w-[18px] sm:w-[28px] h-[55px] sm:h-[85px] top-1/2 pointer-events-none"
          style={{ right: "-2px", zIndex: 1, transform: "translateY(-50%) scaleX(-1)" }}
        />

        {/* Meteor orbiting the board edge */}
        <svg className="absolute pointer-events-none" style={{ inset: "-6px", zIndex: 0, overflow: "visible" }} width="100%" height="100%">
          <rect x="3" y="3" width="calc(100% - 6px)" height="calc(100% - 6px)" rx="12" fill="none" stroke="none" id="meteor-path" />
        </svg>
        <div
          className="absolute pointer-events-none"
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            background: "radial-gradient(circle, #fff 0%, #8DDDF5 50%, rgba(141,221,245,0) 100%)",
            boxShadow: "0 0 12px 4px #8DDDF5, 0 0 24px 8px rgba(125,255,219,0.5), 0 0 40px 12px rgba(141,221,245,0.3)",
            zIndex: 0,
            offsetPath: "rect(0 100% 100% 0 round 12px)",
            offsetRotate: "0deg",
            animation: "meteor-orbit 1.8s cubic-bezier(0.4, 0, 0.6, 1) forwards",
            animationDelay: "0.3s",
            opacity: 0,
            top: "0px",
            left: "0px",
          }}
        />
        {/* Meteor tail (trailing glow) */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "60px",
            height: "6px",
            borderRadius: "3px",
            background: "linear-gradient(90deg, transparent 0%, rgba(125,255,219,0.2) 20%, rgba(141,221,245,0.5) 60%, #8DDDF5 100%)",
            filter: "blur(3px)",
            zIndex: 0,
            offsetPath: "rect(0 100% 100% 0 round 12px)",
            offsetRotate: "auto",
            offsetAnchor: "100% 50%",
            animation: "meteor-orbit 1.8s cubic-bezier(0.4, 0, 0.6, 1) forwards",
            animationDelay: "0.3s",
            opacity: 0,
            top: "0px",
            left: "0px",
          }}
        />

        {/* Close button — above everything */}
        <button
          onClick={onClose}
          className="absolute pointer-events-auto hover:brightness-110 active:scale-90 transition-all"
          style={{ top: "-12px", right: "-10px", zIndex: 10 }}
        >
          <img src="/portal/btn-red-sm.svg" alt="" className="w-9 h-9 sm:w-11 sm:h-11 object-contain" />
          <svg
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 sm:w-4 sm:h-4 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M9 14L4 9L9 4" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M4 9H14C17.3137 9 20 11.6863 20 15V16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Board background */}
        <div
          className="relative rounded-xl pointer-events-auto"
          style={{
            backgroundImage: "url(/portal/modal-board.svg)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            zIndex: 2,
          }}
        >

          {/* Content */}
          <div className="flex justify-center px-10 pt-10 pb-14 sm:px-14 sm:pt-10 sm:pb-16">
          <div style={{ width: "240px" }}>
            {/* Header */}
            <div className="mb-3">
              <h3 className="text-amber-300 font-bold text-sm tracking-wider" style={{ fontFamily: "monospace", textShadow: "0 0 6px rgba(245,158,11,0.3)" }}>
                SEND ADCOINS
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* Receiver */}
              <div>
                <div style={fieldBox}>
                  <span style={fieldLabel}>RECIPIENT</span>
                  <div style={fieldIconWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="#8DDDF5" strokeWidth="2"/></svg>
                  </div>
                  <div style={{ ...fieldInput, cursor: "default" }}>
                    {receiverName}{receiverDisplayId ? <span style={{ color: "#4a6a7f", marginLeft: "6px" }}>#{receiverDisplayId}</span> : null}
                  </div>
                </div>
              </div>

              <div>
                <div style={fieldBox}>
                  <span style={fieldLabel}>AMOUNT</span>
                  <div style={fieldIconWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#8DDDF5" strokeWidth="2"/><path d="M12 6v12M8 10l4-4 4 4M8 14l4 4 4-4" stroke="#8DDDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" max={senderBalance} className="placeholder:text-[#3a5a6f]" style={fieldInput} />
                </div>
              </div>

              <div>
                <div style={fieldBox}>
                  <span style={fieldLabel}>MESSAGE</span>
                  <div style={fieldIconWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional" maxLength={100} className="placeholder:text-[#3a5a6f]" style={fieldInput} />
                </div>
              </div>

              <div>
                <div style={fieldBox}>
                  <span style={fieldLabel}>PASSWORD</span>
                  <div style={fieldIconWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#8DDDF5" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#8DDDF5" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#8DDDF5"/></svg>
                  </div>
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm with password" className="placeholder:text-[#3a5a6f]" style={{ ...fieldInput, paddingRight: "44px" }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="hover:text-[#8DDDF5] transition-colors" style={{ position: "absolute", right: "16px", bottom: "15px", color: "#4a6a7f", fontSize: "9px", fontWeight: 800, fontFamily: "monospace", letterSpacing: "0.1em" }}>
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              {error && <div className="text-red-400 text-[10px] font-bold rounded p-2" style={{ fontFamily: "monospace", background: "rgba(200,50,50,0.1)", border: "1px solid rgba(200,50,50,0.2)" }}>ERROR: {error}</div>}
            </form>
          </div>
          </div>
        </div>

        {/* Confirm button — straddles the bottom edge of the board */}
        <button
          type="button"
          onClick={handleSubmit as unknown as React.MouseEventHandler}
          disabled={loading}
          className="absolute left-1/2 -translate-x-1/2 pointer-events-auto hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-40"
          style={{ bottom: "-28px", zIndex: 2 }}
        >
          <img src="/portal/btn-red-long-sm.svg" alt="" className="w-[120px] sm:w-[150px] h-auto object-contain" />
          <span
            className="absolute inset-0 flex items-center justify-center font-bold text-[9px] sm:text-[12px] tracking-wider text-white"
            style={{ fontFamily: "monospace" }}
          >
            {loading ? "SENDING..." : `SEND ${amount || "0"}`}
          </span>
        </button>
      </div>
    </div>
    </>,
    document.body
  );
}
