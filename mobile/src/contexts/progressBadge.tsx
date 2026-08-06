import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

// Cross-tab "new progress" badge. Shows a red dot on the Progress tab when a child
// has attended a session recently that the parent hasn't looked at yet. Cleared
// (per device) when the parent opens the Progress tab.

type BadgeCtx = { hasNew: boolean; markSeen: () => void };
const Ctx = createContext<BadgeCtx>({ hasNew: false, markSeen: () => {} });

const seenKey = (userId: string) => `progressSeen:v1:${userId}`;
const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function ProgressBadgeProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id;
  const [latestDate, setLatestDate] = useState<string | null>(null); // yyyy-mm-dd of newest attended session
  const [seen, setSeen] = useState<string | null>(null);

  // Load the last-seen marker for this user.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    AsyncStorage.getItem(seenKey(userId)).then((v) => { if (active) setSeen(v); });
    return () => { active = false; };
  }, [userId]);

  // Find the newest present-attendance date across the parent's children.
  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const { data: parentRow } = await supabase
        .from("parents").select("id").eq("auth_id", userId).is("deleted_at", null).maybeSingle();
      if (!parentRow || !active) return;
      const { data: links } = await supabase
        .from("parent_students").select("student:students!inner(id, deleted_at)").eq("parent_id", parentRow.id);
      const ids = (links ?? [])
        .map((l) => l.student as unknown as { id: string; deleted_at: string | null })
        .filter((s) => s && !s.deleted_at)
        .map((s) => s.id);
      if (!ids.length || !active) return;
      // Filter attendance by a real column (enrollment_id), not an embedded
      // resource filter — the latter has silently errored before.
      const { data: enrs } = await supabase
        .from("enrollments").select("id").in("student_id", ids).is("deleted_at", null);
      const enrollmentIds = (enrs ?? []).map((e) => e.id as string);
      if (!enrollmentIds.length || !active) return;
      const { data: att } = await supabase
        .from("attendance")
        .select("date")
        .in("enrollment_id", enrollmentIds)
        .eq("status", "present")
        .order("date", { ascending: false })
        .limit(1);
      if (active) setLatestDate((att?.[0]?.date as string | undefined) ?? null);
    })();
    return () => { active = false; };
  }, [userId]);

  const recent = !!latestDate && Date.now() - new Date(latestDate + "T00:00:00").getTime() <= RECENT_MS;
  const hasNew = recent && (!seen || (latestDate as string) > seen);

  const markSeen = useCallback(() => {
    if (!userId || !latestDate) return;
    setSeen(latestDate);
    AsyncStorage.setItem(seenKey(userId), latestDate).catch(() => {});
  }, [userId, latestDate]);

  return <Ctx.Provider value={{ hasNew, markSeen }}>{children}</Ctx.Provider>;
}

export function useProgressBadge() {
  return useContext(Ctx);
}
