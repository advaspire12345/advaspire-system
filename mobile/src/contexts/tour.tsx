import { createContext, useCallback, useContext, useEffect, useRef, type PropsWithChildren } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

// Registry of on-screen targets the onboarding tour can spotlight. A TourTarget
// wraps a UI element and registers a function to measure its window rect.

export type Rect = { x: number; y: number; width: number; height: number };
type MeasureFn = () => Promise<Rect | null>;

type TourCtx = {
  register: (name: string, fn: MeasureFn) => void;
  unregister: (name: string) => void;
  measure: (name: string) => Promise<Rect | null>;
};

const Ctx = createContext<TourCtx>({ register: () => {}, unregister: () => {}, measure: async () => null });

export function TourProvider({ children }: PropsWithChildren) {
  const map = useRef(new Map<string, MeasureFn>());
  const register = useCallback((name: string, fn: MeasureFn) => { map.current.set(name, fn); }, []);
  const unregister = useCallback((name: string) => { map.current.delete(name); }, []);
  const measure = useCallback(async (name: string) => {
    const fn = map.current.get(name);
    return fn ? fn() : null;
  }, []);
  return <Ctx.Provider value={{ register, unregister, measure }}>{children}</Ctx.Provider>;
}

export function useTour() {
  return useContext(Ctx);
}

// Wrap a UI element so the tour can find & highlight it. `style` passes through
// (use flex:1 etc. so wrapping doesn't break layout).
export function TourTarget({ name, style, children }: PropsWithChildren<{ name: string; style?: StyleProp<ViewStyle> }>) {
  const ref = useRef<View>(null);
  const { register, unregister } = useTour();
  useEffect(() => {
    register(name, () => new Promise<Rect | null>((resolve) => {
      const node = ref.current;
      if (!node) return resolve(null);
      node.measureInWindow((x, y, width, height) => {
        if (width === 0 && height === 0) resolve(null);
        else resolve({ x, y, width, height });
      });
    }));
    return () => unregister(name);
  }, [name, register, unregister]);
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}
