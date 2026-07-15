import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import {
  addLocalEvent,
  defaultCustom,
  listLocalEvents,
  reminderLabel,
  repeatLabel,
  updateLocalEvent,
  ymd,
  type CustomRecurrence,
  type EndRepeat,
  type LocalEvent,
  type LocalEventType,
  type Reminder,
  type RepeatFreq,
} from "@/lib/localEvents";

const COLORS = ["#615DFA", "#EF4444", "#F59E0B", "#10B981", "#23D2E2", "#EC4899"];
const WEEKDAYS = [
  { key: 0, label: "Sun" },
  { key: 1, label: "Mon" },
  { key: 2, label: "Tue" },
  { key: 3, label: "Wed" },
  { key: 4, label: "Thu" },
  { key: 5, label: "Fri" },
  { key: 6, label: "Sat" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ORDINALS = [
  { key: 1, label: "First" },
  { key: 2, label: "Second" },
  { key: 3, label: "Third" },
  { key: 4, label: "Fourth" },
  { key: -1, label: "Last" },
];
const REMINDER_PRESETS: Reminder[] = [
  "none", "atStart", "5min", "10min", "15min", "30min", "1hour", "1day", "2day", "1week",
];
const TYPES: { key: LocalEventType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "event", label: "Event", icon: "sparkles-outline" },
  { key: "holiday", label: "Holiday", icon: "sunny-outline" },
  { key: "birthday", label: "Birthday", icon: "gift-outline" },
];

function parseYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}
function formatHumanDate(s: string): string {
  if (!s) return "Pick a date";
  return parseYmd(s).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function formatHumanTime(s: string | null): string {
  if (!s) return "Pick a time";
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function NewEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  // Params: `id` → edit an existing event; otherwise start/end date+time can be
  // pre-filled (e.g. tapped from the week time-grid).
  const params = useLocalSearchParams<{
    id?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
  }>();
  const editId = typeof params.id === "string" && params.id ? params.id : null;

  const today = ymd(new Date());
  const [type, setType] = useState<LocalEventType>("event");
  const [title, setTitle] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const [startDate, setStartDate] = useState(params.startDate || today);
  const [startTime, setStartTime] = useState<string | null>(params.startTime || "09:00");
  const [endDate, setEndDate] = useState(params.endDate || params.startDate || today);
  const [endTime, setEndTime] = useState<string | null>(params.endTime || "10:00");
  const [createdAt, setCreatedAt] = useState<number>(Date.now());

  // Edit mode: hydrate every field from the stored event once.
  useEffect(() => {
    if (!editId || !userId) return;
    let active = true;
    listLocalEvents(userId).then((list) => {
      const ev = list.find((e) => e.id === editId);
      if (!ev || !active) return;
      setType(ev.type);
      setTitle(ev.title);
      setColor(ev.color);
      setStartDate(ev.startDate);
      setStartTime(ev.startTime);
      setEndDate(ev.endDate);
      setEndTime(ev.endTime);
      setRepeat(ev.repeat);
      setCustom(ev.custom);
      setEndRepeat(ev.endRepeat);
      setReminder(ev.reminder);
      setAlarm(ev.alarm);
      setCreatedAt(ev.createdAt);
    });
    return () => { active = false; };
  }, [editId, userId]);

  const [repeat, setRepeat] = useState<RepeatFreq>("never");
  const [custom, setCustom] = useState<CustomRecurrence | null>(null);
  const [endRepeat, setEndRepeat] = useState<EndRepeat>({ mode: "never" });
  const [reminder, setReminder] = useState<Reminder>("none");
  const [alarm, setAlarm] = useState(false);

  const [saving, setSaving] = useState(false);

  // modals
  const [datePicker, setDatePicker] = useState<null | { target: "start" | "end"; initial: string }>(null);
  const [timePicker, setTimePicker] = useState<null | { target: "start" | "end"; initial: string }>(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [endRepeatOpen, setEndRepeatOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (type === "holiday") return !!startDate && !!endDate && endDate >= startDate;
    if (type === "birthday") return !!startDate;
    // event
    if (!startDate || !endDate) return false;
    return true;
  }, [title, type, startDate, endDate]);

  const onSave = async () => {
    if (!canSubmit || !userId) {
      Alert.alert("Missing info", "Please fill in the required fields.");
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const ev: LocalEvent = {
        id: editId ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        type,
        title: title.trim(),
        startDate,
        startTime: type === "event" ? startTime : null,
        endDate: type === "event" || type === "holiday" ? endDate : startDate,
        endTime: type === "event" ? endTime : null,
        repeat: type === "event" ? repeat : type === "birthday" ? "yearly" : "never",
        custom: type === "event" && repeat === "custom" ? custom : null,
        endRepeat: type === "event" ? endRepeat : { mode: "never" },
        reminder: type === "event" || type === "birthday" ? reminder : "none",
        alarm: type === "birthday" ? alarm : false,
        color,
        createdAt,
      };
      if (editId) await updateLocalEvent(userId, ev);
      else await addLocalEvent(userId, ev);
      router.back();
    } catch {
      Alert.alert("Couldn't save", "Something went wrong saving the event.");
    } finally {
      setSaving(false);
    }
  };

  const titleLabel = type === "birthday" ? "Whose birthday?" : type === "holiday" ? "Holiday name" : "Title";
  const titlePlaceholder =
    type === "birthday" ? "e.g. Sarah" : type === "holiday" ? "e.g. School holiday" : "e.g. Family trip";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: editId ? "Edit event" : "New event", headerTintColor: "#615DFA" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Type picker */}
            <View style={styles.typeRow}>
              {TYPES.map((t) => {
                const active = type === t.key;
                return (
                  <Pressable key={t.key} style={[styles.typeCard, active && styles.typeCardActive]} onPress={() => setType(t.key)}>
                    <Ionicons name={t.icon} size={22} color={active ? "#FFFFFF" : "#615DFA"} />
                    <Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Card>
              <Label>{titleLabel}</Label>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={titlePlaceholder}
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </Card>

            {/* EVENT: from/to + repeat + reminder */}
            {type === "event" ? (
              <>
                <Card>
                  <Label>From</Label>
                  <View style={styles.fromToRow}>
                    <PickerButton icon="calendar-outline" label={formatHumanDate(startDate)} onPress={() => setDatePicker({ target: "start", initial: startDate })} flex={1.4} />
                    <PickerButton icon="time-outline" label={formatHumanTime(startTime)} onPress={() => setTimePicker({ target: "start", initial: startTime ?? "09:00" })} flex={1} />
                  </View>
                  <Label style={{ marginTop: 14 }}>To</Label>
                  <View style={styles.fromToRow}>
                    <PickerButton icon="calendar-outline" label={formatHumanDate(endDate)} onPress={() => setDatePicker({ target: "end", initial: endDate })} flex={1.4} />
                    <PickerButton icon="time-outline" label={formatHumanTime(endTime)} onPress={() => setTimePicker({ target: "end", initial: endTime ?? "10:00" })} flex={1} />
                  </View>
                </Card>

                <Card>
                  <RowButton icon="repeat-outline" label="Repeat" value={repeat === "custom" ? "Custom" : repeatLabel(repeat)} onPress={() => setRepeatOpen(true)} />
                  {repeat !== "never" ? (
                    <RowButton icon="stop-circle-outline" label="End repeat" value={endRepeatSummary(endRepeat)} onPress={() => setEndRepeatOpen(true)} divider />
                  ) : null}
                  <RowButton icon="notifications-outline" label="Reminder" value={reminderLabel(reminder)} onPress={() => setReminderOpen(true)} divider />
                </Card>
              </>
            ) : null}

            {/* HOLIDAY: from/to dates only */}
            {type === "holiday" ? (
              <Card>
                <Label>From</Label>
                <PickerButton icon="calendar-outline" label={formatHumanDate(startDate)} onPress={() => setDatePicker({ target: "start", initial: startDate })} />
                <Label style={{ marginTop: 14 }}>To</Label>
                <PickerButton icon="calendar-outline" label={formatHumanDate(endDate)} onPress={() => setDatePicker({ target: "end", initial: endDate })} />
              </Card>
            ) : null}

            {/* BIRTHDAY: date + reminder + alarm toggle */}
            {type === "birthday" ? (
              <>
                <Card>
                  <Label>Date</Label>
                  <PickerButton icon="calendar-outline" label={formatHumanDate(startDate)} onPress={() => setDatePicker({ target: "start", initial: startDate })} />
                  <Text style={styles.hint}>Repeats every year</Text>
                </Card>
                <Card>
                  <RowButton icon="notifications-outline" label="Reminder" value={reminderLabel(reminder)} onPress={() => setReminderOpen(true)} />
                  <View style={[styles.row, styles.rowDivider]}>
                    <Ionicons name="alarm-outline" size={20} color="#615DFA" />
                    <Text style={styles.rowLabel}>Alarm reminder</Text>
                    <Switch value={alarm} onValueChange={setAlarm} trackColor={{ true: "#615DFA" }} />
                  </View>
                </Card>
              </>
            ) : null}

            <Card>
              <Label>Color</Label>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <Pressable key={c} onPress={() => setColor(c)} style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]} />
                ))}
              </View>
            </Card>

            <Pressable
              style={({ pressed }) => [styles.submit, (!canSubmit || saving) && styles.submitDisabled, pressed && canSubmit && !saving && styles.pressed]}
              onPress={onSave}
              disabled={!canSubmit || saving}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.submitText}>{saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {datePicker ? (
        <DatePickerModal
          initial={datePicker.initial}
          onClose={() => setDatePicker(null)}
          onPick={(v) => {
            if (datePicker.target === "start") {
              setStartDate(v);
              if (endDate < v) setEndDate(v);
            } else {
              setEndDate(v);
            }
            setDatePicker(null);
          }}
        />
      ) : null}

      {timePicker ? (
        <TimePickerModal
          initial={timePicker.initial}
          onClose={() => setTimePicker(null)}
          onPick={(v) => {
            if (timePicker.target === "start") setStartTime(v);
            else setEndTime(v);
            setTimePicker(null);
          }}
        />
      ) : null}

      {repeatOpen ? (
        <RepeatModal
          value={repeat}
          onClose={() => setRepeatOpen(false)}
          onPick={(f) => {
            setRepeat(f);
            setRepeatOpen(false);
            if (f === "custom") {
              if (!custom) setCustom(defaultCustom(startDate));
              setCustomOpen(true);
            }
          }}
        />
      ) : null}

      {customOpen ? (
        <CustomRepeatModal
          value={custom ?? defaultCustom(startDate)}
          onClose={() => setCustomOpen(false)}
          onDone={(c) => {
            setCustom(c);
            setRepeat("custom");
            setCustomOpen(false);
          }}
        />
      ) : null}

      {endRepeatOpen ? (
        <EndRepeatModal value={endRepeat} onClose={() => setEndRepeatOpen(false)} onDone={(e) => { setEndRepeat(e); setEndRepeatOpen(false); }} />
      ) : null}

      {reminderOpen ? (
        <ReminderModal value={reminder} onClose={() => setReminderOpen(false)} onDone={(r) => { setReminder(r); setReminderOpen(false); }} />
      ) : null}
    </SafeAreaView>
  );
}

function endRepeatSummary(e: EndRepeat): string {
  if (e.mode === "never") return "Never";
  if (e.mode === "count") return `After ${e.count} time${e.count === 1 ? "" : "s"}`;
  return `On ${formatHumanDate(e.date)}`;
}

// ─── small building blocks ──────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}
function Label({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}
function PickerButton({ icon, label, onPress, flex }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; flex?: number }) {
  return (
    <Pressable style={({ pressed }) => [styles.pickerButton, flex ? { flex } : null, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#615DFA" />
      <Text style={styles.pickerButtonText} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}
function RowButton({ icon, label, value, onPress, divider }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void; divider?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={20} color="#615DFA" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </Pressable>
  );
}
function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove" size={20} color="#615DFA" />
      </Pressable>
      <Text style={styles.stepperValue}>{value}</Text>
      <Pressable style={styles.stepperBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Ionicons name="add" size={20} color="#615DFA" />
      </Pressable>
    </View>
  );
}
function Chip({ label, active, onPress, wide }: { label: string; active: boolean; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable style={[styles.chip, wide && styles.chipWide, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

// ─── Repeat selection modal ─────────────────────────────────────────────────

function SheetShell({ title, onClose, children, onDone }: { title: string; onClose: () => void; children: React.ReactNode; onDone?: () => void }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <View style={sheetStyles.headerRow}>
          <Pressable onPress={onClose} hitSlop={8}><Text style={sheetStyles.cancel}>Cancel</Text></Pressable>
          <Text style={pickerStyles.headerTitle}>{title}</Text>
          {onDone ? <Pressable onPress={onDone} hitSlop={8}><Text style={sheetStyles.done}>Done</Text></Pressable> : <View style={{ width: 48 }} />}
        </View>
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

const REPEAT_OPTIONS: RepeatFreq[] = ["never", "daily", "weekdays", "weekly", "monthly", "yearly", "custom"];

function RepeatModal({ value, onClose, onPick }: { value: RepeatFreq; onClose: () => void; onPick: (f: RepeatFreq) => void }) {
  return (
    <SheetShell title="Repeat" onClose={onClose}>
      {REPEAT_OPTIONS.map((f) => (
        <Pressable key={f} style={sheetStyles.optionRow} onPress={() => onPick(f)}>
          <Text style={sheetStyles.optionText}>{f === "custom" ? "Custom…" : repeatLabel(f)}</Text>
          {value === f ? <Ionicons name="checkmark" size={20} color="#615DFA" /> : null}
        </Pressable>
      ))}
    </SheetShell>
  );
}

// ─── Custom recurrence builder ──────────────────────────────────────────────

function CustomRepeatModal({ value, onClose, onDone }: { value: CustomRecurrence; onClose: () => void; onDone: (c: CustomRecurrence) => void }) {
  const [c, setC] = useState<CustomRecurrence>(value);
  const set = (patch: Partial<CustomRecurrence>) => setC((prev) => ({ ...prev, ...patch }));
  const toggle = (arr: number[], v: number): number[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <SheetShell title="Custom" onClose={onClose} onDone={() => onDone(c)}>
      <Text style={sheetStyles.groupLabel}>Frequency</Text>
      <View style={styles.segment}>
        {(["day", "week", "month", "year"] as const).map((u) => (
          <Pressable key={u} style={[styles.segmentButton, c.unit === u && styles.segmentButtonActive]} onPress={() => set({ unit: u })}>
            <Text style={[styles.segmentText, c.unit === u && styles.segmentTextActive]}>{u[0].toUpperCase() + u.slice(1)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={sheetStyles.everyRow}>
        <Text style={sheetStyles.everyLabel}>Every</Text>
        <Stepper value={c.interval} min={1} max={99} onChange={(v) => set({ interval: v })} />
        <Text style={sheetStyles.everyLabel}>{c.unit}{c.interval === 1 ? "" : "s"}</Text>
      </View>

      {c.unit === "week" ? (
        <>
          <Text style={sheetStyles.groupLabel}>On these days</Text>
          <View style={styles.chipWrap}>
            {WEEKDAYS.map((w) => (
              <Chip key={w.key} label={w.label} active={c.weekdays.includes(w.key)} onPress={() => set({ weekdays: toggle(c.weekdays, w.key) })} />
            ))}
          </View>
        </>
      ) : null}

      {c.unit === "month" ? (
        <>
          <View style={styles.segment}>
            <Pressable style={[styles.segmentButton, c.monthlyMode === "day" && styles.segmentButtonActive]} onPress={() => set({ monthlyMode: "day" })}>
              <Text style={[styles.segmentText, c.monthlyMode === "day" && styles.segmentTextActive]}>Each date</Text>
            </Pressable>
            <Pressable style={[styles.segmentButton, c.monthlyMode === "week" && styles.segmentButtonActive]} onPress={() => set({ monthlyMode: "week" })}>
              <Text style={[styles.segmentText, c.monthlyMode === "week" && styles.segmentTextActive]}>On the…</Text>
            </Pressable>
          </View>
          {c.monthlyMode === "day" ? (
            <>
              <Text style={sheetStyles.groupLabel}>Days of the month</Text>
              <View style={styles.chipWrap}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <Chip key={d} label={String(d)} active={c.monthDays.includes(d)} onPress={() => set({ monthDays: toggle(c.monthDays, d) })} />
                ))}
              </View>
            </>
          ) : (
            <View style={sheetStyles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={sheetStyles.groupLabel}>Week</Text>
                {ORDINALS.map((o) => (
                  <Pressable key={o.key} style={sheetStyles.optionRow} onPress={() => set({ monthWeekOrdinals: toggle(c.monthWeekOrdinals, o.key) })}>
                    <Text style={sheetStyles.optionText}>{o.label}</Text>
                    {c.monthWeekOrdinals.includes(o.key) ? <Ionicons name="checkmark" size={18} color="#615DFA" /> : null}
                  </Pressable>
                ))}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={sheetStyles.groupLabel}>Day</Text>
                <Pressable style={sheetStyles.optionRow} onPress={() => set({ monthWeekDays: c.monthWeekDays.includes(7) ? [] : [7] })}>
                  <Text style={sheetStyles.optionText}>Every day</Text>
                  {c.monthWeekDays.includes(7) ? <Ionicons name="checkmark" size={18} color="#615DFA" /> : null}
                </Pressable>
                {WEEKDAYS.map((w) => (
                  <Pressable key={w.key} style={sheetStyles.optionRow} onPress={() => set({ monthWeekDays: toggle(c.monthWeekDays.filter((x) => x !== 7), w.key) })}>
                    <Text style={sheetStyles.optionText}>{w.label}</Text>
                    {c.monthWeekDays.includes(w.key) ? <Ionicons name="checkmark" size={18} color="#615DFA" /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </>
      ) : null}

      {c.unit === "year" ? (
        <>
          <Text style={sheetStyles.groupLabel}>In these months</Text>
          <View style={styles.chipWrap}>
            {MONTHS.map((m, i) => (
              <Chip key={m} label={m} active={c.yearMonths.includes(i)} onPress={() => set({ yearMonths: toggle(c.yearMonths, i) })} wide />
            ))}
          </View>
        </>
      ) : null}
    </SheetShell>
  );
}

// ─── End-repeat modal ───────────────────────────────────────────────────────

function EndRepeatModal({ value, onClose, onDone }: { value: EndRepeat; onClose: () => void; onDone: (e: EndRepeat) => void }) {
  const [mode, setMode] = useState<EndRepeat["mode"]>(value.mode);
  const [count, setCount] = useState(value.mode === "count" ? value.count : 10);
  const [date, setDate] = useState(value.mode === "onDate" ? value.date : ymd(new Date()));
  const [dateOpen, setDateOpen] = useState(false);

  const done = () => {
    if (mode === "never") onDone({ mode: "never" });
    else if (mode === "count") onDone({ mode: "count", count });
    else onDone({ mode: "onDate", date });
  };

  return (
    <>
      <SheetShell title="End repeat" onClose={onClose} onDone={done}>
        {(["never", "onDate", "count"] as const).map((m) => (
          <Pressable key={m} style={sheetStyles.optionRow} onPress={() => setMode(m)}>
            <Text style={sheetStyles.optionText}>{m === "never" ? "Never" : m === "onDate" ? "On a date" : "After a number of times"}</Text>
            {mode === m ? <Ionicons name="checkmark" size={20} color="#615DFA" /> : null}
          </Pressable>
        ))}
        {mode === "onDate" ? (
          <Pressable style={[styles.pickerButton, { marginTop: 12 }]} onPress={() => setDateOpen(true)}>
            <Ionicons name="calendar-outline" size={18} color="#615DFA" />
            <Text style={styles.pickerButtonText}>{formatHumanDate(date)}</Text>
          </Pressable>
        ) : null}
        {mode === "count" ? (
          <View style={[sheetStyles.everyRow, { marginTop: 12 }]}>
            <Text style={sheetStyles.everyLabel}>End after</Text>
            <Stepper value={count} min={1} max={99} onChange={setCount} />
            <Text style={sheetStyles.everyLabel}>time{count === 1 ? "" : "s"}</Text>
          </View>
        ) : null}
      </SheetShell>
      {dateOpen ? (
        <DatePickerModal initial={date} onClose={() => setDateOpen(false)} onPick={(v) => { setDate(v); setDateOpen(false); }} />
      ) : null}
    </>
  );
}

// ─── Reminder modal ─────────────────────────────────────────────────────────

function ReminderModal({ value, onClose, onDone }: { value: Reminder; onClose: () => void; onDone: (r: Reminder) => void }) {
  const isCustom = typeof value === "object";
  const [customMode, setCustomMode] = useState(isCustom);
  const [amount, setAmount] = useState(isCustom ? value.amount : 1);
  const [unit, setUnit] = useState<"minute" | "hour" | "day">(isCustom ? value.unit : "minute");

  return (
    <SheetShell title="Reminder" onClose={onClose} onDone={customMode ? () => onDone({ amount, unit }) : undefined}>
      {REMINDER_PRESETS.map((r) => (
        <Pressable key={String(r)} style={sheetStyles.optionRow} onPress={() => { setCustomMode(false); onDone(r); }}>
          <Text style={sheetStyles.optionText}>{reminderLabel(r)}</Text>
          {!customMode && value === r ? <Ionicons name="checkmark" size={20} color="#615DFA" /> : null}
        </Pressable>
      ))}
      <Pressable style={sheetStyles.optionRow} onPress={() => setCustomMode(true)}>
        <Text style={sheetStyles.optionText}>Custom…</Text>
        {customMode ? <Ionicons name="checkmark" size={20} color="#615DFA" /> : null}
      </Pressable>
      {customMode ? (
        <View style={[sheetStyles.everyRow, { marginTop: 12 }]}>
          <Stepper value={amount} min={1} max={60} onChange={setAmount} />
          <View style={[styles.segment, { flex: 1 }]}>
            {(["minute", "hour", "day"] as const).map((u) => (
              <Pressable key={u} style={[styles.segmentButton, unit === u && styles.segmentButtonActive]} onPress={() => setUnit(u)}>
                <Text style={[styles.segmentText, unit === u && styles.segmentTextActive]}>{u[0].toUpperCase() + u.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </SheetShell>
  );
}

// ─── Date / time picker modals (pure-JS) ────────────────────────────────────

const WEEKDAY_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (Date | null)[][] = [];
  let cursor = 1 - firstWeekday;
  for (let row = 0; row < 6; row++) {
    const rowCells: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      rowCells.push(cursor >= 1 && cursor <= daysInMonth ? new Date(year, month, cursor) : null);
      cursor++;
    }
    grid.push(rowCells);
    if (cursor > daysInMonth && row >= 4) break;
  }
  return grid;
}

function DatePickerModal({ initial, onClose, onPick }: { initial: string; onClose: () => void; onPick: (v: string) => void }) {
  const initialDate = parseYmd(initial);
  const [view, setView] = useState<Date>(new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const [selected, setSelected] = useState<string>(initial);
  const grid = useMemo(() => buildMonthGrid(view.getFullYear(), view.getMonth()), [view]);
  const monthLabel = view.toLocaleDateString("en-MY", { month: "long", year: "numeric" });
  const todayKey = ymd(new Date());

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <View style={pickerStyles.header}>
          <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} style={pickerStyles.headerNav}>
            <Ionicons name="chevron-back" size={18} color="#615DFA" />
          </Pressable>
          <Text style={pickerStyles.headerTitle}>{monthLabel}</Text>
          <Pressable onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} style={pickerStyles.headerNav}>
            <Ionicons name="chevron-forward" size={18} color="#615DFA" />
          </Pressable>
        </View>
        <View style={pickerStyles.weekdays}>
          {WEEKDAY_SHORT.map((w, i) => <Text key={i} style={pickerStyles.weekdayLabel}>{w}</Text>)}
        </View>
        <View>
          {grid.map((row, rowIdx) => (
            <View key={rowIdx} style={pickerStyles.row}>
              {row.map((d, colIdx) => {
                if (!d) return <View key={colIdx} style={pickerStyles.cellEmpty} />;
                const k = ymd(d);
                const isSelected = k === selected;
                const isToday = k === todayKey;
                return (
                  <Pressable key={colIdx} style={[pickerStyles.cell, isSelected && pickerStyles.cellSelected, isToday && !isSelected && pickerStyles.cellToday]} onPress={() => setSelected(k)}>
                    <Text style={[pickerStyles.cellText, isSelected && pickerStyles.cellTextSelected, isToday && !isSelected && pickerStyles.cellTextToday]}>{d.getDate()}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={pickerStyles.actions}>
          <Pressable style={pickerStyles.cancelButton} onPress={onClose}><Text style={pickerStyles.cancelText}>Cancel</Text></Pressable>
          <Pressable style={pickerStyles.confirmButton} onPress={() => onPick(selected)}><Text style={pickerStyles.confirmText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

function TimePickerModal({ initial, onClose, onPick }: { initial: string; onClose: () => void; onPick: (v: string) => void }) {
  const [h24, m] = initial.split(":").map((n) => parseInt(n, 10));
  const [hour, setHour] = useState<number>(h24 % 12 || 12);
  const [minute, setMinute] = useState<number>(m);
  const [period, setPeriod] = useState<"AM" | "PM">(h24 < 12 ? "AM" : "PM");

  const confirm = () => {
    let h = hour % 12;
    if (period === "PM") h += 12;
    onPick(`${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  };
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.headerTitle}>Pick a time</Text>
        <View style={timeStyles.preview}><Text style={timeStyles.previewText}>{hour}:{String(minute).padStart(2, "0")} {period}</Text></View>
        <Text style={timeStyles.sectionLabel}>Hour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={timeStyles.scrollRow}>
          {hours.map((h) => (
            <Pressable key={h} style={[timeStyles.numberChip, hour === h && timeStyles.numberChipActive]} onPress={() => setHour(h)}>
              <Text style={[timeStyles.numberChipText, hour === h && timeStyles.numberChipTextActive]}>{h}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text style={timeStyles.sectionLabel}>Minute</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={timeStyles.scrollRow}>
          {minutes.map((mm) => (
            <Pressable key={mm} style={[timeStyles.numberChip, minute === mm && timeStyles.numberChipActive]} onPress={() => setMinute(mm)}>
              <Text style={[timeStyles.numberChipText, minute === mm && timeStyles.numberChipTextActive]}>{String(mm).padStart(2, "0")}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={timeStyles.periodRow}>
          {(["AM", "PM"] as const).map((p) => (
            <Pressable key={p} style={[timeStyles.periodButton, period === p && timeStyles.periodButtonActive]} onPress={() => setPeriod(p)}>
              <Text style={[timeStyles.periodText, period === p && timeStyles.periodTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <View style={pickerStyles.actions}>
          <Pressable style={pickerStyles.cancelButton} onPress={onClose}><Text style={pickerStyles.cancelText}>Cancel</Text></Pressable>
          <Pressable style={pickerStyles.confirmButton} onPress={confirm}><Text style={pickerStyles.confirmText}>Done</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 48 },
  typeRow: { flexDirection: "row", gap: 10 },
  typeCard: {
    flex: 1, backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 16, alignItems: "center", gap: 6,
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  typeCardActive: { backgroundColor: "#615DFA" },
  typeText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  typeTextActive: { color: "#FFFFFF" },
  card: {
    backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, gap: 8,
    shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
  hint: { fontSize: 12, color: "#9CA3AF", marginTop: 6 },
  input: { borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827", backgroundColor: "#F9FAFB" },
  fromToRow: { flexDirection: "row", gap: 10 },
  pickerButton: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: "#F9FAFB" },
  pickerButtonText: { flex: 1, fontSize: 14, color: "#111827", fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  rowDivider: { borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  rowLabel: { fontSize: 15, color: "#111827", fontWeight: "600" },
  rowValue: { flex: 1, textAlign: "right", fontSize: 14, color: "#6B7280", marginRight: 4 },
  segment: { flexDirection: "row", gap: 8, marginTop: 4 },
  segmentButton: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  segmentButtonActive: { backgroundColor: "#615DFA" },
  segmentText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  segmentTextActive: { color: "#FFFFFF" },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: { minWidth: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#F3F4F6", alignItems: "center" },
  chipWide: { minWidth: 52 },
  chipActive: { backgroundColor: "#615DFA" },
  chipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  chipTextActive: { color: "#FFFFFF" },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: "#F3F4F6", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  stepperBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  stepperValue: { fontSize: 18, fontWeight: "800", color: "#0F172A", minWidth: 28, textAlign: "center" },
  colorRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  colorDot: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: "transparent" },
  colorDotActive: { borderColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  submit: { marginTop: 6, height: 54, borderRadius: 14, backgroundColor: "#615DFA", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, shadowColor: "#615DFA", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  submitDisabled: { backgroundColor: "#9CA3AF", shadowOpacity: 0 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});

const sheetStyles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, marginBottom: 4 },
  cancel: { fontSize: 15, color: "#6B7280", fontWeight: "600", width: 48 },
  done: { fontSize: 15, color: "#615DFA", fontWeight: "800", width: 48, textAlign: "right" },
  groupLabel: { fontSize: 11, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 4 },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  optionText: { fontSize: 15, color: "#111827", fontWeight: "600" },
  everyRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  everyLabel: { fontSize: 15, color: "#374151", fontWeight: "600" },
  twoCol: { flexDirection: "row", gap: 16 },
});

const pickerStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  handle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  headerNav: { width: 36, height: 36, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  weekdays: { flexDirection: "row", marginTop: 8, marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#9CA3AF" },
  row: { flexDirection: "row" },
  cell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  cellSelected: { backgroundColor: "#615DFA" },
  cellToday: { borderWidth: 1.5, borderColor: "#615DFA" },
  cellText: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  cellTextSelected: { color: "#FFFFFF" },
  cellTextToday: { color: "#615DFA" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirmButton: { flex: 1, height: 48, borderRadius: 12, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center" },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});

const timeStyles = StyleSheet.create({
  preview: { alignItems: "center", paddingVertical: 16 },
  previewText: { fontSize: 32, fontWeight: "800", color: "#0F172A", letterSpacing: -0.6 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: "#6B7280", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 8, marginBottom: 8 },
  scrollRow: { gap: 8, paddingHorizontal: 4 },
  numberChip: { minWidth: 48, height: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  numberChipActive: { backgroundColor: "#615DFA" },
  numberChipText: { fontSize: 16, fontWeight: "800", color: "#374151" },
  numberChipTextActive: { color: "#FFFFFF" },
  periodRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  periodButton: { flex: 1, height: 44, borderRadius: 12, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center" },
  periodButtonActive: { backgroundColor: "#615DFA" },
  periodText: { fontSize: 14, fontWeight: "800", color: "#374151" },
  periodTextActive: { color: "#615DFA" },
});
