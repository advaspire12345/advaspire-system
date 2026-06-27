import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth";
import { supabase } from "@/lib/supabase";

type RepeatMode = "single" | "multi" | "recurring";

const WEEKDAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const COLORS = ["#615DFA", "#EF4444", "#F59E0B", "#10B981", "#23D2E2", "#EC4899"];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function parseYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}

function formatHumanDate(s: string): string {
  if (!s) return "Pick a date";
  return parseYmd(s).toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function formatHumanTime(s: string): string {
  if (!s) return "Pick a time";
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export default function NewEventScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ parentId?: string }>();

  const [parentId, setParentId] = useState<string | null>((params.parentId as string) ?? null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [mode, setMode] = useState<RepeatMode>("single");

  const [date, setDate] = useState(ymd(new Date()));
  const [endDate, setEndDate] = useState("");
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [recurringStart, setRecurringStart] = useState(ymd(new Date()));
  const [recurringEnd, setRecurringEnd] = useState("");
  const [bounded, setBounded] = useState(false);

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [datePicker, setDatePicker] = useState<
    null | { target: "single" | "multiStart" | "multiEnd" | "recStart" | "recEnd"; initial: string }
  >(null);
  const [timePicker, setTimePicker] = useState<null | { target: "start" | "end"; initial: string }>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (parentId) return;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("parents")
        .select("id")
        .eq("auth_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (data) setParentId(data.id as string);
    })();
  }, [user, parentId]);

  const canSubmit = useMemo(() => {
    if (!title.trim()) return false;
    if (mode === "single") return !!date;
    if (mode === "multi") {
      if (!date || !endDate) return false;
      if (endDate < date) return false;
      return !!startTime && !!endTime;
    }
    if (recurringDays.length === 0) return false;
    if (!recurringStart) return false;
    if (bounded && (!recurringEnd || recurringEnd < recurringStart)) return false;
    if (!startTime || !endTime) return false;
    return true;
  }, [title, mode, date, endDate, recurringDays, recurringStart, recurringEnd, bounded, startTime, endTime]);

  const toggleDay = (k: string) => {
    setRecurringDays((prev) => (prev.includes(k) ? prev.filter((d) => d !== k) : [...prev, k]));
  };

  const formatTime = (s: string): string | null => (s ? `${s}:00` : null);

  const setPickedDate = (target: "single" | "multiStart" | "multiEnd" | "recStart" | "recEnd", v: string) => {
    if (target === "single" || target === "multiStart") setDate(v);
    else if (target === "multiEnd") setEndDate(v);
    else if (target === "recStart") setRecurringStart(v);
    else if (target === "recEnd") setRecurringEnd(v);
  };

  const setPickedTime = (target: "start" | "end", v: string) => {
    if (target === "start") setStartTime(v);
    else setEndTime(v);
  };

  const openDatePicker = (target: "single" | "multiStart" | "multiEnd" | "recStart" | "recEnd") => {
    Keyboard.dismiss();
    const initial =
      target === "single" || target === "multiStart"
        ? date
        : target === "multiEnd"
          ? endDate || date
          : target === "recStart"
            ? recurringStart
            : recurringEnd || recurringStart;
    setDatePicker({ target, initial: initial || ymd(new Date()) });
  };

  const openTimePicker = (target: "start" | "end") => {
    Keyboard.dismiss();
    const initial = (target === "start" ? startTime : endTime) || "09:00";
    setTimePicker({ target, initial });
  };

  const onSubmit = async () => {
    if (!canSubmit || !parentId) {
      Alert.alert("Missing info", "Please fill in all required fields.");
      return;
    }
    Keyboard.dismiss();
    setSaving(true);
    try {
      const isRecurring = mode === "recurring";
      const isBounded = mode === "multi" || (mode === "recurring" && bounded);
      const base = {
        title: title.trim(),
        description: description.trim() || null,
        event_type: "own_schedule" as const,
        scope: "self" as const,
        audience: "everyone" as const,
        color,
        created_by_parent_id: parentId,
        branch_id: null,
        company_id: null,
        status: "published" as const,
        is_recurring: isRecurring,
        is_bounded: isBounded,
      };

      let row: Record<string, unknown>;
      let occurrenceRows: { date: string; start_time: string | null; end_time: string | null }[] = [];

      if (mode === "single") {
        row = {
          ...base,
          date,
          end_date: null,
          start_time: formatTime(startTime),
          end_time: formatTime(endTime),
          recurring_days: null,
          recurring_start_date: null,
          recurring_end_date: null,
          recurring_start_time: null,
          recurring_end_time: null,
        };
        occurrenceRows = [{ date, start_time: formatTime(startTime), end_time: formatTime(endTime) }];
      } else if (mode === "multi") {
        row = {
          ...base,
          date,
          end_date: endDate,
          start_time: formatTime(startTime),
          end_time: formatTime(endTime),
          recurring_days: null,
          recurring_start_date: date,
          recurring_end_date: endDate,
          recurring_start_time: formatTime(startTime),
          recurring_end_time: formatTime(endTime),
        };
      } else {
        row = {
          ...base,
          date: recurringStart,
          end_date: bounded ? recurringEnd : null,
          start_time: formatTime(startTime),
          end_time: formatTime(endTime),
          recurring_days: recurringDays,
          recurring_start_date: bounded ? recurringStart : null,
          recurring_end_date: bounded ? recurringEnd : null,
          recurring_start_time: formatTime(startTime),
          recurring_end_time: formatTime(endTime),
        };
      }

      const { data: inserted, error } = await supabase
        .from("events")
        .insert(row)
        .select("id")
        .single();
      if (error) throw error;

      if (occurrenceRows.length > 0 && inserted) {
        const occInserts = occurrenceRows.map((o, i) => ({
          event_id: inserted.id as string,
          date: o.date,
          start_time: o.start_time,
          end_time: o.end_time,
          sort_order: i,
        }));
        const { error: occErr } = await supabase.from("event_occurrences").insert(occInserts);
        if (occErr) console.warn("event_occurrences insert failed:", occErr.message);
      }

      Alert.alert("Event created", "Your event is now on the schedule.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      Alert.alert(
        "Couldn't save event",
        msg.includes("row-level security") || msg.includes("permission denied")
          ? "Your account isn't allowed to create events directly yet. Please use the web parent portal for now."
          : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "New event", headerTintColor: "#615DFA" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Card>
              <Label>Title</Label>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Family trip"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
                returnKeyType="next"
              />

              <Label style={{ marginTop: 14 }}>Description (optional)</Label>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Notes for yourself"
                placeholderTextColor="#9CA3AF"
                style={[styles.input, styles.textarea]}
                multiline
              />
            </Card>

            <Card>
              <Label>Repeat</Label>
              <View style={styles.segment}>
                {(["single", "multi", "recurring"] as const).map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.segmentButton, mode === m && styles.segmentButtonActive]}
                    onPress={() => setMode(m)}
                  >
                    <Text style={[styles.segmentText, mode === m && styles.segmentTextActive]}>
                      {m === "single" ? "Single day" : m === "multi" ? "Multi-day" : "Weekly"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Card>

            <Card>
              {mode === "single" ? (
                <>
                  <Label>Date</Label>
                  <PickerButton
                    icon="calendar-outline"
                    label={formatHumanDate(date)}
                    onPress={() => openDatePicker("single")}
                  />
                </>
              ) : null}

              {mode === "multi" ? (
                <>
                  <Label>Starts</Label>
                  <PickerButton
                    icon="calendar-outline"
                    label={formatHumanDate(date)}
                    onPress={() => openDatePicker("multiStart")}
                  />
                  <Label style={{ marginTop: 14 }}>Ends</Label>
                  <PickerButton
                    icon="calendar-outline"
                    label={formatHumanDate(endDate)}
                    onPress={() => openDatePicker("multiEnd")}
                  />
                </>
              ) : null}

              {mode === "recurring" ? (
                <>
                  <Label>Repeat on</Label>
                  <View style={styles.dayRow}>
                    {WEEKDAYS.map((w) => {
                      const active = recurringDays.includes(w.key);
                      return (
                        <Pressable
                          key={w.key}
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          onPress={() => toggleDay(w.key)}
                        >
                          <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                            {w.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Label style={{ marginTop: 14 }}>Starts</Label>
                  <PickerButton
                    icon="calendar-outline"
                    label={formatHumanDate(recurringStart)}
                    onPress={() => openDatePicker("recStart")}
                  />
                  <View style={styles.toggleRow}>
                    <Pressable
                      style={[styles.toggleButton, !bounded && styles.toggleButtonActive]}
                      onPress={() => setBounded(false)}
                    >
                      <Text style={[styles.toggleText, !bounded && styles.toggleTextActive]}>No end</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.toggleButton, bounded && styles.toggleButtonActive]}
                      onPress={() => setBounded(true)}
                    >
                      <Text style={[styles.toggleText, bounded && styles.toggleTextActive]}>Ends on…</Text>
                    </Pressable>
                  </View>
                  {bounded ? (
                    <PickerButton
                      icon="calendar-outline"
                      label={formatHumanDate(recurringEnd)}
                      onPress={() => openDatePicker("recEnd")}
                    />
                  ) : null}
                </>
              ) : null}
            </Card>

            <Card>
              <Label>Time{mode === "single" ? " (optional)" : ""}</Label>
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallLabel}>Start</Text>
                  <PickerButton
                    icon="time-outline"
                    label={formatHumanTime(startTime)}
                    onPress={() => openTimePicker("start")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.smallLabel}>End</Text>
                  <PickerButton
                    icon="time-outline"
                    label={formatHumanTime(endTime)}
                    onPress={() => openTimePicker("end")}
                  />
                </View>
              </View>
            </Card>

            <Card>
              <Label>Color</Label>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
                  />
                ))}
              </View>
            </Card>

            <Pressable
              style={({ pressed }) => [
                styles.submit,
                (!canSubmit || saving) && styles.submitDisabled,
                pressed && canSubmit && !saving && styles.pressed,
              ]}
              onPress={onSubmit}
              disabled={!canSubmit || saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.submitText}>Save event</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {datePicker ? (
        <DatePickerModal
          initial={datePicker.initial}
          onClose={() => setDatePicker(null)}
          onPick={(v) => {
            setPickedDate(datePicker.target, v);
            setDatePicker(null);
          }}
        />
      ) : null}

      {timePicker ? (
        <TimePickerModal
          initial={timePicker.initial}
          onClose={() => setTimePicker(null)}
          onPick={(v) => {
            setPickedTime(timePicker.target, v);
            setTimePicker(null);
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

function Label({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

function PickerButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.pickerButton, pressed && styles.pressed]} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#615DFA" />
      <Text style={styles.pickerButtonText}>{label}</Text>
      <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
    </Pressable>
  );
}

// ─── Date picker modal (pure-JS, no native module) ─────────────────────────

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

function DatePickerModal({
  initial,
  onClose,
  onPick,
}: {
  initial: string;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
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
          <Pressable
            onPress={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            style={pickerStyles.headerNav}
          >
            <Ionicons name="chevron-back" size={18} color="#615DFA" />
          </Pressable>
          <Text style={pickerStyles.headerTitle}>{monthLabel}</Text>
          <Pressable
            onPress={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            style={pickerStyles.headerNav}
          >
            <Ionicons name="chevron-forward" size={18} color="#615DFA" />
          </Pressable>
        </View>
        <View style={pickerStyles.weekdays}>
          {WEEKDAY_SHORT.map((w, i) => (
            <Text key={i} style={pickerStyles.weekdayLabel}>
              {w}
            </Text>
          ))}
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
                  <Pressable
                    key={colIdx}
                    style={[
                      pickerStyles.cell,
                      isSelected && pickerStyles.cellSelected,
                      isToday && !isSelected && pickerStyles.cellToday,
                    ]}
                    onPress={() => setSelected(k)}
                  >
                    <Text
                      style={[
                        pickerStyles.cellText,
                        isSelected && pickerStyles.cellTextSelected,
                        isToday && !isSelected && pickerStyles.cellTextToday,
                      ]}
                    >
                      {d.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
        <View style={pickerStyles.actions}>
          <Pressable style={pickerStyles.cancelButton} onPress={onClose}>
            <Text style={pickerStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={pickerStyles.confirmButton} onPress={() => onPick(selected)}>
            <Text style={pickerStyles.confirmText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Time picker modal (pure-JS) ──────────────────────────────────────────

function TimePickerModal({
  initial,
  onClose,
  onPick,
}: {
  initial: string;
  onClose: () => void;
  onPick: (v: string) => void;
}) {
  const [h24, m] = initial.split(":").map((n) => parseInt(n, 10));
  const initialPeriod = h24 < 12 ? "AM" : "PM";
  const initialHour = h24 % 12 || 12;
  const [hour, setHour] = useState<number>(initialHour);
  const [minute, setMinute] = useState<number>(m);
  const [period, setPeriod] = useState<"AM" | "PM">(initialPeriod);

  const confirm = () => {
    let h = hour % 12;
    if (period === "PM") h += 12;
    const result = `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    onPick(result);
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={pickerStyles.backdrop} onPress={onClose} />
      <View style={pickerStyles.sheet}>
        <View style={pickerStyles.handle} />
        <Text style={pickerStyles.headerTitle}>Pick a time</Text>
        <View style={timeStyles.preview}>
          <Text style={timeStyles.previewText}>
            {hour}:{String(minute).padStart(2, "0")} {period}
          </Text>
        </View>

        <Text style={timeStyles.sectionLabel}>Hour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={timeStyles.scrollRow}>
          {hours.map((h) => (
            <Pressable
              key={h}
              style={[timeStyles.numberChip, hour === h && timeStyles.numberChipActive]}
              onPress={() => setHour(h)}
            >
              <Text style={[timeStyles.numberChipText, hour === h && timeStyles.numberChipTextActive]}>{h}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={timeStyles.sectionLabel}>Minute</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={timeStyles.scrollRow}>
          {minutes.map((mm) => (
            <Pressable
              key={mm}
              style={[timeStyles.numberChip, minute === mm && timeStyles.numberChipActive]}
              onPress={() => setMinute(mm)}
            >
              <Text style={[timeStyles.numberChipText, minute === mm && timeStyles.numberChipTextActive]}>
                {String(mm).padStart(2, "0")}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={timeStyles.periodRow}>
          {(["AM", "PM"] as const).map((p) => (
            <Pressable
              key={p}
              style={[timeStyles.periodButton, period === p && timeStyles.periodButtonActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[timeStyles.periodText, period === p && timeStyles.periodTextActive]}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <View style={pickerStyles.actions}>
          <Pressable style={pickerStyles.cancelButton} onPress={onClose}>
            <Text style={pickerStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={pickerStyles.confirmButton} onPress={confirm}>
            <Text style={pickerStyles.confirmText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  flex: { flex: 1 },
  scroll: { padding: 16, gap: 14, paddingBottom: 48 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  label: { fontSize: 11, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.6 },
  smallLabel: { fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  textarea: { height: 88, textAlignVertical: "top" },
  segment: { flexDirection: "row", gap: 8 },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  segmentButtonActive: { backgroundColor: "#615DFA" },
  segmentText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  segmentTextActive: { color: "#FFFFFF" },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#F9FAFB",
  },
  pickerButtonText: { flex: 1, fontSize: 15, color: "#111827", fontWeight: "600" },
  dayRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  dayChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  dayChipActive: { backgroundColor: "#615DFA" },
  dayChipText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  dayChipTextActive: { color: "#FFFFFF" },
  toggleRow: { flexDirection: "row", gap: 8, marginTop: 12, marginBottom: 6 },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  toggleButtonActive: { backgroundColor: "#EEF2FF" },
  toggleText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  toggleTextActive: { color: "#615DFA" },
  timeRow: { flexDirection: "row", gap: 12 },
  colorRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "transparent",
  },
  colorDotActive: { borderColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  submit: {
    marginTop: 6,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#615DFA",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#615DFA",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  submitDisabled: { backgroundColor: "#9CA3AF", shadowOpacity: 0 },
  submitText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});

const pickerStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.5)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: { width: 40, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  headerNav: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  weekdays: { flexDirection: "row", marginTop: 8, marginBottom: 4 },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "800", color: "#9CA3AF" },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cellEmpty: { flex: 1, aspectRatio: 1, margin: 2 },
  cellSelected: { backgroundColor: "#615DFA" },
  cellToday: { borderWidth: 1.5, borderColor: "#615DFA" },
  cellText: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  cellTextSelected: { color: "#FFFFFF" },
  cellTextToday: { color: "#615DFA" },
  actions: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "700", color: "#374151" },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#615DFA",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
});

const timeStyles = StyleSheet.create({
  preview: {
    alignItems: "center",
    paddingVertical: 16,
  },
  previewText: { fontSize: 32, fontWeight: "800", color: "#0F172A", letterSpacing: -0.6 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 8,
  },
  scrollRow: { gap: 8, paddingHorizontal: 4 },
  numberChip: {
    minWidth: 48,
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  numberChipActive: { backgroundColor: "#615DFA" },
  numberChipText: { fontSize: 16, fontWeight: "800", color: "#374151" },
  numberChipTextActive: { color: "#FFFFFF" },
  periodRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  periodButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  periodButtonActive: { backgroundColor: "#EEF2FF" },
  periodText: { fontSize: 14, fontWeight: "800", color: "#374151" },
  periodTextActive: { color: "#615DFA" },
});
