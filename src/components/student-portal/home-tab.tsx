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

interface HomeTabProps {
  studentId: string;
  studentName: string;
}

export function HomeTab({ studentId, studentName }: HomeTabProps) {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/student-portal/profile").then((r) => r.json()),
      fetch("/api/student-portal/attendance").then((r) => r.json()),
    ])
      .then(([profileData, attendanceData]) => {
        setProfile(profileData);
        setAttendance(attendanceData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-amber-300 text-xs font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>
          LOADING DATA...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Welcome */}
      <div className="text-center">
        <h1
          className="text-lg sm:text-xl font-bold text-amber-300 tracking-wide"
          style={{ fontFamily: "monospace", textShadow: "0 0 8px rgba(245,158,11,0.3), 2px 2px 4px rgba(0,0,0,0.5)" }}
        >
          Welcome, {studentName}!
        </h1>
        <p className="text-[#8aa8c0] text-xs mt-1" style={{ fontFamily: "monospace" }}>
          DASHBOARD OVERVIEW
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard label="LEVEL" value={`${profile?.level ?? 1}`} color="amber" />
        <StatCard label="ADCOINS" value={`${profile?.adcoinBalance ?? 0}`} color="amber" />
        <StatCard label="PROGRAM" value={profile?.programName ?? "None"} color="teal" />
        <StatCard label="POOL" value={profile?.poolName ?? "Solo"} color="teal" />
      </div>

      {/* Attendance */}
      {attendance && (
        <div
          className="rounded-md p-3 sm:p-4"
          style={{
            background: "rgba(15,35,55,0.7)",
            border: "1px solid rgba(100,160,200,0.15)",
            boxShadow: "inset 0 1px 0 rgba(100,160,200,0.08)",
          }}
        >
          <div className="text-[#8aa8c0] text-[10px] font-bold tracking-[0.2em] mb-3" style={{ fontFamily: "monospace" }}>
            ATTENDANCE
          </div>

          <div className="flex items-center gap-4">
            {/* Ring gauge */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(20,50,70,0.8)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="14" fill="none"
                  stroke="#e5a835"
                  strokeWidth="3"
                  strokeDasharray={`${attendance.percentage * 0.88}, 100`}
                  strokeLinecap="round"
                  style={{ filter: "drop-shadow(0 0 3px rgba(229,168,53,0.5))" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-amber-300 text-sm font-bold" style={{ fontFamily: "monospace" }}>{attendance.percentage}%</span>
              </div>
            </div>

            {/* Bars */}
            <div className="flex-1 space-y-2.5">
              <BarStat label="TOTAL" value={attendance.totalClasses} max={attendance.totalClasses || 1} color="#6aafcf" />
              <BarStat label="ATTENDED" value={attendance.attended} max={attendance.totalClasses || 1} color="#5ab87a" />
              <BarStat label="ABSENT" value={attendance.absent} max={attendance.totalClasses || 1} color="#c45a5a" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: "amber" | "teal" }) {
  const borderColor = color === "amber" ? "rgba(229,168,53,0.2)" : "rgba(100,180,210,0.2)";
  const textColor = color === "amber" ? "#e5a835" : "#6aafcf";

  return (
    <div
      className="rounded-md p-2.5 sm:p-3"
      style={{
        background: "rgba(15,35,55,0.7)",
        border: `1px solid ${borderColor}`,
        boxShadow: "inset 0 1px 0 rgba(100,160,200,0.05)",
      }}
    >
      <div className="text-[#6a8a9f] text-[9px] font-bold tracking-[0.15em] mb-1" style={{ fontFamily: "monospace" }}>
        {label}
      </div>
      <div
        className="font-bold text-sm truncate"
        style={{ fontFamily: "monospace", color: textColor, textShadow: `0 0 6px ${textColor}33` }}
      >
        {value}
      </div>
    </div>
  );
}

function BarStat({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between mb-0.5">
        <span className="text-[#6a8a9f] text-[9px] font-bold tracking-wider" style={{ fontFamily: "monospace" }}>{label}</span>
        <span className="text-[9px] font-bold" style={{ fontFamily: "monospace", color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(15,30,50,0.8)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}66` }}
        />
      </div>
    </div>
  );
}
