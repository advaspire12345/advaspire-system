"use client";

import { useRouter } from "next/navigation";
import { Coins, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

interface ParentNavProps {
  parentName: string;
}

export function ParentNav({ parentName }: ParentNavProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-50 flex h-14 md:h-16 w-full items-center justify-between px-4 md:px-6"
      style={{
        background: "linear-gradient(135deg, #F17521, #EB1A33, #FB06D4)",
      }}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
          <Coins className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-white tracking-tight">
          Advaspire
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm font-semibold text-white/90">
          {parentName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="h-8 w-8 p-0 text-white hover:bg-white/20 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
