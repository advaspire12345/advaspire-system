"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getParentByAuthId } from "@/data/parents";
import {
  rescheduleSession,
  getUpcomingSessionsForParent,
  getAvailableSlots,
  type UpcomingSession,
  type AvailableSlot,
} from "@/data/reschedules";

export async function fetchUpcomingSessionsAction(): Promise<{
  ok: boolean;
  sessions: UpcomingSession[];
}> {
  const user = await getUser();
  if (!user) return { ok: false, sessions: [] };
  const parent = await getParentByAuthId(user.id);
  if (!parent) return { ok: false, sessions: [] };
  const sessions = await getUpcomingSessionsForParent(parent.id);
  return { ok: true, sessions };
}

export async function fetchAvailableSlotsAction(
  enrollmentId: string,
  originalDate: string,
): Promise<{ ok: boolean; slots: AvailableSlot[]; error?: string }> {
  const user = await getUser();
  if (!user) return { ok: false, slots: [], error: "Not authenticated." };
  const parent = await getParentByAuthId(user.id);
  if (!parent) return { ok: false, slots: [], error: "Parent profile not found." };
  const slots = await getAvailableSlots(enrollmentId, originalDate);
  return { ok: true, slots };
}

export async function rescheduleSessionAction(input: {
  enrollmentId: string;
  originalDate: string;
  newSlotId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser();
  if (!user) return { ok: false, error: "Not authenticated." };
  const parent = await getParentByAuthId(user.id);
  if (!parent) return { ok: false, error: "Parent profile not found." };

  const result = await rescheduleSession({
    parentId: parent.id,
    enrollmentId: input.enrollmentId,
    originalDate: input.originalDate,
    newSlotId: input.newSlotId,
  });

  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/parent");
  return { ok: true };
}
