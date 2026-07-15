import { useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// ── Self-contained DEMO of "drag a class pill to another day" ──
// Nothing here touches the database — it's a UI prototype so the idea can be
// felt before wiring it to the real reschedule backend. Only a floating overlay
// pill is animated (the grid stays a plain static grid), which is Android-safe.

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const firstWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((firstWeekday + daysInMonth) / 7);
  const grid: (Date | null)[][] = [];
  let cursor = 1 - firstWeekday;
  for (let row = 0; row < weeks; row++) {
    const cells: (Date | null)[] = [];
    for (let col = 0; col < 7; col++) {
      cells.push(cursor >= 1 && cursor <= daysInMonth ? new Date(year, month, cursor) : null);
      cursor++;
    }
    grid.push(cells);
  }
  return grid;
}

const CELL_H = 62;
const PILL_H = 26;

export default function ScheduleDemoScreen() {
  const { width } = useWindowDimensions();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const year = today.getFullYear();
  const month = today.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const H_PAD = 16;
  const gridW = width - H_PAD * 2;
  const cellW = gridW / 7;
  const pillW = cellW - 8;

  // Earliest a class may move to = day after tomorrow (mirrors the 24h-ahead rule).
  const minTarget = useMemo(() => new Date(today.getTime() + 2 * 86400000), [today]);
  // The demo class starts 3 days out (or clamps into this month).
  const initialKey = useMemo(() => {
    let d = new Date(today.getTime() + 3 * 86400000);
    if (d.getMonth() !== month) d = new Date(year, month, Math.min(28, today.getDate()));
    return ymd(d);
  }, [today, year, month]);

  const [classKey, setClassKey] = useState<string>(initialKey);
  const [dragging, setDragging] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [movedTo, setMovedTo] = useState<string | null>(null);

  const pan = useRef(new Animated.ValueXY()).current;
  const gridRef = useRef<View>(null);
  const gridOrigin = useRef({ x: 0, y: 0 });

  const measure = () => gridRef.current?.measureInWindow((x, y) => { gridOrigin.current = { x, y }; });

  const isValidTarget = (d: Date | null): boolean =>
    !!d && ymd(d) !== classKey && d.getTime() >= minTarget.getTime();

  const cellFromXY = (px: number, py: number): Date | null => {
    const rx = px - gridOrigin.current.x;
    const ry = py - gridOrigin.current.y;
    const col = Math.floor(rx / cellW);
    const row = Math.floor(ry / CELL_H);
    if (col < 0 || col > 6 || row < 0 || row >= grid.length) return null;
    return grid[row][col];
  };

  const setFloating = (px: number, py: number) => {
    const rx = px - gridOrigin.current.x;
    const ry = py - gridOrigin.current.y;
    pan.setValue({ x: rx - pillW / 2, y: ry - PILL_H / 2 });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          measure();
          setMovedTo(null);
          setDragging(true);
          const { pageX, pageY } = e.nativeEvent;
          // measureInWindow is async; give the origin a tick, then place the pill.
          requestAnimationFrame(() => setFloating(pageX, pageY));
        },
        onPanResponderMove: (e) => {
          const { pageX, pageY } = e.nativeEvent;
          setFloating(pageX, pageY);
          const cell = cellFromXY(pageX, pageY);
          setHoverKey(cell && isValidTarget(cell) ? ymd(cell) : null);
        },
        onPanResponderRelease: (e) => {
          const cell = cellFromXY(e.nativeEvent.pageX, e.nativeEvent.pageY);
          if (cell && isValidTarget(cell)) {
            setClassKey(ymd(cell));
            setMovedTo(ymd(cell));
          }
          setDragging(false);
          setHoverKey(null);
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          setHoverKey(null);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classKey, grid, cellW],
  );

  const movedLabel = movedTo
    ? new Date(movedTo + "T00:00:00").toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long" })
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Drag to reschedule · demo", headerShown: true, headerTintColor: "#615DFA" }} />

      <View style={styles.intro}>
        <View style={styles.introIcon}><Ionicons name="hand-left" size={18} color="#615DFA" /></View>
        <Text style={styles.introText}>
          Press and drag the <Text style={styles.introStrong}>Robotics</Text> class onto another day. Days it can move
          to light up <Text style={styles.introGreen}>green</Text>. This is a preview — nothing is saved yet.
        </Text>
      </View>

      {movedLabel ? (
        <View style={styles.movedBanner}>
          <Ionicons name="checkmark-circle" size={16} color="#065F46" />
          <Text style={styles.movedText}>Moved to {movedLabel}</Text>
        </View>
      ) : null}

      <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>

      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={[styles.weekLabel, { width: cellW }]}>{w}</Text>
        ))}
      </View>

      {/* Static grid + a single animated floating pill overlay while dragging. */}
      <View ref={gridRef} onLayout={measure} style={[styles.grid, { width: gridW, marginHorizontal: H_PAD }]}>
        {grid.map((row, ri) => (
          <View key={ri} style={styles.gridRow}>
            {row.map((d, ci) => {
              if (!d) return <View key={ci} style={{ width: cellW, height: CELL_H }} />;
              const key = ymd(d);
              const isToday = key === ymd(today);
              const hasClass = key === classKey;
              const valid = dragging && isValidTarget(d);
              const hovered = hoverKey === key;
              return (
                <View
                  key={ci}
                  style={[
                    styles.cell,
                    { width: cellW, height: CELL_H },
                    valid && styles.cellValid,
                    hovered && styles.cellHovered,
                  ]}
                >
                  <Text style={[styles.cellNum, isToday && styles.cellNumToday]}>{d.getDate()}</Text>
                  {hasClass ? (
                    <View
                      style={[styles.classPill, { width: pillW }, dragging && styles.classPillGhost]}
                      {...panResponder.panHandlers}
                    >
                      <Text style={styles.classPillText} numberOfLines={1}>🤖 Robotics</Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}

        {dragging ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.floatingPill, { width: pillW, transform: pan.getTranslateTransform() }]}
          >
            <Text style={styles.floatingPillText} numberOfLines={1}>🤖 Robotics</Text>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]} />
          <Text style={styles.legendText}>Can move here</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: "#615DFA", borderColor: "#615DFA" }]} />
          <Text style={styles.legendText}>Drop target</Text>
        </View>
      </View>

      <Text style={styles.note}>
        In the real thing, only days within your child&apos;s program slots that still have a free seat would turn
        green — full classes stay grey. Today &amp; tomorrow are never selectable (24-hour rule).
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F6FB" },
  intro: { flexDirection: "row", gap: 10, alignItems: "center", margin: 16, marginBottom: 8, backgroundColor: "#EEF2FF", borderRadius: 14, padding: 14 },
  introIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  introText: { flex: 1, fontSize: 12.5, color: "#4338CA", lineHeight: 18 },
  introStrong: { fontWeight: "800" },
  introGreen: { fontWeight: "800", color: "#059669" },
  movedBanner: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 16, marginBottom: 4, backgroundColor: "#DCFCE7", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  movedText: { fontSize: 13, fontWeight: "700", color: "#065F46" },
  monthLabel: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginHorizontal: 16, marginTop: 8, marginBottom: 6 },
  weekRow: { flexDirection: "row", paddingHorizontal: 16 },
  weekLabel: { textAlign: "center", fontSize: 10, fontWeight: "800", color: "#9CA3AF", textTransform: "uppercase" },
  grid: { position: "relative", marginTop: 4 },
  gridRow: { flexDirection: "row" },
  cell: { borderWidth: 1, borderColor: "#F1F1F6", backgroundColor: "#FFFFFF", borderRadius: 10, margin: 1, paddingTop: 4, alignItems: "center" },
  cellValid: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  cellHovered: { backgroundColor: "#615DFA", borderColor: "#615DFA" },
  cellNum: { fontSize: 12, fontWeight: "700", color: "#374151" },
  cellNumToday: { color: "#615DFA" },
  classPill: { marginTop: 4, height: PILL_H, borderRadius: 7, backgroundColor: "#615DFA", alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  classPillGhost: { opacity: 0.25 },
  classPillText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  floatingPill: { position: "absolute", top: 0, left: 0, height: PILL_H, borderRadius: 7, backgroundColor: "#4338CA", alignItems: "center", justifyContent: "center", paddingHorizontal: 4, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  floatingPillText: { color: "#FFFFFF", fontSize: 9, fontWeight: "800" },
  legend: { flexDirection: "row", gap: 18, justifyContent: "center", marginTop: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendSwatch: { width: 16, height: 16, borderRadius: 5, borderWidth: 1 },
  legendText: { fontSize: 12, color: "#6B7280", fontWeight: "600" },
  note: { fontSize: 12, color: "#9CA3AF", lineHeight: 17, margin: 16, marginTop: 16 },
});
