import AsyncStorage from "@react-native-async-storage/async-storage";

// On-device cache of last-fetched screen data so the app can show the last
// known view when offline instead of spinning forever. Bump the version
// segment whenever a cached shape changes incompatibly — old entries are then
// ignored (and refetched) instead of hydrating into mismatched UI and crashing.
const PREFIX = "cache:v2:";

export type CachedEntry<T> = { data: T; updatedAt: number };

export async function readCache<T>(key: string): Promise<CachedEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedEntry<T>;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T, updatedAt: number): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, updatedAt }));
  } catch {
    // Ignore write failures (e.g. storage full) — caching is best-effort.
  }
}

// Wipe all cached screens. Call on sign-out so the next account doesn't
// briefly see the previous parent's data.
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length) await AsyncStorage.multiRemove(ours);
  } catch {
    // Ignore — nothing actionable if storage is unavailable.
  }
}
