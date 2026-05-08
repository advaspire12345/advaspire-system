"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import {
  fetchMyParentNotificationsAction,
  markParentNotificationReadAction,
  markAllParentNotificationsReadAction,
} from "@/app/(parent)/parent/notifications-actions";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export function ParentNotificationBell({
  className,
  iconButtonClassName,
}: {
  className?: string;
  iconButtonClassName?: string;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const result = await fetchMyParentNotificationsAction({ limit: 20 });
    setNotifications(result.notifications as NotificationItem[]);
    setUnreadCount(result.unreadCount);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    if (target && !target.read_at) setUnreadCount((c) => Math.max(0, c - 1));
    await markParentNotificationReadAction(id);
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    setUnreadCount(0);
    await markAllParentNotificationsReadAction();
  };

  const clearOne = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await markParentNotificationReadAction(id);
  };

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`relative h-[40px] w-[40px] rounded-[10px] bg-[#615DFA] hover:bg-[#4f4cd8] text-white ${iconButtonClassName ?? ""}`}
          >
            <Bell className="h-5 w-5" />
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
            <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.read_at ? "bg-blue-50 dark:bg-blue-950" : ""}`}
                onClick={() => markAsRead(n.id)}
              >
                <div className="flex w-full items-start justify-between">
                  <span className="font-semibold">{n.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearOne(n.id);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                {n.body && <span className="text-sm text-muted-foreground">{n.body}</span>}
                {!n.read_at && <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" />}
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
