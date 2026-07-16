import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/auth";

// Device-local per-child preferences: a nickname and a custom colour. Parents
// can't write to the students table (RLS), so these live on the device. Used by
// the Schedule filter/calendar, Progress, Home, and the Add-event assign picker.

type NickCtx = {
  // Display label for a child: their nickname if set, else the first word of their real name.
  label: (studentId: string, fullName: string) => string;
  raw: (studentId: string) => string | null; // the stored nickname only (or null)
  setNickname: (studentId: string, nickname: string) => void;
  color: (studentId: string) => string | null; // custom colour override (or null = use system colour)
  setColor: (studentId: string, hex: string | null) => void;
};
const Ctx = createContext<NickCtx>({
  label: (_id, name) => name.split(" ")[0],
  raw: () => null,
  setNickname: () => {},
  color: () => null,
  setColor: () => {},
});

const NAME_KEY = (userId: string) => `childNicknames:v1:${userId}`;
const COLOR_KEY = (userId: string) => `childColors:v1:${userId}`;

export function NicknameProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id;
  const [map, setMap] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) { setMap({}); setColors({}); return; }
    let active = true;
    AsyncStorage.multiGet([NAME_KEY(userId), COLOR_KEY(userId)]).then((pairs) => {
      if (!active) return;
      const read = (raw: string | null) => { try { const p = raw ? JSON.parse(raw) : {}; return p && typeof p === "object" ? p : {}; } catch { return {}; } };
      setMap(read(pairs[0]?.[1] ?? null));
      setColors(read(pairs[1]?.[1] ?? null));
    });
    return () => { active = false; };
  }, [userId]);

  const setNickname = useCallback((studentId: string, nickname: string) => {
    setMap((prev) => {
      const next = { ...prev };
      const trimmed = nickname.trim();
      if (trimmed) next[studentId] = trimmed;
      else delete next[studentId]; // empty clears it
      if (userId) AsyncStorage.setItem(NAME_KEY(userId), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [userId]);

  const setColor = useCallback((studentId: string, hex: string | null) => {
    setColors((prev) => {
      const next = { ...prev };
      if (hex) next[studentId] = hex;
      else delete next[studentId]; // null clears → back to system colour
      if (userId) AsyncStorage.setItem(COLOR_KEY(userId), JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, [userId]);

  const value = useMemo<NickCtx>(() => ({
    label: (studentId, fullName) => map[studentId] || (fullName ? fullName.split(" ")[0] : "Child"),
    raw: (studentId) => map[studentId] ?? null,
    setNickname,
    color: (studentId) => colors[studentId] ?? null,
    setColor,
  }), [map, colors, setNickname, setColor]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNicknames() {
  return useContext(Ctx);
}
