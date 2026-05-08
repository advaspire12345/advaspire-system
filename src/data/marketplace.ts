import { supabaseAdmin } from "@/db";
import type { AdcoinTopupRequest, AdcoinTopupRequestStatus, TopupInvoiceSnapshot } from "@/db/schema";

// Re-export the client-safe constants so existing server callers (action,
// data layer) don't need to update their imports. New CLIENT components must
// import from "@/data/marketplace-constants" directly.
export { ADCOIN_PER_RM, rmCostFor } from "./marketplace-constants";

export interface TopupRequestRow {
  id: string;
  branchRequest: string;       // requesting branch / company display name
  branchId: string | null;
  topUpAmount: number;          // adcoin amount
  rmAmount: number;
  receiptUrl: string | null;
  date: string;                 // created_at
  pic: string;                  // requester name
  picId: string;
  status: AdcoinTopupRequestStatus;
  invoiceNumber: string | null;
  invoiceSnapshot: TopupInvoiceSnapshot | null;
}

/** Insert a new top-up request (created by company_admin). */
export async function createTopupRequest(input: {
  requesterId: string;
  branchId: string | null;
  adcoinAmount: number;
  rmAmount: number;
  receiptUrl: string | null;
  notes?: string | null;
}): Promise<AdcoinTopupRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("adcoin_topup_requests")
    .insert({
      requester_id: input.requesterId,
      branch_id: input.branchId,
      adcoin_amount: input.adcoinAmount,
      rm_amount: input.rmAmount,
      receipt_url: input.receiptUrl,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[createTopupRequest] failed:", error);
    return null;
  }
  return data as AdcoinTopupRequest;
}

/** Fetch a single request by ID. */
export async function getTopupRequestById(id: string): Promise<AdcoinTopupRequest | null> {
  const { data, error } = await supabaseAdmin
    .from("adcoin_topup_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    console.error("[getTopupRequestById] failed:", error);
    return null;
  }
  return data as AdcoinTopupRequest;
}

/**
 * Fetch top-up requests for the table view (super_admin / group_admin).
 * - super_admin: all requests across all companies
 * - group_admin / company_admin: requests scoped to their company (branch_id resolves to a company)
 *
 * `useCityName=true` displays the branch's city (area) in the "Branch Request"
 * column instead of the branch's name. group_admin sees city; super_admin sees name.
 */
export async function getTopupRequestsForTable(opts: {
  scope: "all" | "company";
  companyId?: string | null;
  useCityName?: boolean;
}): Promise<TopupRequestRow[]> {
  // Step 1: fetch the topup rows alone (no joins). Defensive against missing
  // optional columns — if the migration adding invoice_* hasn't been applied
  // yet, fall back to selecting only the base columns.
  let topupRows: any[] = [];
  {
    const fullSelect =
      "id, requester_id, branch_id, adcoin_amount, rm_amount, receipt_url, status, created_at, invoice_number, invoice_snapshot";
    const { data, error } = await supabaseAdmin
      .from("adcoin_topup_requests")
      .select(fullSelect)
      .order("created_at", { ascending: false });
    if (error) {
      // Likely cause: invoice_number / invoice_snapshot columns don't exist
      // yet (migration 026 not applied). Retry with the base columns so the
      // page is still usable.
      console.warn("[getTopupRequestsForTable] full select failed, retrying base:", error.message);
      const { data: baseData, error: baseError } = await supabaseAdmin
        .from("adcoin_topup_requests")
        .select("id, requester_id, branch_id, adcoin_amount, rm_amount, receipt_url, status, created_at")
        .order("created_at", { ascending: false });
      if (baseError) {
        console.error("[getTopupRequestsForTable] base select also failed:", baseError);
        return [];
      }
      topupRows = baseData ?? [];
    } else {
      topupRows = data ?? [];
    }
  }

  if (topupRows.length === 0) return [];

  // Step 2: batch-fetch related users and branches in parallel
  const requesterIds = Array.from(new Set(topupRows.map((r) => r.requester_id).filter(Boolean)));
  const branchIds = Array.from(new Set(topupRows.map((r) => r.branch_id).filter(Boolean) as string[]));

  const [usersRes, branchesRes] = await Promise.all([
    requesterIds.length > 0
      ? supabaseAdmin.from("users").select("id, name").in("id", requesterIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
    branchIds.length > 0
      ? supabaseAdmin.from("branches").select("id, name, city, type, parent_id").in("id", branchIds)
      : Promise.resolve({ data: [] as { id: string; name: string; city: string | null; type: string; parent_id: string | null }[], error: null }),
  ]);

  const userMap = new Map<string, { id: string; name: string }>();
  for (const u of usersRes.data ?? []) userMap.set(u.id, u);
  const branchMap = new Map<string, { id: string; name: string; city: string | null; type: string; parent_id: string | null }>();
  for (const b of branchesRes.data ?? []) branchMap.set(b.id, b);

  // Step 3: filter by company scope
  let filtered = topupRows;
  if (opts.scope === "company" && opts.companyId) {
    filtered = topupRows.filter((r) => {
      const b = r.branch_id ? branchMap.get(r.branch_id) : null;
      if (!b) return false;
      if (b.type === "company" && b.id === opts.companyId) return true;
      return b.parent_id === opts.companyId;
    });
  }

  // Step 4: stitch
  return filtered.map((r) => {
    const branch = r.branch_id ? branchMap.get(r.branch_id) : null;
    const user = r.requester_id ? userMap.get(r.requester_id) : null;
    return {
      id: r.id,
      branchRequest: opts.useCityName
        ? (branch?.city || branch?.name || "—")
        : (branch?.name ?? "—"),
      branchId: r.branch_id,
      topUpAmount: r.adcoin_amount,
      rmAmount: Number(r.rm_amount),
      receiptUrl: r.receipt_url,
      date: r.created_at,
      pic: user?.name ?? "Unknown",
      picId: r.requester_id,
      status: r.status,
      invoiceNumber: r.invoice_number ?? null,
      invoiceSnapshot: (r.invoice_snapshot ?? null) as TopupInvoiceSnapshot | null,
    };
  });
}

/**
 * Mark a request approved + create the linked adcoin_transactions row + freeze
 * an invoice snapshot. Called from approveTopupRequestAction after the password
 * is verified.
 */
export async function approveTopupRequest(input: {
  requestId: string;
  approverId: string;
  adcoinAmount: number;
  rmAmount: number;
  receiverId: string;
}): Promise<{ success: boolean; transactionId?: string; invoiceNumber?: string; error?: string }> {
  // Insert the actual adcoin transaction
  const { data: tx, error: txError } = await supabaseAdmin
    .from("adcoin_transactions")
    .insert({
      sender_id: input.approverId,
      receiver_id: input.receiverId,
      type: "transfer",
      amount: input.adcoinAmount,
      description: "Marketplace top-up approval",
      verified_by: input.approverId,
    })
    .select("id")
    .single();
  if (txError) {
    console.error("[approveTopupRequest] tx insert failed:", txError);
    return { success: false, error: "Failed to record adcoin transaction" };
  }

  // Bump the receiver's adcoin balance
  const { data: receiver } = await supabaseAdmin
    .from("users")
    .select("adcoin_balance, name, phone, branch_id")
    .eq("id", input.receiverId)
    .single();
  if (receiver) {
    await supabaseAdmin
      .from("users")
      .update({ adcoin_balance: (receiver.adcoin_balance ?? 0) + input.adcoinAmount })
      .eq("id", input.receiverId);
  }

  // Build the frozen invoice snapshot (matches payment-record's pattern).
  // The receiver's branch + parent company info is captured in case the
  // branch / company is edited later — invoice should never change.
  let branchInfo: TopupInvoiceSnapshot["branch"] = null;
  if (receiver?.branch_id) {
    const { data: branch } = await supabaseAdmin
      .from("branches")
      .select("name, address, phone, email, bank_name, bank_account, parent_id")
      .eq("id", receiver.branch_id)
      .single();
    if (branch) {
      let companyName: string | null = null;
      if (branch.parent_id) {
        const { data: parent } = await supabaseAdmin
          .from("branches")
          .select("name")
          .eq("id", branch.parent_id)
          .single();
        companyName = parent?.name ?? null;
      } else {
        // The branch IS the company (type='company')
        companyName = branch.name;
      }
      branchInfo = {
        name: branch.name,
        companyName,
        address: branch.address,
        phone: branch.phone,
        email: branch.email,
        bankName: branch.bank_name,
        bankAccount: branch.bank_account,
      };
    }
  }

  const invoiceNumber = generateTopupInvoiceNumber();
  const snapshot: TopupInvoiceSnapshot = {
    invoiceNumber,
    date: new Date().toISOString(),
    billToName: receiver?.name ?? "Receiver",
    billToAddress: branchInfo?.address ?? null,
    billToContact: receiver?.phone ?? null,
    branch: branchInfo,
    items: [
      {
        code: "TOPUP",
        product: "Top Up Adcoin",
        qty: 1,
        rate: input.rmAmount,
      },
    ],
    total: input.rmAmount,
  };

  // Mark the request approved + link the transaction + persist invoice
  const { error: updateError } = await supabaseAdmin
    .from("adcoin_topup_requests")
    .update({
      status: "approved",
      reviewed_by: input.approverId,
      reviewed_at: new Date().toISOString(),
      approved_transaction_id: tx.id,
      invoice_number: invoiceNumber,
      invoice_snapshot: snapshot as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .eq("status", "pending");

  if (updateError) {
    console.error("[approveTopupRequest] update failed:", updateError);
    return { success: false, error: "Approval recorded as transaction but request status update failed" };
  }

  return { success: true, transactionId: tx.id, invoiceNumber };
}

/** Format: TOP-YYMMDD-{4 random digits}. Lightweight — uniqueness collisions
 *  are extremely unlikely and benign (the invoice_number is just a label). */
function generateTopupInvoiceNumber(): string {
  const now = new Date();
  const yymmdd =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `TOP-${yymmdd}-${random}`;
}

export async function rejectTopupRequest(input: {
  requestId: string;
  reviewerId: string;
  notes?: string;
}): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("adcoin_topup_requests")
    .update({
      status: "rejected",
      reviewed_by: input.reviewerId,
      reviewed_at: new Date().toISOString(),
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId)
    .eq("status", "pending");
  return !error;
}
