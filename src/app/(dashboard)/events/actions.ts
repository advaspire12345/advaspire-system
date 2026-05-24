"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/supabase/server";
import { getUserByAuthId } from "@/data/users";
import { authorizeAction } from "@/data/permissions";
import {
  createEvent,
  updateEvent,
  softDeleteEvent,
  approveEvent,
  rejectEvent,
  type CreateEventInput,
  type UpdateEventInput,
  type EventCaller,
} from "@/data/events";

async function staffCaller(): Promise<EventCaller> {
  const authUser = await getUser();
  if (!authUser) throw new Error("Unauthorized");
  const staff = await getUserByAuthId(authUser.id);
  if (!staff) throw new Error("Unauthorized");
  return {
    kind: "staff",
    userId: staff.id,
    role: staff.role,
    branchId: staff.branch_id ?? null,
  };
}

export async function createEventAction(input: CreateEventInput) {
  await authorizeAction("events", "can_create");
  const caller = await staffCaller();
  const res = await createEvent(caller, input);
  if (res.ok) revalidatePath("/events");
  return res;
}

export async function updateEventAction(id: string, input: UpdateEventInput) {
  await authorizeAction("events", "can_edit");
  const caller = await staffCaller();
  const res = await updateEvent(caller, id, input);
  if (res.ok) revalidatePath("/events");
  return res;
}

export async function deleteEventAction(id: string) {
  await authorizeAction("events", "can_delete");
  const caller = await staffCaller();
  const res = await softDeleteEvent(caller, id);
  if (res.ok) revalidatePath("/events");
  return res;
}

export async function approveEventAction(id: string) {
  await authorizeAction("events", "can_edit");
  const caller = await staffCaller();
  const res = await approveEvent(caller, id);
  if (res.ok) revalidatePath("/events");
  return res;
}

export async function rejectEventAction(id: string, reason: string) {
  await authorizeAction("events", "can_edit");
  const caller = await staffCaller();
  const res = await rejectEvent(caller, id, reason);
  if (res.ok) revalidatePath("/events");
  return res;
}
