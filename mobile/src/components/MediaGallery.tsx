import { useRef, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export type MediaItem = { type: "photo" | "video"; url: string };

// Full-screen swipeable gallery of a student's photos + videos for the day. Rendered
// as an absolute OVERLAY (not a React Native Modal) — WebView video renders black
// inside a Modal on Android, but works in a plain overlay. Videos play in-app via a
// WebView <video> given the file's own origin as baseUrl (so the remote video loads).
export function MediaGallery({ items, index, onClose }: { items: MediaItem[] | null; index: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [current, setCurrent] = useState(index);
  const ref = useRef<ScrollView>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let WebView: any = null;
  try { WebView = require("react-native-webview").WebView; } catch { /* not in this build */ }

  if (!items || !items.length) return null;
  // A compact centered popup (~half the screen), not full-screen.
  const cardW = Math.min(width - 32, 380);
  const stageH = Math.round(height * 0.42);
  const onEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / cardW);
    if (i !== current && i >= 0 && i < items.length) setCurrent(i);
  };
  const videoHtml = (u: string) => `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></head><body style="margin:0;background:#000;height:100vh;display:flex;align-items:center;justify-content:center"><video src="${u}" controls autoplay muted playsinline webkit-playsinline preload="auto" style="width:100%;height:100%;object-fit:contain"></video></body></html>`;
  const originOf = (u: string) => { try { return new URL(u).origin; } catch { return "https://localhost"; } };

  return (
    <View style={[styles.overlay, { width, height }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.card, { width: cardW }]}>
        <View style={styles.bar}>
          <Text style={styles.count}>{current + 1} / {items.length}</Text>
          <Pressable hitSlop={12} onPress={onClose}><Ionicons name="close" size={22} color="#FFFFFF" /></Pressable>
        </View>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: index * cardW, y: 0 }}
          onMomentumScrollEnd={onEnd}
          style={{ width: cardW, height: stageH }}
        >
          {items.map((m, i) => (
            <View key={`${i}-${m.url}`} style={[styles.page, { width: cardW, height: stageH }]}>
              {m.type === "photo" ? (
                <Image source={{ uri: m.url }} style={{ width: cardW, height: stageH }} resizeMode="contain" />
              ) : i === current && WebView ? (
                <WebView
                  source={{ html: videoHtml(m.url), baseUrl: originOf(m.url) }}
                  style={{ width: cardW, height: stageH, backgroundColor: "#000" }}
                  androidLayerType="hardware"
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  allowsFullscreenVideo
                  mixedContentMode="always"
                  javaScriptEnabled
                  domStorageEnabled
                  originWhitelist={["*"]}
                />
              ) : (
                <Pressable style={[styles.placeholder, { width: cardW, height: stageH }]} onPress={() => setCurrent(i)}>
                  <Ionicons name="play-circle" size={56} color="#FFFFFF" />
                  <Text style={styles.phText}>Tap to play</Text>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
        {items[current]?.type === "video" ? (
          <Pressable style={styles.openRow} onPress={() => Linking.openURL(items[current].url)}>
            <Text style={styles.openRowText}>Not playing? Tap to open</Text>
          </Pressable>
        ) : items.length > 1 ? (
          <Text style={styles.hint}>Swipe to see more</Text>
        ) : <View style={{ height: 10 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: "absolute", top: 0, left: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000, elevation: 1000, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: "#111827", borderRadius: 16, overflow: "hidden" },
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10 },
  count: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  page: { alignItems: "center", justifyContent: "center", backgroundColor: "#000000" },
  placeholder: { alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#000000" },
  phText: { color: "#9CA3AF", fontSize: 13, fontWeight: "600" },
  openRow: { alignItems: "center", justifyContent: "center", paddingVertical: 10 },
  openRowText: { color: "#9CA3AF", fontSize: 12, fontWeight: "600" },
  hint: { color: "#6B7280", fontSize: 11, fontWeight: "600", textAlign: "center", paddingVertical: 8 },
});
