"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import type { StudentProgressRow } from "@/data/student-progress";

const PER_PAGE = 20;

interface Props {
  rows: StudentProgressRow[];
  totalCount: number;
  /** Base URL of the Learning Hub for deep-links (e.g. https://learn.advaspire.com). */
  learnBaseUrl: string;
}

export function StudentProgressTable({ rows, learnBaseUrl }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.studentCode ?? "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between gap-4">
          <Input
            placeholder="Search by name or student ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="max-w-xs"
          />
          <span className="text-sm text-muted-foreground">
            {filtered.length} student{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead className="text-center">Lessons (done / tracked)</TableHead>
              <TableHead className="text-center">Assessments marked</TableHead>
              <TableHead className="text-center">Certificates</TableHead>
              <TableHead className="text-right">Learning Hub</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((r) => (
              <TableRow key={r.studentId}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  {r.studentCode ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>{r.branchName ?? "—"}</TableCell>
                <TableCell className="text-center">
                  {r.lessonsApproved} / {r.lessonsTracked}
                </TableCell>
                <TableCell className="text-center">{r.assessmentsMarked}</TableCell>
                <TableCell className="text-center">
                  {r.certificates > 0 ? (
                    <Badge variant="secondary">{r.certificates}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      href={`${learnBaseUrl}/dashboard/assessment/student/${r.studentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {slice.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={current <= 1}
              onClick={() => setPage(current - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {current} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pages}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
