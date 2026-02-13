"use server";

import { revalidatePath } from "next/cache";
import {
  createBranch,
  updateBranch,
  softDeleteBranch,
} from "@/data/branches";
import type { Branch } from "@/db/schema";

export interface AddBranchData {
  name: string;
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  adminId: string | null;
}

export interface UpdateBranchData {
  name: string;
  companyName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  adminId: string | null;
}

export async function addBranchAction(
  data: AddBranchData
): Promise<{ success: boolean; error?: string; branch?: Branch }> {
  try {
    const result = await createBranch({
      name: data.name,
      company_name: data.companyName,
      address: data.address,
      phone: data.phone,
      email: data.email,
      bank_name: data.bankName,
      bank_account: data.bankAccount,
      admin_id: data.adminId,
    });

    if (!result) {
      return { success: false, error: "Failed to create branch" };
    }

    revalidatePath("/branches");
    return { success: true, branch: result };
  } catch (error) {
    console.error("Error creating branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function updateBranchAction(
  branchId: string,
  data: UpdateBranchData
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await updateBranch(branchId, {
      name: data.name,
      company_name: data.companyName,
      address: data.address,
      phone: data.phone,
      email: data.email,
      bank_name: data.bankName,
      bank_account: data.bankAccount,
      admin_id: data.adminId,
    });

    if (!result) {
      return { success: false, error: "Failed to update branch" };
    }

    revalidatePath("/branches");
    return { success: true };
  } catch (error) {
    console.error("Error updating branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

export async function deleteBranchAction(
  branchId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await softDeleteBranch(branchId);

    if (!result) {
      return { success: false, error: "Failed to delete branch" };
    }

    revalidatePath("/branches");
    return { success: true };
  } catch (error) {
    console.error("Error deleting branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
