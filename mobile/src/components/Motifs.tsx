import { View, StyleSheet, useWindowDimensions } from "react-native";
import { C } from "@/theme/tech";

// Advaspire "hazard stripe" — a thin diagonal yellow/ink dash strip used along the
// app-bar bottom and tab-bar top. Approximated with skewed alternating segments
// clipped to a thin height (a native repeating-linear-gradient isn't available).
export function HazardStripe({ height = 3, colorA = C.yellow, colorB = C.ink, width }: { height?: number; colorA?: string; colorB?: string; width?: number }) {
  const win = useWindowDimensions();
  const w = width ?? win.width;
  const seg = 9; // stripe pitch
  const count = Math.ceil(w / seg) + 3;
  return (
    <View style={[styles.stripeWrap, { height, width: w }]}>
      <View style={[styles.stripeRow, { height: height * 4, top: -height, left: -height }]}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={{ width: seg, height: height * 4, backgroundColor: i % 2 === 0 ? colorA : colorB, transform: [{ skewX: "-24deg" }] }} />
        ))}
      </View>
    </View>
  );
}

// Faint blue "circuit" grid texture for ink panels (thin vertical/horizontal lines).
export function CircuitTexture({ pitch = 20, opacity = 0.12, vertical = true, horizontal = false }: { pitch?: number; opacity?: number; vertical?: boolean; horizontal?: boolean }) {
  const win = useWindowDimensions();
  const vCount = Math.ceil(win.width / pitch) + 1;
  const line = `rgba(41,171,226,${opacity})`;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {vertical
        ? Array.from({ length: vCount }).map((_, i) => (
            <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: i * pitch, width: 1, backgroundColor: line }} />
          ))
        : null}
      {horizontal
        ? Array.from({ length: 24 }).map((_, i) => (
            <View key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: i * pitch, height: 1, backgroundColor: line }} />
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stripeWrap: { overflow: "hidden" },
  stripeRow: { position: "absolute", flexDirection: "row" },
});
