import { supabaseAdmin } from "@/db";
import type { AppSettings } from "@/db/schema";

// ============================================
// SETTINGS TYPES
// ============================================

export interface SettingsMap {
  adcoin_per_rm: string;
  pool_percentage: string;
  pool_account_email: string;
  [key: string]: string;
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all settings as a key-value map
 */
export async function getSettings(): Promise<SettingsMap> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('key, value');

  if (error) {
    console.error('Error fetching settings:', error);
    return {
      adcoin_per_rm: '333',
      pool_percentage: '5',
      pool_account_email: 'advaspire@gmail.com',
    };
  }

  const settings: SettingsMap = {
    adcoin_per_rm: '333',
    pool_percentage: '5',
    pool_account_email: 'advaspire@gmail.com',
  };

  for (const row of data ?? []) {
    settings[row.key] = row.value;
  }

  return settings;
}

/**
 * Get a single setting value by key
 */
export async function getSetting(key: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.value ?? null;
}

/**
 * Get all settings as AppSettings array
 */
export async function getAllSettings(): Promise<AppSettings[]> {
  const { data, error } = await supabaseAdmin
    .from('app_settings')
    .select('*')
    .order('key');

  if (error) {
    console.error('Error fetching all settings:', error);
    return [];
  }

  return data ?? [];
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Update a setting value by key
 */
export async function updateSetting(
  key: string,
  value: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('key', key);

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    return false;
  }

  return true;
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(
  settings: Partial<SettingsMap>
): Promise<boolean> {
  const updates = Object.entries(settings)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([key, value]) => updateSetting(key, value));

  const results = await Promise.all(updates);
  return results.every((success) => success);
}

/**
 * Create a new setting (upsert)
 */
export async function upsertSetting(
  key: string,
  value: string,
  description?: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('app_settings')
    .upsert(
      {
        key,
        value,
        description: description ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    );

  if (error) {
    console.error(`Error upserting setting ${key}:`, error);
    return false;
  }

  return true;
}
