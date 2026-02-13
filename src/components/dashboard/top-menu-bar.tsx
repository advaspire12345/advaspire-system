"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Coins, Search, Settings, Bell, X, LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { HexagonAvatar } from "@/components/ui/hexagon-avatar";
import { HexagonNumberBadge } from "@/components/ui/hexagon-number-badge";

interface UserProfile {
  name: string;
  email: string;
  avatar: string | null;
}

interface AdcoinStats {
  totalAdcoinBalance: number;
  adcoinChange: number;
}

export function TopMenuBar() {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adcoinStats, setAdcoinStats] = useState<AdcoinStats | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        setUser({
          name:
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "User",
          email: authUser.email || "",
          avatar: authUser.user_metadata?.avatar_url || null,
        });
      }
    }
    getUser();
  }, [supabase]);

  useEffect(() => {
    async function fetchAdcoinStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setAdcoinStats(data);
        }
      } catch (error) {
        console.error("Error fetching adcoin stats:", error);
      }
    }
    fetchAdcoinStats();
  }, []);

  const handleClearSearch = () => {
    setSearchValue("");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex h-20 w-full items-center justify-between px-4"
      style={{
        background: "linear-gradient(135deg, #F17521, #EB1A33, #FB06D4)",
      }}
    >
      {/* Start: Logo and sidebar trigger */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 text-white hover:bg-white/20 hover:text-white" />
        <Separator orientation="vertical" className="mx-2 h-4 bg-white/30" />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-white">
            <Coins className="h-4 w-4" />
          </div>
          <span className="font-semibold text-white">Advaspire</span>
        </div>
      </div>

      {/* Middle: Search bar */}
      <div className="relative flex h-[52px] w-[375px] items-center rounded-md bg-black/30">
        <input
          type="text"
          placeholder="Search..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className={`h-full w-full rounded-md bg-transparent pl-3 pr-10 text-sm caret-white focus:outline-none ${
            searchValue ? "font-bold text-white" : "font-semibold text-white/70"
          } placeholder:text-white/50`}
        />
        {searchValue ? (
          <X
            size={20}
            className="absolute right-3 cursor-pointer text-white/60 hover:text-white"
            aria-hidden="true"
            onClick={handleClearSearch}
          />
        ) : (
          <Search
            size={20}
            className="pointer-events-none absolute right-3 text-white/60"
            aria-hidden="true"
          />
        )}
      </div>

      {/* End: Progress bar, notifications, settings, user */}
      <div className="flex items-center gap-2">
        {/* Adcoins progress */}
        <div className="hidden flex-col items-start md:flex px-5">
          <div className="flex items-center justify-between w-full gap-8">
            <span className="text-white text-sm font-bold">Adcoins:</span>
            <span className="text-white text-sm font-bold">
              {adcoinStats?.totalAdcoinBalance?.toLocaleString() ?? "—"}
            </span>
          </div>
          <div className="w-full h-1.5 rounded-lg bg-[#4E4AC8]">
            <div
              className="h-full rounded-lg bg-white transition-all duration-300"
              style={{
                width: adcoinStats
                  ? `${Math.min(100, Math.max(10, (adcoinStats.adcoinChange + 100) / 2))}%`
                  : "50%",
              }}
            />
          </div>
        </div>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8 bg-white/30"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
        >
          <Bell className="h-6 w-6 size-10" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8 bg-white/30"
        />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
            >
              <Settings className="h-6 w-6 size-10" />
              <span className="sr-only">Settings</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 px-6 pb-6"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-2 py-2 -ml-2">
                <div className="relative shrink-0">
                  <HexagonAvatar
                    size={50}
                    imageUrl={user?.avatar ?? undefined}
                    percentage={0.9}
                    fallbackInitials={userInitials}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 z-10">
                    <HexagonNumberBadge value={2} size={28} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="font-bold">Hi {user?.name}!</span>
                  </p>
                  <p className="mt-1 text-xs">@{user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuItem
              onClick={() => router.push("/dashboard/profile")}
              className="font-bold hover:translate-x-1 !hover:bg-white backdrop-blur-sm border-white/20 hover:text-[#23D2E2] data-[highlighted]:translate-x-1 data-[highlighted]:text-[#23D2E2]"
            >
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
              className="font-bold"
            >
              <span>Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleLogout}
              className="mt-5 w-full h-[50px] text-white font-bold rounded-[10px] bg-[#615dfa] !hover:bg-black/20 flex items-center justify-center"
            >
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
