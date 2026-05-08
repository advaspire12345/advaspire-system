// Client-safe marketplace constants. Kept in a separate file (with NO Supabase
// imports) so client components can import these without dragging supabaseAdmin
// — and its server-only env vars — into the browser bundle.

export const ADCOIN_PER_RM = 333;

export function rmCostFor(adcoinAmount: number): number {
  return adcoinAmount / ADCOIN_PER_RM;
}

export function adcoinFor(rmAmount: number): number {
  return Math.round(rmAmount * ADCOIN_PER_RM);
}
