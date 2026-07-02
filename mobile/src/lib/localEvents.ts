import AsyncStorage from "@react-native-async-storage/async-storage";

// On-device personal calendar events (parents can't write events to Supabase,
// so these live only on this device). Robotics-class booking that must sync is
// handled separately via the reschedule flow — not here.

export type LocalEventType = "event" | "holiday" | "birthday";

export type RepeatFreq =
  | "never"
  | "daily"
  | "weekdays" // Mon–Fri
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export type CustomRecurrence = {
  unit: "day" | "week" | "month" | "year";
  interval: number; // 1–99
  weekdays: number[]; // for "week": 0=Sun … 6=Sat
  monthlyMode: "day" | "week"; // for "month"
  monthDays: number[]; // monthlyMode="day": 1–31
  monthWeekOrdinals: number[]; // monthlyMode="week": 1,2,3,4, or -1 (last)
  monthWeekDays: number[]; // monthlyMode="week": 0–6 (or 7 = "every day")
  yearMonths: number[]; // for "year": 0=Jan … 11=Dec
};

export type EndRepeat =
  | { mode: "never" }
  | { mode: "onDate"; date: string } // yyyy-mm-dd
  | { mode: "count"; count: number }; // 1–99 occurrences

// Reminder lead time before the event start.
export type Reminder =
  | "none"
  | "atStart"
  | "5min"
  | "10min"
  | "15min"
  | "30min"
  | "1hour"
  | "1day"
  | "2day"
  | "1week"
  | { amount: number; unit: "minute" | "hour" | "day" };

export type LocalEvent = {
  id: string;
  type: LocalEventType;
  title: string;
  startDate: string; // yyyy-mm-dd
  startTime: string | null; // HH:mm (null = all-day)
  endDate: string; // yyyy-mm-dd
  endTime: string | null; // HH:mm
  repeat: RepeatFreq;
  custom: CustomRecurrence | null;
  endRepeat: EndRepeat;
  reminder: Reminder;
  alarm: boolean; // birthday alarm toggle
  color: string;
  createdAt: number;
};

const KEY = (userId: string) => `localEvents:v1:${userId}`;

export async function listLocalEvents(userId: string): Promise<LocalEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalEvent[]) : [];
  } catch {
    return [];
  }
}

export async function addLocalEvent(userId: string, ev: LocalEvent): Promise<void> {
  const all = await listLocalEvents(userId);
  all.push(ev);
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export async function updateLocalEvent(userId: string, ev: LocalEvent): Promise<void> {
  const all = await listLocalEvents(userId);
  const idx = all.findIndex((e) => e.id === ev.id);
  if (idx >= 0) all[idx] = ev;
  else all.push(ev);
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(all));
  } catch {
    // best-effort
  }
}

export async function deleteLocalEvent(userId: string, id: string): Promise<void> {
  const all = (await listLocalEvents(userId)).filter((e) => e.id !== id);
  try {
    await AsyncStorage.setItem(KEY(userId), JSON.stringify(all));
  } catch {
    // best-effort
  }
}

// ─── date helpers (yyyy-mm-dd keys, no timezone surprises) ──────────────────

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function parseYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(aKey: string, bKey: string): number {
  return Math.round((parseYmd(aKey).getTime() - parseYmd(bKey).getTime()) / 86_400_000);
}

// ordinal of a weekday within its month (1st, 2nd … and -1 for last)
function weekOrdinalInMonth(d: Date): number {
  return Math.floor((d.getDate() - 1) / 7) + 1;
}
function isLastWeekdayOfMonth(d: Date): boolean {
  return addDays(d, 7).getMonth() !== d.getMonth();
}

// Does a single day (dateKey) match the recurrence rule of `ev`, ignoring the
// end-repeat limit? (end-repeat is applied separately so we can count.)
function matchesPattern(ev: LocalEvent, dateKey: string): boolean {
  const start = ev.startDate;
  if (dateKey < start) return false;
  const d = parseYmd(dateKey);
  const startD = parseYmd(start);

  switch (ev.repeat) {
    case "never": {
      // Non-recurring: spans startDate…endDate inclusive.
      return dateKey >= start && dateKey <= ev.endDate;
    }
    case "daily":
      return true;
    case "weekdays": {
      const wd = d.getDay();
      return wd >= 1 && wd <= 5;
    }
    case "weekly":
      return d.getDay() === startD.getDay();
    case "monthly":
      return d.getDate() === startD.getDate();
    case "yearly":
      return d.getDate() === startD.getDate() && d.getMonth() === startD.getMonth();
    case "custom":
      return matchesCustom(ev, d, startD);
    default:
      return false;
  }
}

function matchesCustom(ev: LocalEvent, d: Date, startD: Date): boolean {
  const c = ev.custom;
  if (!c) return false;
  const interval = Math.max(1, c.interval);

  if (c.unit === "day") {
    return diffDays(ymd(d), ymd(startD)) % interval === 0;
  }
  if (c.unit === "week") {
    const days = c.weekdays.length ? c.weekdays : [startD.getDay()];
    if (!days.includes(d.getDay())) return false;
    // weeks since start (week boundaries on Sunday)
    const startWeek = Math.floor((parseYmd(ymd(startD)).getTime() - startD.getDay() * 86_400_000) / 604_800_000);
    const curWeek = Math.floor((parseYmd(ymd(d)).getTime() - d.getDay() * 86_400_000) / 604_800_000);
    return (curWeek - startWeek) % interval === 0;
  }
  if (c.unit === "month") {
    const monthsSince = (d.getFullYear() - startD.getFullYear()) * 12 + (d.getMonth() - startD.getMonth());
    if (monthsSince < 0 || monthsSince % interval !== 0) return false;
    if (c.monthlyMode === "day") {
      const days = c.monthDays.length ? c.monthDays : [startD.getDate()];
      return days.includes(d.getDate());
    }
    // monthlyMode === "week"
    const ords = c.monthWeekOrdinals.length ? c.monthWeekOrdinals : [weekOrdinalInMonth(startD)];
    const wds = c.monthWeekDays.length ? c.monthWeekDays : [startD.getDay()];
    const everyDay = wds.includes(7);
    if (!everyDay && !wds.includes(d.getDay())) return false;
    const ord = weekOrdinalInMonth(d);
    const matchOrd = ords.includes(ord) || (ords.includes(-1) && isLastWeekdayOfMonth(d));
    return matchOrd;
  }
  if (c.unit === "year") {
    const yearsSince = d.getFullYear() - startD.getFullYear();
    if (yearsSince < 0 || yearsSince % interval !== 0) return false;
    const months = c.yearMonths.length ? c.yearMonths : [startD.getMonth()];
    return months.includes(d.getMonth()) && d.getDate() === startD.getDate();
  }
  return false;
}

// Apply end-repeat. For "count" we enumerate matching days from the start until
// we've seen `count` of them, and check whether dateKey is within that set.
function withinEndRepeat(ev: LocalEvent, dateKey: string): boolean {
  const er = ev.endRepeat;
  if (er.mode === "onDate") return dateKey <= er.date;
  if (er.mode === "never") return true;
  // count: walk forward from startDate counting matches (cap the search window)
  let seen = 0;
  let cur = parseYmd(ev.startDate);
  const target = parseYmd(dateKey);
  const MAX_DAYS = 366 * 5; // safety cap
  for (let i = 0; i < MAX_DAYS; i++) {
    if (matchesPattern(ev, ymd(cur))) {
      seen += 1;
      if (ymd(cur) === dateKey) return seen <= er.count;
      if (seen >= er.count) return false; // ran out before reaching dateKey
    }
    if (cur.getTime() > target.getTime() && seen >= er.count) return false;
    cur = addDays(cur, 1);
  }
  return false;
}

export function localEventOccursOn(ev: LocalEvent, dateKey: string): boolean {
  if (!matchesPattern(ev, dateKey)) return false;
  if (ev.repeat === "never") return true; // span already handled
  return withinEndRepeat(ev, dateKey);
}

// Default custom-recurrence scaffold (used when the user first opens "Custom").
export function defaultCustom(startKey: string): CustomRecurrence {
  const d = parseYmd(startKey);
  return {
    unit: "week",
    interval: 1,
    weekdays: [d.getDay()],
    monthlyMode: "day",
    monthDays: [d.getDate()],
    monthWeekOrdinals: [weekOrdinalInMonth(d)],
    monthWeekDays: [d.getDay()],
    yearMonths: [d.getMonth()],
  };
}

export function reminderLabel(r: Reminder): string {
  if (typeof r === "object") return `${r.amount} ${r.unit}${r.amount === 1 ? "" : "s"} before`;
  switch (r) {
    case "none": return "None";
    case "atStart": return "When event starts";
    case "5min": return "5 minutes before";
    case "10min": return "10 minutes before";
    case "15min": return "15 minutes before";
    case "30min": return "30 minutes before";
    case "1hour": return "1 hour before";
    case "1day": return "1 day before";
    case "2day": return "2 days before";
    case "1week": return "1 week before";
  }
}

export function repeatLabel(freq: RepeatFreq): string {
  switch (freq) {
    case "never": return "Never";
    case "daily": return "Every day";
    case "weekdays": return "Every weekday (Mon–Fri)";
    case "weekly": return "Every week";
    case "monthly": return "Every month";
    case "yearly": return "Every year";
    case "custom": return "Custom";
  }
}
