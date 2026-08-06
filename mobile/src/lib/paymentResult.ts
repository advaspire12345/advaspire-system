// Hand-off channel between the in-app Billplz checkout (payment/checkout.tsx) and
// the payment detail screen (payment/[id].tsx). The checkout WebView detects the
// final outcome from our redirect URL (…/parent?paid=<id> or ?failed=<id>) and
// stashes it here right before popping back; the payment screen reads it on focus
// and shows a success/failure message. A module-level slot is enough — only one
// checkout is ever in flight, and the payment screen consumes it immediately.

export type PaymentResult = { id: string | null; status: "paid" | "failed" };

let pending: PaymentResult | null = null;

export function setPaymentResult(result: PaymentResult): void {
  pending = result;
}

/** Read and clear the last checkout outcome (returns null if none). */
export function takePaymentResult(): PaymentResult | null {
  const r = pending;
  pending = null;
  return r;
}
