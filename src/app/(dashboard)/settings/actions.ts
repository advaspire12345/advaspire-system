"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/data/settings";
import type { SettingsMap } from "@/data/settings";

export interface SettingsFormPayload {
  adcoinPerRm: string;
  poolPercentage: string;
  poolAccountEmail: string;
}

export async function updateSettingsAction(
  payload: SettingsFormPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate inputs
    const adcoinPerRm = parseInt(payload.adcoinPerRm);
    if (isNaN(adcoinPerRm) || adcoinPerRm <= 0) {
      return { success: false, error: "AdCoin per RM must be a positive number" };
    }

    const poolPercentage = parseFloat(payload.poolPercentage);
    if (isNaN(poolPercentage) || poolPercentage < 0 || poolPercentage > 100) {
      return { success: false, error: "Pool percentage must be between 0 and 100" };
    }

    if (!payload.poolAccountEmail || !payload.poolAccountEmail.includes("@")) {
      return { success: false, error: "Please enter a valid email address" };
    }

    const settingsToUpdate: Partial<SettingsMap> = {
      adcoin_per_rm: payload.adcoinPerRm,
      pool_percentage: payload.poolPercentage,
      pool_account_email: payload.poolAccountEmail,
    };

    const success = await updateSettings(settingsToUpdate);

    if (!success) {
      return { success: false, error: "Failed to update settings" };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Error in updateSettingsAction:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}
