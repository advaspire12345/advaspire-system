"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "adv_chat_history_v1";
const STORAGE_OPEN = "adv_chat_open_v1";

const SEED_MESSAGE: Msg = {
  role: "assistant",
  content:
    "Hi! I'm the Advaspire assistant. Ask me about our tracks, age tiers, pricing, branches, or how to book a free trial.",
};

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([SEED_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore from localStorage on mount.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Msg[];
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
      if (localStorage.getItem(STORAGE_OPEN) === "1") setOpen(true);
    } catch {
      // ignore
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_OPEN, open ? "1" : "0");
    } catch {
      // ignore
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Auto-scroll to bottom on new message.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/marketing/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== SEED_MESSAGE) }),
      });
      const data = (await res.json()) as { reply?: string; fallback?: boolean };
      const reply = data.reply ?? "Sorry — try again in a moment.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Network glitch. Try again or WhatsApp +60 17-318 0089." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([SEED_MESSAGE]);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  return (
    <>
      {/* Toggle button — bottom right, sits ABOVE the WhatsApp button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className="fixed bottom-[88px] right-5 z-50 flex items-center gap-2 rounded-full bg-[#1a1a2e] px-4 py-3 shadow-lg shadow-black/40 hover:bg-[#22A6DC] transition-all hover:scale-105"
      >
        <span className="relative flex h-6 w-6 items-center justify-center">
          {open ? (
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            </svg>
          ) : (
            <>
              <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 0 0-8.55 15.18L2 22l4.95-1.45A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.23-1.2l-.3-.18-2.94.86.87-2.86-.2-.31A8 8 0 1 1 12 20zm-3.5-8.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#D4FF1A] ring-2 ring-[#1a1a2e]" />
            </>
          )}
        </span>
        <span className="text-sm font-bold text-white hidden sm:inline-block whitespace-nowrap pr-1">
          {open ? "Close" : "Ask AI"}
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-[152px] right-5 z-50 w-[calc(100vw-2.5rem)] sm:w-[380px] max-h-[70vh] flex flex-col rounded-2xl bg-[#0a0a14] border border-white/10 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#0f0f1e]">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 rounded-full bg-[#22A6DC] flex items-center justify-center">
                <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#D4FF1A] ring-2 ring-[#0f0f1e]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Advaspire AI</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">Powered by Claude</div>
              </div>
            </div>
            <button
              type="button"
              onClick={reset}
              title="New conversation"
              className="text-xs text-white/50 hover:text-white"
            >
              Reset
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-2xl rounded-tr-sm bg-[#22A6DC] px-4 py-2.5 text-sm text-white whitespace-pre-wrap break-words"
                    : "mr-8 rounded-2xl rounded-tl-sm bg-white/5 ring-1 ring-white/10 px-4 py-2.5 text-sm text-white/90 whitespace-pre-wrap break-words"
                }
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="mr-8 rounded-2xl rounded-tl-sm bg-white/5 ring-1 ring-white/10 px-4 py-3 text-sm text-white/60">
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" style={{ animationDelay: "0.2s" }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#D4FF1A] animate-pulse" style={{ animationDelay: "0.4s" }} />
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            className="flex items-center gap-2 px-3 py-3 border-t border-white/10 bg-[#0f0f1e]"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about classes, age, pricing..."
              disabled={sending}
              className="flex-1 rounded-full bg-white/5 ring-1 ring-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-[#22A6DC]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="h-10 w-10 flex-shrink-0 rounded-full bg-[#E81B23] flex items-center justify-center transition-all hover:bg-[#ff2a35] disabled:opacity-40"
              aria-label="Send"
            >
              <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
