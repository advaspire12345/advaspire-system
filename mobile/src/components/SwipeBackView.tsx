import { useCallback, useRef, type ReactNode } from "react";
import { Animated, PanResponder, useWindowDimensions, type ViewStyle } from "react-native";
import { useFocusEffect } from "expo-router";

// Interactive "swipe left → right to go back". The content follows the finger and
// either completes (calls onBack) or springs back on release. Works from anywhere
// on the screen — we only claim the gesture when the drag is clearly horizontal-
// rightward, so vertical scrolls and inner horizontal strips keep their gestures.
export function SwipeBackView({ onBack, children, style }: { onBack: () => void; children: ReactNode; style?: ViewStyle }) {
  const { width } = useWindowDimensions();
  const tx = useRef(new Animated.Value(0)).current;
  const cb = useRef(onBack);
  cb.current = onBack;
  // These screens live in a tab navigator and don't unmount — after a completed
  // swipe the view is translated off-screen, so reset it whenever we regain focus
  // (otherwise re-entering the screen shows a blank/pushed-off page).
  useFocusEffect(useCallback(() => { tx.setValue(0); return () => tx.setValue(0); }, [tx]));
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dx > 12 && g.dx > Math.abs(g.dy) * 1.8,
      onPanResponderMove: (_e, g) => { tx.setValue(Math.max(0, g.dx)); },
      onPanResponderRelease: (_e, g) => {
        if (g.dx > 100 || (g.dx > 45 && g.vx > 0.35)) {
          Animated.timing(tx, { toValue: width, duration: 170, useNativeDriver: true }).start(() => cb.current());
        } else {
          Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      },
      onPanResponderTerminate: () => { Animated.spring(tx, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(); },
    })
  ).current;
  return (
    <Animated.View style={[{ flex: 1, transform: [{ translateX: tx }] }, style]} {...pan.panHandlers}>
      {children}
    </Animated.View>
  );
}
