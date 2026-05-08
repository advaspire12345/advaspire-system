"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserPermissions } from "@/data/permissions";
import {
  getNotificationsForUser,
  getUnreadCountForUser,
  markNotificationRead,
  markAllReadForUser,
} from "@/data/notifications";

export async function fetchMyNotificationsAction(opts?: { limit?: number; unreadOnly?: boolean }) {
  const permData = await getCurrentUserPermissions();
  if (!permData) return { notifications: [], unreadCount: 0 };
  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(permData.userId, opts),
    getUnreadCountForUser(permData.userId),
  ]);
  return { notifications, unreadCount };
}

export async function markNotificationReadAction(notificationId: string) {
  const ok = await markNotificationRead(notificationId);
  revalidatePath("/dashboard");
  return { success: ok };
}

export async function markAllNotificationsReadAction() {
  const permData = await getCurrentUserPermissions();
  if (!permData) return { success: false };
  const ok = await markAllReadForUser(permData.userId);
  revalidatePath("/dashboard");
  return { success: ok };
}
