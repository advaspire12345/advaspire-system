import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Device-local app settings + onboarding-tour tracking (parent portal).

export type CalView = "month" | "week" | "day";

type SettingsCtx = {
  loaded: boolean;
  defaultView: CalView;
  showFilter: boolean;
  setDefaultView: (v: CalView) => void;
  setShowFilter: (b: boolean) => void;
  // Onboarding tour: auto-shows on the 1st & 2nd app open, then only via Help.
  tourVisible: boolean;
  showTour: () => void;
  hideTour: () => void;
};

const Ctx = createContext<SettingsCtx>({
  loaded: false, defaultView: "week", showFilter: true,
  setDefaultView: () => {}, setShowFilter: () => {},
  tourVisible: false, showTour: () => {}, hideTour: () => {},
});

const DV_KEY = "settings:defaultView:v1";
const SF_KEY = "settings:showFilter:v1";
const OPENS_KEY = "settings:appOpens:v1";

export function SettingsProvider({ children }: PropsWithChildren) {
  const [loaded, setLoaded] = useState(false);
  const [defaultView, setDV] = useState<CalView>("week");
  const [showFilter, setSF] = useState(true);
  const [tourVisible, setTourVisible] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const pairs = await AsyncStorage.multiGet([DV_KEY, SF_KEY, OPENS_KEY]);
      if (!active) return;
      const map = Object.fromEntries(pairs);
      const dv = map[DV_KEY];
      if (dv === "month" || dv === "week" || dv === "day") setDV(dv);
      if (map[SF_KEY] != null) setSF(map[SF_KEY] === "1");
      const opens = (parseInt(map[OPENS_KEY] ?? "0", 10) || 0) + 1;
      AsyncStorage.setItem(OPENS_KEY, String(opens)).catch(() => {});
      if (opens <= 2) setTourVisible(true); // auto-show first & second open
      setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  const setDefaultView = useCallback((v: CalView) => { setDV(v); AsyncStorage.setItem(DV_KEY, v).catch(() => {}); }, []);
  const setShowFilter = useCallback((b: boolean) => { setSF(b); AsyncStorage.setItem(SF_KEY, b ? "1" : "0").catch(() => {}); }, []);
  const showTour = useCallback(() => setTourVisible(true), []);
  const hideTour = useCallback(() => setTourVisible(false), []);

  const value = useMemo<SettingsCtx>(() => ({
    loaded, defaultView, showFilter, setDefaultView, setShowFilter, tourVisible, showTour, hideTour,
  }), [loaded, defaultView, showFilter, setDefaultView, setShowFilter, tourVisible, showTour, hideTour]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  return useContext(Ctx);
}
