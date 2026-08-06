import { useEffect, useState } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSettings } from "@/contexts/settings";
import { useTour, type Rect } from "@/contexts/tour";

type Step = { target?: string; icon: keyof typeof Ionicons.glyphMap; tint: string; title: string; body: string };

// Steps with an optional `target` get a spotlight around that element; others
// show a centered card.
const STEPS: Step[] = [
  { icon: "hand-left", tint: "#EC2127", title: "Welcome to Advaspire", body: "A quick tour of the main things you can do here. You can skip anytime." },
  { target: "sessions", icon: "ticket", tint: "#EC2127", title: "Sessions left", body: "Your family's remaining class sessions at a glance. Tap it to see the breakdown." },
  { target: "settings", icon: "settings", tint: "#EC2127", title: "Settings & help", body: "Profile, change password, calendar defaults, and this tour again — all under the gear." },
  { target: "tabs", icon: "apps", tint: "#EC2127", title: "Your main features", body: "Progress, Schedule, Home, Payments and the Store — switch between them down here." },
];

const PAD = 8; // spotlight padding around the target
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

export function OnboardingTour() {
  const { tourVisible, hideTour } = useSettings();
  const { measure } = useTour();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => { if (tourVisible) setI(0); }, [tourVisible]);

  // Measure the current step's target (retry once after a tick for layout).
  useEffect(() => {
    let active = true;
    const step = STEPS[i];
    if (!tourVisible || !step?.target) { setRect(null); return; }
    (async () => {
      let r = await measure(step.target!);
      if (!r) { await new Promise((res) => setTimeout(res, 120)); r = await measure(step.target!); }
      if (active) setRect(r);
    })();
    return () => { active = false; };
  }, [i, tourVisible, measure]);

  if (!tourVisible) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;
  const spot = step.target && rect ? rect : null;

  // Tooltip goes below the target if it's in the top half, else above.
  const tipBelow = spot ? spot.y + spot.height < SCREEN_H * 0.5 : true;

  const next = () => (last ? hideTour() : setI((v) => v + 1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={hideTour} statusBarTranslucent>
      {spot ? (
        <SpotlightMask rect={spot} onPress={next} tipBelow={tipBelow} step={step} i={i} total={STEPS.length} last={last} onNext={next} onSkip={hideTour} />
      ) : (
        <View style={styles.centerBackdrop}>
          <View style={styles.card}>
            <Pressable style={styles.skip} onPress={hideTour} hitSlop={8}><Text style={styles.skipText}>Skip</Text></Pressable>
            <View style={[styles.iconWrap, { backgroundColor: step.tint + "1A" }]}><Ionicons name={step.icon} size={38} color={step.tint} /></View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <Dots i={i} total={STEPS.length} tint={step.tint} />
            <Pressable style={[styles.next, { backgroundColor: step.tint }]} onPress={next}>
              <Text style={styles.nextText}>{last ? "Get started" : "Next"}</Text>
              {!last ? <Ionicons name="arrow-forward" size={16} color="#FFFFFF" /> : null}
            </Pressable>
          </View>
        </View>
      )}
    </Modal>
  );
}

// Four dim panels around the target rect leave it un-dimmed (a spotlight),
// plus a bright ring and a tooltip.
function SpotlightMask({ rect, tipBelow, step, i, total, last, onNext, onSkip }: {
  rect: Rect; onPress: () => void; tipBelow: boolean; step: Step; i: number; total: number; last: boolean; onNext: () => void; onSkip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const x = Math.max(0, rect.x - PAD), y = Math.max(0, rect.y - PAD);
  const w = rect.width + PAD * 2, h = rect.height + PAD * 2;
  const dim = "rgba(15,23,42,0.72)";
  return (
    <View style={StyleSheet.absoluteFill}>
      {/* dim panels: top, bottom, left, right of the hole */}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: y, backgroundColor: dim }} />
      <View style={{ position: "absolute", left: 0, right: 0, top: y + h, bottom: 0, backgroundColor: dim }} />
      <View style={{ position: "absolute", top: y, height: h, left: 0, width: x, backgroundColor: dim }} />
      <View style={{ position: "absolute", top: y, height: h, left: x + w, right: 0, backgroundColor: dim }} />
      {/* highlight ring */}
      <View pointerEvents="none" style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 14, borderWidth: 2.5, borderColor: "#FFFFFF" }} />

      {/* tooltip */}
      <View style={[styles.tip, tipBelow ? { top: y + h + 12 } : { bottom: SCREEN_H - y + 12 }, { marginTop: tipBelow ? insets.top : 0 }]}>
        <View style={styles.tipRow}>
          <View style={[styles.tipIcon, { backgroundColor: step.tint + "1A" }]}><Ionicons name={step.icon} size={18} color={step.tint} /></View>
          <Text style={styles.tipTitle}>{step.title}</Text>
          <Pressable onPress={onSkip} hitSlop={8}><Text style={styles.skipText}>Skip</Text></Pressable>
        </View>
        <Text style={styles.tipBody}>{step.body}</Text>
        <View style={styles.tipFooter}>
          <Dots i={i} total={total} tint={step.tint} />
          <Pressable style={[styles.tipNext, { backgroundColor: step.tint }]} onPress={onNext}>
            <Text style={styles.nextText}>{last ? "Done" : "Next"}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function Dots({ i, total, tint }: { i: number; total: number; tint: string }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, idx) => (
        <View key={idx} style={[styles.dot, idx === i && { backgroundColor: tint, width: 18 }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centerBackdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", alignItems: "center", justifyContent: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: "#FFFFFF", borderRadius: 24, padding: 24, alignItems: "center", gap: 12 },
  skip: { position: "absolute", top: 14, right: 16, padding: 6 },
  skipText: { fontSize: 13, fontWeight: "700", color: "#999999" },
  iconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center", marginTop: 8 },
  title: { fontSize: 21, fontWeight: "800", color: "#2B161B", textAlign: "center" },
  body: { fontSize: 14, color: "#666666", textAlign: "center", lineHeight: 21 },
  dots: { flexDirection: "row", gap: 6, marginVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#E5E7EB" },
  next: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 24, height: 48, borderRadius: 14, justifyContent: "center", marginTop: 4 },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  tip: { position: "absolute", left: 16, right: 16, backgroundColor: "#FFFFFF", borderRadius: 18, padding: 16, gap: 10, shadowColor: "#2B161B", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  tipIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tipTitle: { flex: 1, fontSize: 16, fontWeight: "800", color: "#2B161B" },
  tipBody: { fontSize: 14, color: "#666666", lineHeight: 20 },
  tipFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  tipNext: { paddingHorizontal: 22, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
