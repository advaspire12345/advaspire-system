"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";
import { cn } from "@/lib/utils";

export interface TransactionItem {
  id: string;
  studentName: string;
  type: "earned" | "spent";
  amount: number;
  description: string | null;
  branchId: string;
  avatarUrl?: string;
  rank: number;
  timeAgo: string;
}

interface AdcoinTransactionsProps {
  transactions: TransactionItem[];
  branches: { id: string; name: string }[];
}

export function AdcoinTransactions({
  transactions,
  branches,
}: AdcoinTransactionsProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);

  const filteredTransactions =
    selectedBranchId === null
      ? transactions
      : transactions.filter((item) => item.branchId === selectedBranchId);

  const filterLabel =
    selectedBranchId === null
      ? "All Branches"
      : (branches.find((b) => b.id === selectedBranchId)?.name ??
        "All Branches");

  return (
    <Card className="h-[363px] flex flex-col">
      <CardHeader className="">
        <div className="flex items-center justify-between">
          <CardTitle className="font-bold">Adcoin Transaction</CardTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs font-semibold"
              >
                {filterLabel}
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setSelectedBranchId(null)}
                className={cn(
                  selectedBranchId === null && "font-semibold bg-accent",
                )}
              >
                All Branches
              </DropdownMenuItem>
              {branches.map((branch) => (
                <DropdownMenuItem
                  key={branch.id}
                  onClick={() => setSelectedBranchId(branch.id)}
                  className={cn(
                    selectedBranchId === branch.id && "font-semibold bg-accent",
                  )}
                >
                  {branch.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No transactions for this branch.
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTransactions.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2">
                <div className="relative shrink-0">
                  <HexagonAvatar
                    size={60}
                    imageUrl={item.avatarUrl}
                    percentage={0.5}
                    animated={false}
                    fallbackInitials={item.studentName.charAt(0)}
                  />
                  <div className="absolute bottom-1 right-1 z-10">
                    <HexagonNumberBadge value={item.rank} size={24} />
                  </div>
                </div>

                <div className="flex flex-1 items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center rounded-full bg-white px-2 py-1 text-xs font-bold shadow-sm">
                    <span
                      className={cn(
                        "mr-0.5 text-lg",
                        item.type === "earned"
                          ? "text-[#23D2E2]"
                          : "text-red-500",
                      )}
                    >
                      {item.type === "earned" ? "+" : "-"}
                    </span>
                    <span className="text-gray-800">
                      {item.amount.toLocaleString()} ADCOINS
                    </span>
                  </span>

                  <p className="text-sm font-bold text-gray-800 truncate">
                    {item.description ?? item.studentName}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className="text-xs text-muted-foreground font-semibold">
                    {item.timeAgo}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
