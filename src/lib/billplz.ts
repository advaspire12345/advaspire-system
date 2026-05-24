// Billplz API client.
//
// Defaults to sandbox (https://www.billplz-sandbox.com). For production set
// BILLPLZ_BASE_URL=https://www.billplz.com.
//
// Required env vars:
//   BILLPLZ_API_KEY            — basic-auth user (no password)
//   BILLPLZ_X_SIGNATURE_KEY    — webhook signing secret
//   BILLPLZ_COLLECTION_ID      — collection that bills are created under
//   BILLPLZ_BASE_URL           — optional, defaults to sandbox

import { createHmac, timingSafeEqual } from "node:crypto";

const BASE_URL = process.env.BILLPLZ_BASE_URL ?? "https://www.billplz-sandbox.com";

function authHeader(): string {
  const key = process.env.BILLPLZ_API_KEY;
  if (!key) throw new Error("BILLPLZ_API_KEY is not set");
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

export interface CreateBillInput {
  name: string;
  email: string;
  amountCents: number; // Billplz takes amount in cents
  description: string;
  redirectUrl: string;
  callbackUrl: string;
  reference1?: string; // we use this for paymentId
  mobile?: string;
}

export interface BillplzBill {
  id: string;
  url: string;          // hosted checkout URL — redirect parent here
  state: "paid" | "due" | "deleted";
  paid: boolean;
  paid_at: string | null;
  paid_amount: number | null;
  amount: number;
  email: string;
  name: string;
  reference_1: string | null;
  reference_2: string | null;
  transaction_id: string | null;
  transaction_status: string | null;
}

/** Create a one-shot bill. Returns the bill object including hosted URL. */
export async function createBill(input: CreateBillInput): Promise<BillplzBill> {
  const collectionId = process.env.BILLPLZ_COLLECTION_ID;
  if (!collectionId) throw new Error("BILLPLZ_COLLECTION_ID is not set");

  const body = new URLSearchParams({
    collection_id: collectionId,
    email: input.email,
    name: input.name,
    amount: String(input.amountCents),
    description: input.description.slice(0, 200),
    callback_url: input.callbackUrl,
    redirect_url: input.redirectUrl,
  });
  if (input.reference1) body.set("reference_1", input.reference1);
  if (input.mobile) body.set("mobile", input.mobile);

  const res = await fetch(`${BASE_URL}/api/v3/bills`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Billplz createBill failed: ${res.status} ${text}`);
  }
  return (await res.json()) as BillplzBill;
}

/** Look up a bill by id — used by the redirect handler to verify state. */
export async function fetchBill(billId: string): Promise<BillplzBill> {
  const res = await fetch(`${BASE_URL}/api/v3/bills/${encodeURIComponent(billId)}`, {
    headers: { Authorization: authHeader() },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Billplz fetchBill failed: ${res.status} ${text}`);
  }
  return (await res.json()) as BillplzBill;
}

/**
 * Verify a Billplz webhook payload's HMAC-SHA256 signature.
 *
 * Billplz signs by concatenating sorted `key=value` pairs (excluding the
 * `x_signature` field) joined with `|`, then HMAC-SHA256 with the X-Signature
 * key.
 */
export function verifyWebhookSignature(
  payload: Record<string, string>,
  receivedSignature: string,
): boolean {
  const key = process.env.BILLPLZ_X_SIGNATURE_KEY;
  if (!key) throw new Error("BILLPLZ_X_SIGNATURE_KEY is not set");
  if (!receivedSignature) return false;

  const sortedKeys = Object.keys(payload)
    .filter((k) => k !== "x_signature")
    .sort();
  const source = sortedKeys.map((k) => `${k}${payload[k]}`).join("|");

  const computed = createHmac("sha256", key).update(source).digest("hex");
  const a = Buffer.from(computed);
  const b = Buffer.from(receivedSignature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
