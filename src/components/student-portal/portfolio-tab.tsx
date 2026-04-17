"use client";

import { useEffect, useState } from "react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  lesson: string | null;
  adcoin: number;
  courseName: string;
}

interface AttendanceSummary {
  totalClasses: number;
  attended: number;
  absent: number;
  percentage: number;
  recentRecords: AttendanceRecord[];
}

interface Enrollment {
  id: string;
  courseName: string;
  status: string;
  sessionsRemaining: number;
  level: number;
  schedule: string | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  sender_id: string | null;
  receiver_id: string | null;
  created_at: string;
}

interface PortfolioTabProps {
  studentId: string;
}

type Section = "attendance" | "enrollments" | "transactions";

const sections: { id: Section; label: string }[] = [
  { id: "attendance", label: "ATTEND" },
  { id: "enrollments", label: "COURSES" },
  { id: "transactions", label: "HISTORY" },
];

export function PortfolioTab({ studentId }: PortfolioTabProps) {
  const [section, setSection] = useState<Section>("attendance");
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/student-portal/attendance").then((r) => r.json()),
      fetch("/api/student-portal/enrollments").then((r) => r.json()),
      fetch("/api/student-portal/transactions").then((r) => r.json()),
    ])
      .then(([att, enr, txn]) => {
        setAttendance(att);
        setEnrollments(Array.isArray(enr) ? enr : []);
        setTransactions(Array.isArray(txn) ? txn : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-amber-300/70 text-xs font-bold tracking-widest animate-pulse" style={{ fontFamily: "monospace" }}>LOADING DATA...</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-amber-300 font-bold text-sm tracking-wider text-center" style={{ fontFamily: "monospace", textShadow: "0 0 6px rgba(245,158,11,0.3)" }}>
        PORTFOLIO
      </h2>

      {/* Section toggle */}
      <div className="flex rounded overflow-hidden" style={{ border: "1px solid rgba(100,160,200,0.15)" }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="flex-1 px-2 py-1.5 text-[9px] font-bold tracking-wider transition-all"
            style={{
              fontFamily: "monospace",
              background: section === s.id ? "rgba(229,168,53,0.25)" : "rgba(15,35,55,0.6)",
              color: section === s.id ? "#e5a835" : "#6a8a9f",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Attendance */}
      {section === "attendance" && attendance && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            <MiniGauge label="PRESENT" value={attendance.attended} color="#5ab87a" />
            <MiniGauge label="ABSENT" value={attendance.absent} color="#c45a5a" />
            <MiniGauge label="RATE" value={`${attendance.percentage}%`} color="#e5a835" />
          </div>
          <div className="space-y-1">
            {attendance.recentRecords.length === 0 ? (
              <Empty text="NO RECORDS" />
            ) : (
              attendance.recentRecords.map((r) => {
                const ok = r.status === "present" || r.status === "late";
                return (
                  <div key={r.id} className="flex items-center gap-2 rounded p-2" style={{ background: "rgba(15,35,55,0.6)", border: "1px solid rgba(100,160,200,0.06)" }}>
                    <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: ok ? "#5ab87a" : "#c45a5a", boxShadow: `0 0 4px ${ok ? "#5ab87a66" : "#c45a5a66"}` }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs truncate" style={{ fontFamily: "monospace" }}>{r.lesson || r.courseName}</div>
                      <div className="text-[#4a6a7f] text-[9px]" style={{ fontFamily: "monospace" }}>{new Date(r.date).toLocaleDateString()}</div>
                    </div>
                    {r.adcoin > 0 && <div className="text-amber-400 text-[10px] font-bold flex-shrink-0" style={{ fontFamily: "monospace" }}>+{r.adcoin}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Enrollments */}
      {section === "enrollments" && (
        <div className="space-y-1.5">
          {enrollments.length === 0 ? (
            <Empty text="NO COURSES" />
          ) : (
            enrollments.map((e) => (
              <div key={e.id} className="rounded p-2.5 space-y-1.5" style={{ background: "rgba(15,35,55,0.6)", border: "1px solid rgba(100,160,200,0.08)" }}>
                <div className="text-white text-xs font-bold" style={{ fontFamily: "monospace" }}>{e.courseName}</div>
                <div className="flex items-center gap-2 text-[9px]" style={{ fontFamily: "monospace" }}>
                  <span className="text-[#6a8a9f]">{e.sessionsRemaining} SESSIONS</span>
                  <span className="text-[#6aafcf]">LV.{e.level}</span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{
                    background: e.status === "active" ? "rgba(90,184,122,0.15)" : "rgba(100,160,200,0.1)",
                    color: e.status === "active" ? "#5ab87a" : "#6a8a9f",
                    border: `1px solid ${e.status === "active" ? "rgba(90,184,122,0.2)" : "rgba(100,160,200,0.1)"}`,
                  }}>{e.status.toUpperCase()}</span>
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(10,25,40,0.8)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.sessionsRemaining * 10)}%`, background: "#6aafcf", boxShadow: "0 0 4px #6aafcf66" }} />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transactions */}
      {section === "transactions" && (
        <div className="space-y-1">
          {transactions.length === 0 ? (
            <Empty text="NO TRANSACTIONS" />
          ) : (
            transactions.map((t) => {
              const isSent = t.sender_id === studentId;
              const isTransfer = t.type === "transfer";
              return (
                <div key={t.id} className="flex items-center gap-2 rounded p-2" style={{ background: "rgba(15,35,55,0.6)", border: "1px solid rgba(100,160,200,0.06)" }}>
                  <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0" style={{
                    background: isSent ? "rgba(196,90,90,0.15)" : "rgba(90,184,122,0.15)",
                    color: isSent ? "#c45a5a" : "#5ab87a",
                    fontFamily: "monospace",
                  }}>
                    {isSent ? "↑" : "↓"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs truncate" style={{ fontFamily: "monospace" }}>{t.description || (isTransfer ? (isSent ? "Sent" : "Received") : t.type)}</div>
                    <div className="text-[#4a6a7f] text-[9px]" style={{ fontFamily: "monospace" }}>{new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-xs font-bold flex-shrink-0" style={{ fontFamily: "monospace", color: isSent ? "#c45a5a" : "#5ab87a" }}>
                    {isSent ? "-" : "+"}{t.amount}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function MiniGauge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded p-2 text-center" style={{ background: "rgba(15,35,55,0.7)", border: `1px solid ${color}20` }}>
      <div className="font-bold text-base" style={{ fontFamily: "monospace", color, textShadow: `0 0 6px ${color}44` }}>{value}</div>
      <div className="text-[#4a6a7f] text-[8px] font-bold tracking-wider" style={{ fontFamily: "monospace" }}>{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-10 text-[#4a6a7f] text-xs" style={{ fontFamily: "monospace" }}>{text}</div>;
}
