// Billplz post-payment redirect target.
//
// After the parent finishes (or cancels) on Billplz's hosted checkout, Billplz
// sends them back here as a GET. We re-fetch the bill from Billplz to verify
// the actual state (don't trust browser params), then redirect the parent to
// /parent with a `?paid=` or `?failed=` query so the portal shows the right
// toast.
//
// The webhook does the actual DB mutation; this route is purely UX.

import { NextRequest, NextResponse } from "next/server";
import { fetchBill } from "@/lib/billplz";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const billId = url.searchParams.get("billplz[id]") ?? url.searchParams.get("id");

  if (!billId) {
    return NextResponse.redirect(new URL("/parent?paymentError=missing_id", req.url));
  }

  let paid = false;
  let paymentId: string | null = null;
  try {
    const bill = await fetchBill(billId);
    paid = bill.state === "paid" && bill.paid;
    paymentId = bill.reference_1 ?? null;
  } catch (e) {
    console.error("[Billplz redirect] fetchBill failed", e);
    return NextResponse.redirect(new URL("/parent?paymentError=lookup_failed", req.url));
  }

  const target = new URL("/parent", req.url);
  if (paid && paymentId) {
    target.searchParams.set("paid", paymentId);
  } else if (paymentId) {
    target.searchParams.set("failed", paymentId);
  } else {
    target.searchParams.set("paymentError", "no_payment_id");
  }
  return NextResponse.redirect(target);
}
