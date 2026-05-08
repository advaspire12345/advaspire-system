"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import {
  createBranch,
  updateBranch,
  softDeleteBranch,
} from "@/data/branches";
import { supabaseAdmin } from "@/db";
import { authorizeAction } from "@/data/permissions";
import type { Branch, BranchType } from "@/db/schema";

async function findCodeConflict(
  type: BranchType,
  code: string,
  parentId: string | null,
  excludeId?: string,
): Promise<boolean> {
  let query = supabaseAdmin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .eq("code", code)
    .is("deleted_at", null);

  if (type === "company") {
    query = query.eq("type", "company");
  } else {
    query = query.in("type", ["hq", "branch"]).eq("parent_id", parentId);
  }

  if (excludeId) query = query.neq("id", excludeId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

async function findAreaConflict(
  type: BranchType,
  city: string,
  parentId: string | null,
  excludeId?: string,
): Promise<boolean> {
  // Two different companies are allowed to share a city. The constraint only
  // applies to HQ/branch siblings under the same company — a company can't
  // have two branches in the same city.
  if (type === "company") return false;

  let query = supabaseAdmin
    .from("branches")
    .select("id", { count: "exact", head: true })
    .ilike("city", city)
    .is("deleted_at", null)
    .in("type", ["hq", "branch"])
    .eq("parent_id", parentId);

  if (excludeId) query = query.neq("id", excludeId);

  const { count } = await query;
  return (count ?? 0) > 0;
}

export interface AddBranchData {
  name: string;
  type: BranchType;
  code: string | null;
  parentId: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  website: string | null;
  logoUrl: string | null;
  registrationNumber: string | null;
}

export interface UpdateBranchData {
  name: string;
  type: BranchType;
  code: string | null;
  parentId: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  bankAccount: string | null;
  website: string | null;
  logoUrl: string | null;
  registrationNumber: string | null;
}

export async function addBranchAction(
  data: AddBranchData
): Promise<{ success: boolean; error?: string; branch?: Branch }> {
  try {
    // Company creation requires 'companies' permission, HQ/branch requires 'branches'
    if (data.type === "company") {
      await authorizeAction("companies", "can_create");
    } else {
      await authorizeAction("branches", "can_create");
    }

    // Code is required and must be unique within its scope
    const code = data.code?.trim();
    if (!code) {
      return { success: false, error: "Code is required" };
    }
    const parentForScope = data.type !== "company" ? data.parentId : null;
    if (await findCodeConflict(data.type, code, parentForScope)) {
      return {
        success: false,
        error:
          data.type === "company"
            ? `Company code "${code}" is already in use`
            : `Branch code "${code}" is already in use within this company`,
      };
    }

    const city = data.city?.trim();
    if (city && (await findAreaConflict(data.type, city, parentForScope))) {
      return {
        success: false,
        error:
          data.type === "company"
            ? `A company with area "${city}" already exists`
            : `A branch with area "${city}" already exists in this company`,
      };
    }

    // HQ: only 1 per company
    if (data.type === "hq" && data.parentId) {
      const { count } = await supabaseAdmin
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", data.parentId)
        .eq("type", "hq")
        .is("deleted_at", null);

      if (count && count > 0) {
        return { success: false, error: "This company already has an HQ" };
      }
    }

    const result = await createBranch({
      name: data.name,
      type: data.type,
      code: data.code,
      parent_id: data.type !== "company" ? data.parentId : null,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email,
      bank_name: data.bankName,
      bank_account: data.bankAccount,
      website: data.type === "company" ? data.website : null,
      logo_url: data.type === "company" ? data.logoUrl : null,
      registration_number: data.type === "company" ? data.registrationNumber : null,
    });

    if (!result) {
      return { success: false, error: "Failed to create entry" };
    }

    revalidatePath("/branches");
    revalidateTag("dashboard", "max");
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
    // Admin can edit their own company; super_admin uses companies permission
    if (data.type === "company") {
      try {
        await authorizeAction("companies", "can_edit");
      } catch {
        // Fall back to branches edit permission (allows admin to edit own company)
        await authorizeAction("branches", "can_edit");
      }
    } else {
      await authorizeAction("branches", "can_edit");
    }

    const code = data.code?.trim();
    if (!code) {
      return { success: false, error: "Code is required" };
    }
    const parentForScope = data.type !== "company" ? data.parentId : null;
    if (await findCodeConflict(data.type, code, parentForScope, branchId)) {
      return {
        success: false,
        error:
          data.type === "company"
            ? `Company code "${code}" is already in use`
            : `Branch code "${code}" is already in use within this company`,
      };
    }

    const city = data.city?.trim();
    if (city && (await findAreaConflict(data.type, city, parentForScope, branchId))) {
      return {
        success: false,
        error:
          data.type === "company"
            ? `A company with area "${city}" already exists`
            : `A branch with area "${city}" already exists in this company`,
      };
    }

    const result = await updateBranch(branchId, {
      name: data.name,
      type: data.type,
      code: data.code,
      parent_id: data.type !== "company" ? data.parentId : null,
      address: data.address,
      city: data.city,
      phone: data.phone,
      email: data.email,
      bank_name: data.bankName,
      bank_account: data.bankAccount,
      website: data.type === "company" ? data.website : null,
      logo_url: data.type === "company" ? data.logoUrl : null,
      registration_number: data.type === "company" ? data.registrationNumber : null,
    });

    if (!result) {
      return { success: false, error: "Failed to update entry" };
    }

    revalidatePath("/branches");
    revalidateTag("dashboard", "max");
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
  branchId: string,
  branchType: BranchType
): Promise<{ success: boolean; error?: string }> {
  try {
    if (branchType === "company") {
      await authorizeAction("companies", "can_delete");

      // Check if company has active children (HQ or branches)
      const { count } = await supabaseAdmin
        .from("branches")
        .select("id", { count: "exact", head: true })
        .eq("parent_id", branchId)
        .is("deleted_at", null);

      if (count && count > 0) {
        return {
          success: false,
          error: "Cannot delete company that has active HQ or branches. Remove them first.",
        };
      }
    } else {
      await authorizeAction("branches", "can_delete");
    }

    const result = await softDeleteBranch(branchId);

    if (!result) {
      return { success: false, error: "Failed to delete entry" };
    }

    revalidatePath("/branches");
    revalidateTag("dashboard", "max");
    return { success: true };
  } catch (error) {
    console.error("Error deleting branch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
