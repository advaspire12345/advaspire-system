"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getParentByAuthId } from "@/data/parents";
import {
  getNotificationsForParent,
  getUnreadCountForParent,
  markNotificationRead,
  markAllReadForParent,
} from "@/data/notifications";

export async function fetchMyParentNotificationsAction(opts?: { limit?: number; unreadOnly?: boolean }) {
  const user = await getUser();
  if (!user) return { notifications: [], unreadCount: 0 };
  const parent = await getParentByAuthId(user.id);
  if (!parent) return { notifications: [], unreadCount: 0 };
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForParent(parent.id, opts),
    getUnreadCountForParent(parent.id),
  ]);
  return { notifications, unreadCount };
}

export async function markParentNotificationReadAction(notificationId: string) {
  const ok = await markNotificationRead(notificationId);
  revalidatePath("/parent");
  return { success: ok };
}

export async function markAllParentNotificationsReadAction() {
  const user = await getUser();
  if (!user) return { success: false };
  const parent = await getParentByAuthId(user.id);
  if (!parent) return { success: false };
  const ok = await markAllReadForParent(parent.id);
  revalidatePath("/parent");
  return { success: ok };
}
