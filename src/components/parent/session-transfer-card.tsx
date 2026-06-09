"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface TransferRow {
  id: string;
  fromStudentName: string;
  toStudentName: string;
  courseName: string;
  sessions: number;
}

interface SessionTransferCardProps {
  /** "approve" = sender's parent confirming the gift; "accept" = receiver's parent claiming it. */
  mode: "approve" | "accept";
  rows: TransferRow[];
}

export function SessionTransferCard({ mode, rows }: SessionTransferCardProps) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  if (rows.length === 0) return null;

  const handle = (id: string, action: "approve" | "accept" | "reject") => {
    setPendingId(id);
    startTransition(async () => {
      try {
        const res = await fetch("/api/session-transfers", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          alert(j.error ?? "Action failed");
          return;
        }
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  };

  const title = mode === "approve"
    ? "Action needed — Approve session transfer"
    : "Pending session transfer to accept";

  return (
    <section className="rounded-2xl border-2 border-[#FFC857] bg-[#FFFBEC] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#FFC857] text-base font-bold text-[#5B3A00]">!</span>
        <h3 className="text-base font-bold text-foreground">{title}</h3>
      </div>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl bg-white p-4 ring-1 ring-gray-200">
            <div className="text-sm text-foreground">
              {mode === "approve" ? (
                <>
                  Transfer <strong>{row.sessions}</strong> session{row.sessions === 1 ? "" : "s"} from
                  <span className="font-bold"> {row.fromStudentName} </span>
                  to <span className="font-bold">{row.toStudentName}</span> ({row.courseName}).
                </>
              ) : (
                <>
                  Receive <strong>{row.sessions}</strong> session{row.sessions === 1 ? "" : "s"} from
                  <span className="font-bold"> {row.fromStudentName} </span>
                  for <span className="font-bold">{row.toStudentName}</span> ({row.courseName}).
                </>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handle(row.id, mode === "approve" ? "approve" : "accept")}
                disabled={isPending && pendingId === row.id}
                className="rounded-md bg-[#615DFA] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#5048E5] disabled:opacity-50"
              >
                {mode === "approve" ? "Approve" : "Accept"}
              </button>
              <button
                type="button"
                onClick={() => handle(row.id, "reject")}
                disabled={isPending && pendingId === row.id}
                className="rounded-md border border-gray-200 px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
