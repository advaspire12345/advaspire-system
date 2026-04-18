"use client";

import { useEffect, useState } from "react";

interface StudentProfile {
  id: string;
  name: string;
  photo: string | null;
  level: number;
  adcoinBalance: number;
  poolName: string | null;
  programName: string | null;
}

interface AttendanceSummary {
  totalClasses: number;
  attended: number;
  absent: number;
  percentage: number;
}

interface Enrollment {
  id: string;
  sessionsRemaining: number;
}

interface HomeTabProps {
  studentId: string;
  studentName: string;
}

export function HomeTab({ studentId, studentName }: HomeTabProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [totalSessionsRemaining, setTotalSessionsRemaining] = useState(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/student-portal/profile").then((r) => r.json()),
      fetch("/api/student-portal/attendance").then((r) => r.json()),
      fetch("/api/student-portal/enrollments").then((r) => r.json()),
    ])
      .then(([profData, att, enr]) => {
        setProfile(profData?.profile ?? profData);
        setAttendance(att);
        const enrollments: Enrollment[] = Array.isArray(enr) ? enr : [];
        setTotalSessionsRemaining(enrollments.reduce((sum, e) => sum + e.sessionsRemaining, 0));
      })
      .catch(console.error);
  }, [studentId]);

  return (
    <div className="flex flex-col sm:flex-row items-center sm:items-end justify-center gap-0 w-full mt-6 sm:mt-0">
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
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Right side (desktop) / Bottom (mobile): sign + modal board */}
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
              WELCOME
            </span>
          </div>
        </div>

        {/* Modal board with handles */}
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

          {/* Content overlay on the modal board */}
          <div
            className="absolute z-20 flex flex-col justify-center gap-2.5 sm:gap-3"
            style={{ top: "0", left: "8%", right: "8%", bottom: "0" }}
          >
            {/* Full column — ADCOIN progress bar */}
            <AdcoinBar value={profile?.adcoinBalance ?? 0} />
            {/* Full column — INVENTORY */}
            <InventoryBar />
            {/* Paired half columns — shared teal background per row */}
            <PairedRow
              left={{ label: "PROGRAM", value: profile?.programName ?? "None", icon: <StarSvg /> }}
              right={{ label: "LEVEL", value: `${profile?.level ?? 1}`, icon: <LevelSvg /> }}
            />
            <PairedRow
              left={{ label: "SESSION", value: `${totalSessionsRemaining}`, icon: <ClockSvg /> }}
              right={{ label: "ATTENDED", value: `${attendance?.attended ?? 0}`, icon: <CheckSvg /> }}
            />
          </div>

          {/* Red button straddling the bottom edge */}
          <button
            className="absolute z-20 left-[15%] right-[15%] hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ bottom: 0, transform: "translateY(50%)" }}
          >
            <img src="/portal/btn-red-long.svg" alt="" className="h-11 sm:h-16 w-auto mx-auto" />
            <span
              className="absolute inset-0 flex items-center justify-center font-bold text-white tracking-wider"
              style={{ fontFamily: "monospace", fontSize: "clamp(9px, 2vw, 14px)" }}
            >
              ADCOIN QUEST
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: "#397392", borderRadius: "6px", padding: "8px", position: "relative" }}>
      <span
        style={{
          position: "absolute",
          top: "-8px",
          left: "10px",
          color: "#8DDDF5",
          fontSize: "9px",
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: "0.18em",
          lineHeight: 1.3,
          WebkitTextStroke: "3px #1C3752",
          paintOrder: "stroke fill",
          textShadow: "0 0 6px rgba(141,221,245,0.4)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          position: "absolute",
          left: "14px",
          bottom: "15px",
          width: "16px",
          height: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {icon}
      </div>
      <div
        className="truncate"
        style={{
          background: "#1C3752",
          borderRadius: "5px",
          fontFamily: "monospace",
          width: "100%",
          padding: "8px 10px 8px 28px",
          color: "#fff",
          fontSize: "clamp(11px, 2.5vw, 13px)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

interface HalfFieldProps {
  label: string;
  value: string;
  icon: React.ReactNode;
}

function PairedRow({ left, right }: { left: HalfFieldProps; right: HalfFieldProps }) {
  return (
    <div style={{ background: "#397392", borderRadius: "6px", padding: "8px", position: "relative" }}>
      <div className="grid grid-cols-2 gap-3">
        {/* Left half */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: "-16px",
              left: "4px",
              color: "#8DDDF5",
              fontSize: "9px",
              fontWeight: 800,
              fontFamily: "monospace",
              letterSpacing: "0.18em",
              lineHeight: 1.3,
              WebkitTextStroke: "3px #1C3752",
              paintOrder: "stroke fill",
              textShadow: "0 0 6px rgba(141,221,245,0.4)",
            }}
          >
            {left.label}
          </span>
          <div
            style={{
              position: "absolute",
              left: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {left.icon}
          </div>
          <div
            className="truncate"
            style={{
              background: "#1C3752",
              borderRadius: "5px",
              fontFamily: "monospace",
              width: "100%",
              padding: "8px 10px 8px 28px",
              color: "#fff",
              fontSize: "clamp(11px, 2.5vw, 13px)",
            }}
          >
            {left.value}
          </div>
        </div>
        {/* Right half */}
        <div style={{ position: "relative" }}>
          <span
            style={{
              position: "absolute",
              top: "-16px",
              left: "4px",
              color: "#8DDDF5",
              fontSize: "9px",
              fontWeight: 800,
              fontFamily: "monospace",
              letterSpacing: "0.18em",
              lineHeight: 1.3,
              WebkitTextStroke: "3px #1C3752",
              paintOrder: "stroke fill",
              textShadow: "0 0 6px rgba(141,221,245,0.4)",
            }}
          >
            {right.label}
          </span>
          <div
            style={{
              position: "absolute",
              left: "6px",
              top: "50%",
              transform: "translateY(-50%)",
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            {right.icon}
          </div>
          <div
            className="truncate"
            style={{
              background: "#1C3752",
              borderRadius: "5px",
              fontFamily: "monospace",
              width: "100%",
              padding: "8px 10px 8px 28px",
              color: "#fff",
              fontSize: "clamp(11px, 2.5vw, 13px)",
            }}
          >
            {right.value}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Mini SVG icons for fields */
function CoinSvg() {
  return (
    <svg viewBox="0 0 16 16" className="w-full h-full">
      <circle cx="8" cy="8" r="7" fill="#e5a835" stroke="#b8871a" strokeWidth="1" />
      <text x="8" y="9" textAnchor="middle" dominantBaseline="middle" fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="5">AC</text>
    </svg>
  );
}
function BoxSvg() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
      <rect x="2" y="5" width="12" height="9" rx="1" fill="#8DDDF5" opacity="0.8" />
      <path d="M1 5L8 2L15 5" stroke="#8DDDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarSvg() {
  return (
    <svg viewBox="0 0 16 16" className="w-full h-full">
      <polygon points="8,1 10,6 15,6.5 11.5,10 12.5,15 8,12.5 3.5,15 4.5,10 1,6.5 6,6" fill="#e5a835" stroke="#b8871a" strokeWidth="0.5" />
    </svg>
  );
}
function LevelSvg() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
      <path d="M3 13L8 3L13 13H3Z" fill="#8DDDF5" opacity="0.8" />
      <text x="8" y="12" textAnchor="middle" dominantBaseline="middle" fill="#1C3752" fontFamily="monospace" fontWeight="900" fontSize="6">L</text>
    </svg>
  );
}
function ClockSvg() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
      <circle cx="8" cy="8" r="6.5" stroke="#8DDDF5" strokeWidth="1.5" opacity="0.8" />
      <path d="M8 4V8L11 10" stroke="#8DDDF5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function CheckSvg() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="w-full h-full">
      <path d="M3 8.5L6.5 12L13 4" stroke="#5ab87a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const INVENTORY_SLOTS = 4;

function InventoryBar() {
  const items = [null, null, null]; // placeholder empty slots
  return (
    <div style={{ background: "#397392", borderRadius: "6px", padding: "8px", position: "relative" }}>
      <span
        style={{
          position: "absolute",
          top: "-8px",
          left: "10px",
          color: "#8DDDF5",
          fontSize: "9px",
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: "0.18em",
          lineHeight: 1.3,
          WebkitTextStroke: "3px #1C3752",
          paintOrder: "stroke fill",
          textShadow: "0 0 6px rgba(141,221,245,0.4)",
        }}
      >
        INVENTORY
      </span>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        {Array.from({ length: INVENTORY_SLOTS }, (_, i) => (
          <div
            key={i}
            style={{
              width: "clamp(36px, 8vw, 54px)",
              aspectRatio: "1",
              background: "transparent",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: i === INVENTORY_SLOTS - 1 ? "none" : "3.5px solid #1C3752",
            }}
          >
            {i === INVENTORY_SLOTS - 1 ? (
              /* Counter plus SVG on last slot */
              <img src="/portal/counter-plus.svg" alt="+" className="w-full h-full object-contain" />
            ) : (
              /* Inner colored square */
              <div
                style={{
                  width: "65%",
                  height: "65%",
                  borderRadius: "10px",
                  background: "#1C3752",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const SEGMENTS = 10;
const ADCOIN_PER_SEGMENT = 100;
const ADCOIN_MAX = SEGMENTS * ADCOIN_PER_SEGMENT;

function AdcoinBar({ value }: { value: number }) {
  const filled = Math.min(SEGMENTS, Math.floor(value / ADCOIN_PER_SEGMENT));

  return (
    <div style={{ background: "#397392", borderRadius: "6px", padding: "8px", position: "relative" }}>
      <span
        style={{
          position: "absolute",
          top: "-8px",
          left: "10px",
          color: "#8DDDF5",
          fontSize: "9px",
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: "0.18em",
          lineHeight: 1.3,
          WebkitTextStroke: "3px #1C3752",
          paintOrder: "stroke fill",
          textShadow: "0 0 6px rgba(141,221,245,0.4)",
        }}
      >
        ADCOIN
      </span>
      {/* Value label above progress bar */}
      <div
        style={{
          textAlign: "right",
          color: "#e5a835",
          fontSize: "9px",
          fontWeight: 800,
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          lineHeight: 1.3,
          marginBottom: "1px",
          textShadow: "0 0 6px rgba(229,168,53,0.4)",
        }}
      >
        {value} / {ADCOIN_MAX}
      </div>
      <div style={{ position: "relative" }}>
        {/* Adcoin icon — half covering the bar */}
        <div
          style={{
            position: "absolute",
            left: "-4px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
            width: "clamp(24px, 5vw, 36px)",
            height: "clamp(24px, 5vw, 36px)",
          }}
        >
          <svg viewBox="-2 -2 36 36" className="w-full h-full drop-shadow-lg">
            <circle cx="16" cy="16" r="15" fill="#e5a835" stroke="black" strokeWidth="3" />
            <circle cx="16" cy="16" r="13" fill="#e5a835" stroke="white" strokeWidth="1.5" />
            <text x="16" y="17" textAnchor="middle" dominantBaseline="middle" fill="#7a4a00" fontFamily="monospace" fontWeight="900" fontSize="10">AC</text>
          </svg>
        </div>
        <div
          style={{
            background: "#0e1f30",
            borderRadius: "5px",
            padding: "4px",
            marginLeft: "clamp(8px, 2.1vw, 14px)",
            paddingLeft: "calc(clamp(8px, 2.1vw, 14px) + 5px)",
            display: "flex",
            gap: "3px",
          }}
        >
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: "clamp(14px, 3vw, 22px)",
                borderRadius: "2px",
                background: i < filled
                  ? "linear-gradient(to bottom, #b8871a, #e5a835, #fcd34d)"
                  : "linear-gradient(to bottom, rgba(40,70,100,0.6), rgba(80,120,160,0.3))",
                boxShadow: i < filled ? "0 0 4px rgba(229,168,53,0.5)" : "none",
                transition: "background 0.3s",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "1px 1px 0",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "35%",
                  borderRadius: "1px",
                  background: i < filled
                    ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.05)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
