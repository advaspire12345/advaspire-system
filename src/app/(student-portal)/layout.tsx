"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/student-portal/top-bar";
import { BottomNav, type TabId } from "@/components/student-portal/bottom-nav";
import { HomeTab } from "@/components/student-portal/home-tab";
import { RankingTab } from "@/components/student-portal/ranking-tab";
import { TransferTab } from "@/components/student-portal/transfer-tab";
import { PortfolioTab } from "@/components/student-portal/portfolio-tab";
import { ShopTab } from "@/components/student-portal/shop-tab";
import { ComingSoonTab } from "@/components/student-portal/coming-soon-tab";
import { MissionsTab } from "@/components/student-portal/missions-tab";

interface StudentProfile {
  id: string;
  name: string;
  photo: string | null;
  level: number;
  adcoinBalance: number;
  branchId: string;
  studentId: string | null;
}

export default function StudentPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [portfolioPage, setPortfolioPage] = useState(0);
  const [portfolioHasNext, setPortfolioHasNext] = useState(false);
  const [portfolioHasPrev, setPortfolioHasPrev] = useState(false);
  const router = useRouter();

  const fetchStudent = useCallback(() => {
    fetch("/api/student-auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then(setStudent)
      .catch(() => router.push("/student-login"));
  }, [router]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  const handleLogout = async () => {
    await fetch("/api/student-auth/logout", { method: "POST" });
    router.push("/login?tab=register");
  };

  if (!student) {
    return (
      <div
        className="min-h-svh flex items-center justify-center"
        style={{
          backgroundImage: "url(/portal/bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-amber-300 text-sm font-bold tracking-widest uppercase" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab studentId={student.id} studentName={student.name} />;
      case "ranking":
        return (
          <RankingTab
            currentStudentId={student.id}
            currentStudentName={student.name}
            adcoinBalance={student.adcoinBalance}
            onBalanceChange={fetchStudent}
          />
        );
      case "transfer":
        return (
          <TransferTab
            currentStudentName={student.name}
            adcoinBalance={student.adcoinBalance}
            onBalanceChange={fetchStudent}
          />
        );
      case "portfolio":
        return (
          <PortfolioTab
            studentId={student.id}
            page={portfolioPage}
            onPageInfo={({ hasNext, hasPrev }) => {
              setPortfolioHasNext(hasNext);
              setPortfolioHasPrev(hasPrev);
            }}
          />
        );
    }
  };

  return (
    <div
      className="h-svh flex flex-col relative overflow-hidden"
      style={{
        backgroundImage: "url(/portal/bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Top Bar */}
      <TopBar
        name={student.name}
        level={student.level}
        adcoinBalance={student.adcoinBalance}
        photo={student.photo}
        onLogout={handleLogout}
      />

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center px-3 py-2 sm:px-6 sm:py-4">
        {activeTab === "shop" ? (
          /* Shop — no blade board, just the carousel */
          <ShopTab />
        ) : activeTab === "missions" ? (
          /* Missions — no blade board */
          <MissionsTab studentName={student?.name ?? ""} />
        ) : (
          /* Blade board frame */
          <div
            className="relative w-full max-w-4xl"
            style={{ aspectRatio: "auto" }}
          >
            {/* Board body — CSS rectangle (stretches freely) */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "#456B7E", border: "3px solid black" }} />
            <div className="absolute pointer-events-none" style={{ inset: "6px", background: "#1C4A63" }} />

            {/* Top notch — inline SVG, fixed height so it never stretches */}
            <svg
              className="absolute top-0 left-0 w-full z-[5] pointer-events-none"
              viewBox="0 0 1506 70"
              preserveAspectRatio="none"
              fill="none"
              style={{ height: "clamp(30px, 5vw, 50px)" }}
            >
              <defs>
                <mask id="notch-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1506" height="70" fill="black">
                  <rect fill="white" width="1506" height="70" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M172 3H3V70H1503V3H562L518.89 50.029C511.314 58.2941 500.616 63 489.404 63H244.596C233.384 63 222.686 58.2941 215.11 50.029L172 3Z" />
                </mask>
              </defs>
              <rect x="1.5" y="1.5" width="1503" height="68" fill="#1C4A63" stroke="black" strokeWidth="3" />
              <path fillRule="evenodd" clipRule="evenodd" d="M172 3H3V70H1503V3H562L518.89 50.029C511.314 58.2941 500.616 63 489.404 63H244.596C233.384 63 222.686 58.2941 215.11 50.029L172 3Z" fill="#456B7E" />
              <path d="M3 3V0H0V3H3ZM172 3L174.211 0.972826L173.32 0H172V3ZM1503 3H1506V0H1503V3ZM562 3V0H560.68L559.789 0.972827L562 3ZM518.89 50.029L521.102 52.0562V52.0561L518.89 50.029ZM215.11 50.029L212.898 52.0562V52.0562L215.11 50.029ZM3 6H172V0H3V6ZM6 70V3H0V70H6ZM1500 3V70H1506V3H1500ZM562 6H1503V0H562V6ZM559.789 0.972827L516.679 48.0018L521.102 52.0561L564.211 5.02717L559.789 0.972827ZM516.679 48.0018C509.671 55.6471 499.775 60 489.404 60V66C501.457 66 512.957 60.9412 521.102 52.0562L516.679 48.0018ZM489.404 60H244.596V66H489.404V60ZM244.596 60C234.225 60 224.33 55.6471 217.321 48.0018L212.898 52.0562C221.043 60.9412 232.543 66 244.596 66V60ZM217.321 48.0018L174.211 0.972826L169.789 5.02717L212.898 52.0562L217.321 48.0018Z" fill="black" mask="url(#notch-mask)" />
              <path fillRule="evenodd" clipRule="evenodd" d="M172 7H3V70H1503V7H562L518.879 53.7271C511.307 61.9329 500.649 66.6 489.483 66.6H244.517C233.351 66.6 222.693 61.9329 215.121 53.7271L172 7Z" fill="#1C4A63" />
            </svg>

            {/* Title in the concave notch */}
            <div
              className="absolute z-20 pointer-events-none flex items-center justify-center"
              style={{
                left: "11.4%",
                width: "25.9%",
                top: "0",
                height: "clamp(30px, 5vw, 50px)",
              }}
            >
              <span
                className="font-black tracking-[0.2em] text-center"
                style={{
                  fontFamily: "monospace",
                  fontSize: "clamp(8px, 1.6vw, 16px)",
                  color: "#7dffdb",
                  WebkitTextStroke: "1px black",
                  paintOrder: "stroke fill",
                  textShadow:
                    "0 0 8px rgba(125,255,219,0.7), 0 0 16px rgba(125,255,219,0.3)",
                }}
              >
                {activeTab === "home" && "HOME"}
                {activeTab === "transfer" && "TRANSFER"}
                {activeTab === "ranking" && "RANKING"}
                {activeTab === "portfolio" && "PORTFOLIO"}
              </span>
            </div>

            {/* Corner blades */}
            <img src="/portal/corner-blade.svg" alt="" className="absolute pointer-events-none z-[6] w-[50px] h-[50px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px]" style={{ top: "-3px", left: "-3px" }} />
            <img src="/portal/corner-blade.svg" alt="" className="absolute pointer-events-none z-[6] w-[50px] h-[50px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px]" style={{ top: "-3px", right: "-3px", transform: "scaleX(-1)" }} />
            <img src="/portal/corner-blade.svg" alt="" className="absolute pointer-events-none z-[6] w-[50px] h-[50px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px]" style={{ bottom: "-3px", left: "-3px", transform: "scaleY(-1)" }} />
            <img src="/portal/corner-blade.svg" alt="" className="absolute pointer-events-none z-[6] w-[50px] h-[50px] sm:w-[75px] sm:h-[75px] md:w-[90px] md:h-[90px]" style={{ bottom: "-3px", right: "-3px", transform: "scale(-1,-1)" }} />

            {/* Portfolio arrow blink animation */}
            {activeTab === "portfolio" && (
              <style>{`
                @keyframes arrow-blink {
                  0%, 100% { opacity: 1; }
                  50% { opacity: 0.3; }
                }
              `}</style>
            )}

            {/* Portfolio navigation arrows — casing (always) + arrow (blinks) */}
            {activeTab === "portfolio" && (
              <>
                {/* ── Left casing + arrow — only when hasPrev ── */}
                {portfolioHasPrev && (<>
                  <div
                    className="absolute z-20 w-[40px] sm:w-[50px] md:w-[80px] pointer-events-none"
                    style={{ left: "-3px", top: "50%", transform: "translateX(-50%) translateY(-50%)" }}
                  >
                    <svg viewBox="0 0 132 240" fill="none" className="w-full h-auto">
                      <path d="M66.5 237.142L101.186 213.209C108.896 207.889 113.5 199.12 113.5 189.752V50.9922L113.487 50.1289C113.218 41.2219 108.792 32.9319 101.499 27.7539L66.5 2.90332V237.142Z" fill="url(#lc0)" stroke="black" strokeWidth="3"/>
                      <rect x="107.5" y="100.5" width="23" height="17" fill="url(#lc1)" stroke="black" strokeWidth="3"/>
                      <rect x="107.5" y="122.5" width="23" height="17" fill="url(#lc2)" stroke="black" strokeWidth="3"/>
                      <rect x="107.5" y="144.5" width="23" height="17" fill="url(#lc3)" stroke="black" strokeWidth="3"/>
                      <rect x="107.5" y="78.5" width="23" height="17" fill="url(#lc4)" stroke="black" strokeWidth="3"/>
                      <defs>
                        <linearGradient id="lc0" x1="115" y1="120" x2="65" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0.6" stopColor="#DB433B"/><stop offset="0.61" stopColor="#B02727"/></linearGradient>
                        <linearGradient id="lc1" x1="129" y1="109" x2="109" y2="109" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                        <linearGradient id="lc2" x1="129" y1="131" x2="109" y2="131" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                        <linearGradient id="lc3" x1="129" y1="153" x2="109" y2="153" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                        <linearGradient id="lc4" x1="129" y1="87" x2="109" y2="87" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPortfolioPage((p) => Math.max(0, p - 1))}
                    className="absolute z-[21] w-[40px] sm:w-[50px] md:w-[80px] bg-transparent border-0 p-0 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    style={{ left: "-3px", top: "50%", transform: "translateX(-50%) translateY(-50%)", animation: "arrow-blink 1.2s ease-in-out infinite" }}
                    aria-label="Previous"
                  >
                    <svg viewBox="0 0 132 240" fill="none" className="w-full h-auto">
                      <path d="M11.7441 134.711C3.98363 126.439 3.98363 113.561 11.7441 105.289L61.8203 51.915C75.1532 37.7038 98.9998 47.1385 99 66.625L99 173.375C98.9998 192.862 75.1532 202.296 61.8203 188.085L11.7441 134.711Z" fill="#D9D9D9" stroke="black" strokeWidth="3"/>
                      <path d="M13.5674 133C6.70947 125.69 6.70947 114.31 13.5674 107L63.6436 53.625C75.4262 41.0664 96.4998 49.4044 96.5 66.625L96.5 173.375C96.4998 190.596 75.4262 198.934 63.6436 186.375L13.5674 133Z" fill="#D46836" stroke="white" strokeWidth="2"/>
                      <path d="M17.7096 132.136C10.5503 124.455 10.5503 112.545 17.7096 104.864L60.3695 59.0936C72.7507 45.8097 95 54.5707 95 72.7298L95 164.27C95 182.429 72.7507 191.19 60.3695 177.906L17.7096 132.136Z" fill="url(#la0)"/>
                      <path d="M20.6642 132.621C12.1932 124.714 12.1933 111.286 20.6643 103.379L61.3533 65.4008C74.1375 53.4682 95 62.5337 95 80.0216L95 155.978C95 173.466 74.1375 182.532 61.3533 170.599L20.6642 132.621Z" fill="#FBA73F"/>
                      <path d="M44.8866 123.646C42.7814 121.671 42.7814 118.329 44.8866 116.354L68.5789 94.1256C71.7718 91.1301 77 93.3939 77 97.772V142.228C77 146.606 71.7718 148.87 68.5789 145.874L44.8866 123.646Z" fill="#D46836"/>
                      <ellipse cx="78.3886" cy="55.8832" rx="6" ry="3" transform="rotate(8.80601 78.3886 55.8832)" fill="white"/>
                      <defs>
                        <linearGradient id="la0" x1="65" y1="6.99998" x2="65" y2="106.166" gradientUnits="userSpaceOnUse"><stop offset="0.65" stopColor="#FDC990"/><stop offset="1" stopColor="#F57E3B"/></linearGradient>
                      </defs>
                    </svg>
                  </button>
                </>)}

                {/* ── Right casing + arrow — only when hasNext ── */}
                {portfolioHasNext && (<>
                  <div
                    className="absolute z-20 w-[40px] sm:w-[50px] md:w-[80px] pointer-events-none"
                    style={{ right: "-3px", top: "50%", transform: "translateX(50%) translateY(-50%)" }}
                  >
                    <svg viewBox="0 0 132 240" fill="none" className="w-full h-auto" style={{ transform: "scaleX(-1)" }}>
                    <path d="M66.5 237.142L101.186 213.209C108.896 207.889 113.5 199.12 113.5 189.752V50.9922L113.487 50.1289C113.218 41.2219 108.792 32.9319 101.499 27.7539L66.5 2.90332V237.142Z" fill="url(#rc0)" stroke="black" strokeWidth="3"/>
                    <rect x="107.5" y="100.5" width="23" height="17" fill="url(#rc1)" stroke="black" strokeWidth="3"/>
                    <rect x="107.5" y="122.5" width="23" height="17" fill="url(#rc2)" stroke="black" strokeWidth="3"/>
                    <rect x="107.5" y="144.5" width="23" height="17" fill="url(#rc3)" stroke="black" strokeWidth="3"/>
                    <rect x="107.5" y="78.5" width="23" height="17" fill="url(#rc4)" stroke="black" strokeWidth="3"/>
                    <defs>
                      <linearGradient id="rc0" x1="115" y1="120" x2="65" y2="120" gradientUnits="userSpaceOnUse"><stop offset="0.6" stopColor="#DB433B"/><stop offset="0.61" stopColor="#B02727"/></linearGradient>
                      <linearGradient id="rc1" x1="129" y1="109" x2="109" y2="109" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                      <linearGradient id="rc2" x1="129" y1="131" x2="109" y2="131" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                      <linearGradient id="rc3" x1="129" y1="153" x2="109" y2="153" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                      <linearGradient id="rc4" x1="129" y1="87" x2="109" y2="87" gradientUnits="userSpaceOnUse"><stop offset="0.29" stopColor="#B02828"/><stop offset="0.3" stopColor="#DB443C"/></linearGradient>
                    </defs>
                  </svg>
                </div>

                  <button
                    type="button"
                    onClick={() => setPortfolioPage((p) => p + 1)}
                    className="absolute z-[21] w-[40px] sm:w-[50px] md:w-[80px] bg-transparent border-0 p-0 cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    style={{ right: "-3px", top: "50%", transform: "translateX(50%) translateY(-50%)", animation: "arrow-blink 1.2s ease-in-out infinite" }}
                    aria-label="Next"
                  >
                    <svg viewBox="0 0 132 240" fill="none" className="w-full h-auto" style={{ transform: "scaleX(-1)" }}>
                      <path d="M11.7441 134.711C3.98363 126.439 3.98363 113.561 11.7441 105.289L61.8203 51.915C75.1532 37.7038 98.9998 47.1385 99 66.625L99 173.375C98.9998 192.862 75.1532 202.296 61.8203 188.085L11.7441 134.711Z" fill="#D9D9D9" stroke="black" strokeWidth="3"/>
                      <path d="M13.5674 133C6.70947 125.69 6.70947 114.31 13.5674 107L63.6436 53.625C75.4262 41.0664 96.4998 49.4044 96.5 66.625L96.5 173.375C96.4998 190.596 75.4262 198.934 63.6436 186.375L13.5674 133Z" fill="#D46836" stroke="white" strokeWidth="2"/>
                      <path d="M17.7096 132.136C10.5503 124.455 10.5503 112.545 17.7096 104.864L60.3695 59.0936C72.7507 45.8097 95 54.5707 95 72.7298L95 164.27C95 182.429 72.7507 191.19 60.3695 177.906L17.7096 132.136Z" fill="url(#ra0)"/>
                      <path d="M20.6642 132.621C12.1932 124.714 12.1933 111.286 20.6643 103.379L61.3533 65.4008C74.1375 53.4682 95 62.5337 95 80.0216L95 155.978C95 173.466 74.1375 182.532 61.3533 170.599L20.6642 132.621Z" fill="#FBA73F"/>
                      <path d="M44.8866 123.646C42.7814 121.671 42.7814 118.329 44.8866 116.354L68.5789 94.1256C71.7718 91.1301 77 93.3939 77 97.772V142.228C77 146.606 71.7718 148.87 68.5789 145.874L44.8866 123.646Z" fill="#D46836"/>
                      <ellipse cx="78.3886" cy="55.8832" rx="6" ry="3" transform="rotate(8.80601 78.3886 55.8832)" fill="white"/>
                      <defs>
                        <linearGradient id="ra0" x1="65" y1="6.99998" x2="65" y2="106.166" gradientUnits="userSpaceOnUse"><stop offset="0.65" stopColor="#FDC990"/><stop offset="1" stopColor="#F57E3B"/></linearGradient>
                      </defs>
                    </svg>
                  </button>
                </>)}
              </>
            )}

            {/* Content inside the board */}
            <div
              className={`relative z-10 px-6 pt-8 pb-5 sm:px-10 sm:pt-12 sm:pb-8 ${activeTab === "ranking" || activeTab === "transfer" || activeTab === "home" ? "overflow-visible" : "overflow-y-auto"} ${activeTab === "portfolio" ? "flex items-center justify-center" : ""}`}
              style={{ minHeight: "420px", maxHeight: activeTab === "ranking" || activeTab === "transfer" || activeTab === "home" ? undefined : "calc(100svh - 180px)" }}
            >
              {renderTab()}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <BottomNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setPortfolioPage(0); }} />

      {/* Hidden children (page.tsx returns null) */}
      <div className="hidden">{children}</div>
    </div>
  );
}
