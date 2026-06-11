"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionTransferModal } from "@/components/transfers/session-transfer-modal";
import type { SessionTransferRow, TransferableStudent } from "@/data/session-transfers";

interface TransfersClientProps {
  initialRows: SessionTransferRow[];
  students: TransferableStudent[];
}

const STATUS_LABELS: Record<string, string> = {
  pending_sender: "Awaiting sender",
  pending_receiver: "Awaiting receiver",
  executed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  pending_sender: "bg-amber-100 text-amber-800",
  pending_receiver: "bg-blue-100 text-blue-800",
  executed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-700",
};

export function TransfersClient({ initialRows, students }: TransfersClientProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Card className="mt-4">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">All Transfers</h2>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Session Transfer
            </Button>
          </div>

          {initialRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No session transfers yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">From</th>
                    <th className="px-3 py-2 text-left">To</th>
                    <th className="px-3 py-2 text-left">Course</th>
                    <th className="px-3 py-2 text-right">Sessions</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {initialRows.map((r) => (
                    <tr key={r.transfer.id}>
                      <td className="px-3 py-2 text-gray-700">
                        {new Date(r.transfer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.fromStudentName}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{r.toStudentName}</td>
                      <td className="px-3 py-2 text-gray-700">{r.courseName}</td>
                      <td className="px-3 py-2 text-right font-semibold">{r.transfer.sessions}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATUS_STYLES[r.transfer.status] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STATUS_LABELS[r.transfer.status] ?? r.transfer.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <SessionTransferModal
        open={open}
        onOpenChange={setOpen}
        students={students}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
