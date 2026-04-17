"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TransferModal } from "./transfer-modal";

interface RankingEntry {
  rank: number;
  studentId: string;
  studentName: string;
  displayId: string | null;
  coins: number;
  photo: string | null;
}

interface SearchResult {
  id: string;
  name: string;
  studentId: string | null;
  photo: string | null;
  coins: number;
  branchRank: number | null;
}

interface RankingTabProps {
  currentStudentId: string;
  currentStudentName: string;
  adcoinBalance: number;
  onBalanceChange: () => void;
}

export function RankingTab({ currentStudentId, currentStudentName, adcoinBalance, onBalanceChange }: RankingTabProps) {
  const [scope, setScope] = useState<"branch" | "global">("branch");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [startOffset, setStartOffset] = useState(0);
  const [transferTarget, setTransferTarget] = useState<RankingEntry | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRanking = useCallback(() => {
    setLoading(true);
    setRanking([]);
    fetch(`/api/student-portal/ranking?scope=${scope}&offset=0&center=true`)
      .then((r) => r.json())
      .then((res: { entries: RankingEntry[]; hasMore: boolean; offset: number }) => {
        setRanking(res.entries);
        setHasMore(res.hasMore);
        setStartOffset(res.offset);
        setLoadedCount(res.entries.length);
        // Scroll to the user's row after rendering
        if (res.offset > 0) {
          setTimeout(() => {
            const el = scrollRef.current;
            if (!el) return;
            const meRow = el.querySelector('[data-me="true"]');
            if (meRow) {
              meRow.scrollIntoView({ block: "center", behavior: "instant" });
            }
          }, 100);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scope]);

  const fetchMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextOffset = startOffset + loadedCount;
    fetch(`/api/student-portal/ranking?scope=${scope}&offset=${nextOffset}`)
      .then((r) => r.json())
      .then((res: { entries: RankingEntry[]; hasMore: boolean }) => {
        setRanking((prev) => {
          const existing = new Set(prev.map((e) => e.studentId));
          const unique = res.entries.filter((e) => !existing.has(e.studentId));
          return [...prev, ...unique];
        });
        setHasMore(res.hasMore);
        setLoadedCount((prev) => prev + res.entries.length);
      })
      .catch(console.error)
      .finally(() => setLoadingMore(false));
  }, [scope, startOffset, loadedCount, loadingMore, hasMore]);

  const fetchPrev = useCallback(() => {
    if (loadingPrev || startOffset <= 0) return;
    setLoadingPrev(true);
    const prevOffset = Math.max(0, startOffset - 20);
    const prevLimit = startOffset - prevOffset;
    fetch(`/api/student-portal/ranking?scope=${scope}&offset=${prevOffset}`)
      .then((r) => r.json())
      .then((res: { entries: RankingEntry[]; hasMore: boolean }) => {
        const el = scrollRef.current;
        const prevScrollHeight = el?.scrollHeight ?? 0;
        setRanking((prev) => {
          const existing = new Set(prev.map((e) => e.studentId));
          const unique = res.entries.slice(0, prevLimit).filter((e) => !existing.has(e.studentId));
          return [...unique, ...prev];
        });
        setStartOffset(prevOffset);
        setLoadedCount((prev) => prev + Math.min(res.entries.length, prevLimit));
        // Restore scroll position after prepending
        requestAnimationFrame(() => {
          if (el) {
            el.scrollTop += el.scrollHeight - prevScrollHeight;
          }
        });
      })
      .catch(console.error)
      .finally(() => setLoadingPrev(false));
  }, [scope, startOffset, loadingPrev]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Infinite scroll — load more when near bottom or top
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
        fetchMore();
      }
      if (el.scrollTop <= 60) {
        fetchPrev();
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [fetchMore, fetchPrev]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(() => {
      fetch(`/api/student-portal/search-students?query=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setSearchResults)
        .catch(console.error)
        .finally(() => setSearching(false));
    }, 300);
  }, []);

  const openSearch = () => {
    setSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleTransferSuccess = () => {
    onBalanceChange();
    fetchRanking();
  };


  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-0 w-full mt-6 sm:mt-0">
      {/* Spaceship on TOP (mobile) / LEFT (desktop) with light beams, flames, name + tick overlaid */}
      <div className="flex-shrink-0 self-center sm:self-end relative mb-16 sm:mb-0 sm:mr-4 mt-8 sm:mt-0 z-30 animate-spaceship-float">
        {/* Light beams — above spaceship, animate in on mount */}
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
        {/* Flames — below spaceship engines */}
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
        {/* Name plate + tick button — overlaid on bottom of spaceship */}
        <div className="absolute bottom-[3px] sm:bottom-[10px] left-0 right-0 flex items-center justify-center gap-0.5 sm:gap-1 z-20">
          {/* Name plate */}
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
              {currentStudentName}
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

      {/* Right side (desktop) / Bottom (mobile): board with sign + handles behind */}
      <div className="relative w-full sm:flex-1 max-w-lg">
        {/* Sign — behind the board */}
        <div
          className="absolute z-[1] left-1/2 -translate-x-1/2 w-[180px] sm:w-[280px] top-[-45px] sm:top-[-68px] cursor-pointer hover:brightness-110 transition-all"
          onClick={() => { if (!searchOpen) openSearch(); }}
        >
          <img src="/portal/rank-sign.svg" alt="" className="w-full h-auto" />
          {/* Dark screen area — shows label or input */}
          <div
            className="absolute"
            style={{
              top: "6%",
              left: "16%",
              width: "68%",
              height: "46%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {searchOpen ? (
              <div className="flex items-center w-full h-full px-1 gap-1">
                <svg viewBox="0 0 24 24" fill="none" className="w-[10px] h-[10px] sm:w-[14px] sm:h-[14px] flex-shrink-0">
                  <circle cx="11" cy="11" r="7" stroke="#7dffdb" strokeWidth="2.5" />
                  <path d="M16 16L20 20" stroke="#7dffdb" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Name or ID..."
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[#7dffdb] placeholder-[#4a6a7f]"
                  style={{
                    fontFamily: "monospace",
                    fontWeight: 900,
                    fontSize: "clamp(6px, 1.4vw, 12px)",
                    letterSpacing: "0.1em",
                  }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); closeSearch(); }}
                  className="flex-shrink-0 text-[#7dffdb] hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-[10px] h-[10px] sm:w-[14px] sm:h-[14px]">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className="font-black tracking-[0.15em] flex items-center justify-center gap-1"
                style={{
                  fontFamily: "monospace",
                  fontSize: "clamp(6px, 1.6vw, 13px)",
                  color: "#7dffdb",
                  WebkitTextStroke: "1px black",
                  paintOrder: "stroke fill",
                  textShadow: "0 0 8px rgba(125,255,219,0.7), 0 0 16px rgba(125,255,219,0.3)",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[10px] h-[10px] sm:w-[16px] sm:h-[16px] flex-shrink-0">
                  <circle cx="11" cy="11" r="7" stroke="#7dffdb" strokeWidth="2.5" />
                  <path d="M16 16L20 20" stroke="#7dffdb" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                SEARCH FRIEND
              </div>
            )}
          </div>
        </div>

        {/* Left handle — behind the board, peeking out a bit */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute z-[1] w-[20px] sm:w-[35px] h-[60px] sm:h-[100px] top-1/2 -translate-y-1/2 left-[-10px] sm:left-[-16px]"
        />
        {/* Right handle (flipped) — behind the board, peeking out a bit */}
        <img
          src="/portal/rank-handle.svg"
          alt=""
          className="absolute z-[1] w-[20px] sm:w-[35px] h-[60px] sm:h-[100px] top-1/2 right-[-10px] sm:right-[-16px]"
          style={{ transform: "translateY(-50%) scaleX(-1)" }}
        />

        {/* Board — IN FRONT */}
        <div
          className="relative z-10 rounded-xl"
          style={{
            backgroundImage: "url(/portal/rank-board.svg)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            minHeight: "clamp(250px, 40vw, 380px)",
          }}
        >
          {/* Vertically center toggle + list inside the board */}
          <div className="absolute inset-0 flex flex-col justify-center">
          {/* Scope toggle — stays fixed, hidden during search */}
          <div className={`px-5 sm:px-10 ${searchOpen ? "hidden" : ""}`}>
            <div className="flex">
              <button
                onClick={() => setScope("branch")}
                className="px-4 py-1.5 sm:px-6 sm:py-2.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider transition-all"
                style={{
                  fontFamily: "monospace",
                  background: scope === "branch" ? "#162B46" : "#2A4468",
                  color: scope === "branch" ? "#7dffdb" : "#ffffff",
                  border: `2px solid ${scope === "branch" ? "#162B46" : "transparent"}`,
                }}
              >
                BRANCH
              </button>
              <button
                onClick={() => setScope("global")}
                className="px-4 py-1.5 sm:px-6 sm:py-2.5 rounded text-[8px] sm:text-[10px] font-bold tracking-wider transition-all"
                style={{
                  fontFamily: "monospace",
                  background: scope === "global" ? "#162B46" : "#2A4468",
                  color: scope === "global" ? "#7dffdb" : "#ffffff",
                  border: `2px solid ${scope === "global" ? "#162B46" : "transparent"}`,
                }}
              >
                GLOBAL
              </button>
            </div>
          </div>

          {/* List container — border color bg, list scrolls inside */}
          <div
            className="relative mx-5 sm:mx-10 mt-[-8px] sm:mt-[-10px] rounded"
            style={{ background: "#162B46", height: "clamp(170px, 32vw, 290px)" }}
          >
            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden scrollbar-hide pb-12 sm:pb-14">
            {searchOpen ? (
              searching ? (
                <div className="text-center py-12 text-amber-300/70 text-xs font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
                  SEARCHING...
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="text-center py-12 text-[#6a8a9f] text-[10px]" style={{ fontFamily: "monospace" }}>TYPE AT LEAST 2 CHARACTERS</div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-12 text-[#6a8a9f] text-[10px]" style={{ fontFamily: "monospace" }}>NO RESULTS FOUND</div>
              ) : (
                searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className="relative"
                    style={{ marginTop: index === 0 ? 0 : "-16px", zIndex: index + 1 }}
                  >
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ backgroundImage: "url(/portal/rank-row.svg)", backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" }}
                    />
                    <div
                      className="absolute z-20 flex items-center justify-center pointer-events-none"
                      style={{ top: "6%", left: "20.7%", width: "13.4%", height: "26%" }}
                    >
                      <span className="font-bold text-[7px] sm:text-[10px]" style={{ fontFamily: "monospace", color: result.branchRank && result.branchRank <= 3 ? ["", "#e5a835", "#a0b0c0", "#c47a3a"][result.branchRank] : "#4a6a7f" }}>
                        {result.branchRank ? (result.branchRank <= 3 ? ["", "1st", "2nd", "3rd"][result.branchRank] : `#${result.branchRank}`) : "-"}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-5 sm:py-3.5 pt-4 sm:pt-5">
                      <div className="relative z-10 flex-shrink-0">
                        {result.photo ? (
                          <img src={result.photo} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover" style={{ border: "2px solid #2a4a5e" }} />
                        ) : (
                          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[9px] sm:text-xs font-bold" style={{ background: "rgba(20,50,70,0.8)", border: "2px solid #2a4a5e", color: "#8aa8c0", fontFamily: "monospace" }}>
                            {result.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 relative z-10">
                        <div className="text-white text-[10px] sm:text-xs font-bold truncate" style={{ fontFamily: "monospace" }}>{result.name}</div>
                        <div className="text-amber-400/80 text-[7px] sm:text-[8px]" style={{ fontFamily: "monospace" }}>ID: {result.studentId ?? "-"}</div>
                      </div>
                      <div className="relative z-10 flex-shrink-0 flex items-center">
                        <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 relative z-10">
                          <circle cx="16" cy="16" r="14" fill="#e5a835" stroke="#b8871a" strokeWidth="2" />
                          <circle cx="16" cy="16" r="10" fill="none" stroke="#b8871a" strokeWidth="1" opacity="0.5" />
                          <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="9">AC</text>
                        </svg>
                        <div className="h-4 sm:h-5 flex items-center justify-center px-2 sm:px-3 -ml-1.5 sm:-ml-2 rounded-r-sm" style={{ background: "#162b46" }}>
                          <span className="text-white font-bold text-[8px] sm:text-[10px] tracking-wide" style={{ fontFamily: "monospace" }}>{result.coins}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setTransferTarget({ rank: 0, studentId: result.id, studentName: result.name, displayId: result.studentId, coins: result.coins, photo: result.photo });
                          closeSearch();
                        }}
                        className="relative z-10 flex-shrink-0 hover:brightness-110 active:scale-95 transition-all"
                      >
                        <img src="/portal/btn-blue-long-md.svg" alt="Send" className="w-[65px] h-auto sm:w-[85px] object-contain" />
                        <span className="absolute left-0 right-0 flex items-center justify-center text-[9px] sm:text-[12px] font-bold tracking-wider text-white" style={{ fontFamily: "monospace", top: "5%", height: "78%" }}>
                          SEND
                        </span>
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : loading ? (
              <div className="text-center py-12 text-amber-300/70 text-xs font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
                LOADING RANKS...
              </div>
            ) : ranking.length === 0 ? (
              <div className="text-center py-12 text-[#6a8a9f] text-xs" style={{ fontFamily: "monospace" }}>NO DATA</div>
            ) : (
              <>
              {loadingPrev && (
                <div className="text-center py-3 text-amber-300/70 text-[8px] font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
                  LOADING...
                </div>
              )}
              {ranking.map((entry) => {
                const isMe = entry.studentId === currentStudentId;
                const medalColor =
                  entry.rank === 1 ? "#e5a835" :
                  entry.rank === 2 ? "#a0b0c0" :
                  entry.rank === 3 ? "#c47a3a" :
                  "#4a6a7f";

                return (
                  <div
                    key={entry.studentId}
                    className="relative"
                    data-me={isMe ? "true" : undefined}
                    style={{ marginTop: entry.rank === 1 ? 0 : "-16px", zIndex: entry.rank }}
                  >
                    {/* Row SVG background */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(/portal/${isMe ? "rank-row-me" : "rank-row"}.svg)`,
                        backgroundSize: "100% 100%",
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                    {/* Rank — positioned in the notch tab at top-left */}
                    <div
                      className="absolute z-20 flex items-center justify-center pointer-events-none"
                      style={{
                        top: "6%",
                        left: "20.7%",
                        width: "13.4%",
                        height: "26%",
                      }}
                    >
                      <span
                        className="font-bold text-[7px] sm:text-[10px]"
                        style={{
                          fontFamily: "monospace",
                          color: isMe ? "#fff" : medalColor,
                          textShadow: entry.rank <= 3 ? `0 0 6px ${medalColor}66` : "none",
                        }}
                      >
                        {entry.rank <= 3 ? ["", "1st", "2nd", "3rd"][entry.rank] : `#${entry.rank}`}
                      </span>
                    </div>
                    <div className="relative flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-5 sm:py-3.5 pt-4 sm:pt-5">

                    {/* Avatar */}
                    <div className="relative z-10 flex-shrink-0">
                      {entry.photo ? (
                        <img src={entry.photo} alt="" className="w-6 h-6 sm:w-7 sm:h-7 rounded object-cover" style={{ border: `2px solid ${entry.rank <= 3 ? medalColor : "#2a4a5e"}` }} />
                      ) : (
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-[9px] sm:text-xs font-bold" style={{ background: "rgba(20,50,70,0.8)", border: `2px solid ${entry.rank <= 3 ? medalColor : "#2a4a5e"}`, color: "#8aa8c0", fontFamily: "monospace" }}>
                          {entry.studentName.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Name + coins */}
                    <div className="flex-1 min-w-0 relative z-10">
                      <div className="text-white text-[10px] sm:text-xs font-bold truncate" style={{ fontFamily: "monospace" }}>
                        {entry.studentName}
                        {isMe && <span className="text-amber-400 ml-1">(YOU)</span>}
                      </div>
                      <div className="text-amber-400/80 text-[7px] sm:text-[8px]" style={{ fontFamily: "monospace" }}>ID: {entry.displayId ?? "-"}</div>
                    </div>

                    {/* Coin counter */}
                    <div className="relative z-10 flex-shrink-0 flex items-center">
                      <svg viewBox="0 0 32 32" className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 relative z-10">
                        <circle cx="16" cy="16" r="14" fill="#e5a835" stroke="#b8871a" strokeWidth="2" />
                        <circle cx="16" cy="16" r="10" fill="none" stroke="#b8871a" strokeWidth="1" opacity="0.5" />
                        <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="9">AC</text>
                      </svg>
                      <div
                        className="h-4 sm:h-5 flex items-center justify-center px-2 sm:px-3 -ml-1.5 sm:-ml-2 rounded-r-sm"
                        style={{ background: "#162b46" }}
                      >
                        <span className="text-white font-bold text-[8px] sm:text-[10px] tracking-wide" style={{ fontFamily: "monospace" }}>
                          {entry.coins}
                        </span>
                      </div>
                    </div>

                    {/* Send button */}
                    {isMe ? (
                      <div className="relative z-10 flex-shrink-0">
                        <img src="/portal/btn-red-long-sm.svg" alt="" className="w-[65px] h-auto sm:w-[85px] object-contain" />
                        <span
                          className="absolute left-0 right-0 flex items-center justify-center text-[9px] sm:text-[12px] font-bold tracking-wider text-white"
                          style={{ fontFamily: "monospace", top: "5%", height: "78%" }}
                        >
                          ADD
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setTransferTarget(entry)}
                        className="relative z-10 flex-shrink-0 hover:brightness-110 active:scale-95 transition-all"
                      >
                        <img src="/portal/btn-blue-long-md.svg" alt="Send" className="w-[65px] h-auto sm:w-[85px] object-contain" />
                        <span
                          className="absolute left-0 right-0 flex items-center justify-center text-[9px] sm:text-[12px] font-bold tracking-wider text-white"
                          style={{ fontFamily: "monospace", top: "5%", height: "78%" }}
                        >
                          SEND
                        </span>
                      </button>
                    )}
                    </div>
                  </div>
                );
              })}
              {loadingMore && (
                <div className="text-center py-3 text-amber-300/70 text-[8px] font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
                  LOADING...
                </div>
              )}
              </>
            )}
            </div>
            {/* Bottom blurry gradient — blur fades from none to max */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none rounded-b flex flex-col" style={{ height: "50px", zIndex: 9999 }}>
              <div className="flex-1" style={{ backdropFilter: "blur(0.5px)", WebkitBackdropFilter: "blur(0.5px)" }} />
              <div className="flex-1" style={{ backdropFilter: "blur(1.5px)", WebkitBackdropFilter: "blur(1.5px)" }} />
              <div className="flex-1" style={{ backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)" }} />
              <div className="flex-1" style={{ backdropFilter: "blur(5px)", WebkitBackdropFilter: "blur(5px)" }} />
            </div>
          </div>
        </div>
        </div>
      </div>

      <TransferModal
        open={!!transferTarget}
        onClose={() => setTransferTarget(null)}
        receiverId={transferTarget?.studentId ?? ""}
        receiverName={transferTarget?.studentName ?? ""}
        receiverDisplayId={transferTarget?.displayId ?? null}
        receiverPhoto={transferTarget?.photo ?? null}
        senderBalance={adcoinBalance}
        onSuccess={handleTransferSuccess}
      />
    </div>
  );
}
