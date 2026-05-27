"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Coins, Search, Settings, Bell, X, Check } from "lucide-react";
import { HelpButton } from "@/components/help/help-button";
import type { UserRole } from "@/db/schema";
import { notify } from "@/lib/notify";
import {
  fetchMyNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/app/(dashboard)/notifications/actions";
import { formatDistanceToNow } from "date-fns";
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

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface TopMenuBarProps {
  role: UserRole | null;
  userId: string | null;
}

export function TopMenuBar({ role, userId }: TopMenuBarProps) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [adcoinStats, setAdcoinStats] = useState<AdcoinStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const refreshNotifications = useCallback(async () => {
    const result = await fetchMyNotificationsAction({ limit: 20 });
    setNotifications(result.notifications as NotificationItem[]);
    setUnreadCount(result.unreadCount);
  }, []);

  useEffect(() => {
    refreshNotifications();
    // Poll every 60s while the menu bar is mounted so unread count stays fresh
    const interval = setInterval(refreshNotifications, 60_000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markAsRead = async (id: string, link: string | null) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
    if (target && !target.read_at) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    await markNotificationReadAction(id);
    if (link) router.push(link);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
    notify.success("All notifications marked as read");
  };

  // X-button on notification: just mark read locally — don't actually delete
  // (the cron purges anything older than 30 days).
  const clearNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await markNotificationReadAction(id);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: dbUser } = await supabase
            .from("users")
            .select("adcoin_balance")
            .eq("auth_id", authUser.id)
            .single();
          setAdcoinStats({
            totalAdcoinBalance: dbUser?.adcoin_balance ?? 0,
            adcoinChange: 0,
          });
        }
      } catch (error) {
        console.error("Error fetching adcoin stats:", error);
      }
    }
    fetchAdcoinStats();
  }, [supabase]);

  const handleClearSearch = () => {
    setSearchValue("");
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
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
        {/* Adcoins */}
        <div className="flex items-center gap-2 px-3 md:px-5">
          <Coins className="h-5 w-5 text-yellow-300 shrink-0" />
          <span className="text-white text-sm font-bold whitespace-nowrap">
            {adcoinStats?.totalAdcoinBalance?.toLocaleString() ?? "—"}
          </span>
        </div>
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8 bg-white/30"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-10 w-10 text-white hover:bg-white/20 hover:text-white"
            >
              <Bell className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end" forceMount>
            <DropdownMenuLabel className="flex items-center justify-between">
              <span className="font-bold">Notifications</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllAsRead}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                    !notification.read_at ? "bg-blue-50 dark:bg-blue-950" : ""
                  }`}
                  onClick={() => markAsRead(notification.id, notification.link)}
                >
                  <div className="flex w-full items-start justify-between">
                    <span className="font-semibold">{notification.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          clearNotification(notification.id);
                        }}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {notification.body && (
                    <span className="text-sm text-muted-foreground">
                      {notification.body}
                    </span>
                  )}
                  {!notification.read_at && (
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help button — opens role-aware onboarding dialog. Pulses on
            first/second login (see useOnboardingTrigger). */}
        <HelpButton role={role} userId={userId} className="text-white hover:bg-white/20 hover:text-white" />

        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-8 bg-white/30"
        />

        {/* User Menu - Only render after mount to avoid hydration mismatch */}
        {mounted ? (
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
                onClick={() => router.push("/profile")}
                className="font-bold hover:translate-x-1 !hover:bg-white backdrop-blur-sm border-white/20 hover:text-[#23D2E2] data-[highlighted]:translate-x-1 data-[highlighted]:text-[#23D2E2]"
              >
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
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
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white hover:bg-white/20 hover:text-white"
          >
            <Settings className="h-6 w-6 size-10" />
            <span className="sr-only">Settings</span>
          </Button>
        )}
      </div>
    </header>
  );
}
