import "server-only";
import { NextResponse } from "next/server";
import { spendCredits, getBalance, InsufficientCreditsError, creditsConfigured } from "@/lib/credits";
import { CREDIT_COST, type CreditAction } from "@/lib/creditCosts";

// Charge a user for an action. Call AFTER verifying the request (you already
// have the uid). Returns { ok: true, balance } on success, or { ok: false,
// response } with a ready-to-return 402 when the user can't afford it.
//
// Usage in a route:
//   const uid = await verifyRequest(...);
//   const charge = await chargeCredits(uid, "script");
//   if (!charge.ok) return charge.response;
//   ... do the work ...
//
// If credits aren't configured (no DATABASE_URL), it fails OPEN (allows the
// action) so the app still works in dev without Postgres.
export async function chargeCredits(
  uid: string,
  action: CreditAction,
  referenceId?: string
): Promise<{ ok: true; balance: number } | { ok: false; response: NextResponse }> {
  const cost = CREDIT_COST[action];
  if (!creditsConfigured() || cost <= 0) {
    return { ok: true, balance: -1 };
  }
  const ref = referenceId ?? `${action}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  try {
    const balance = await spendCredits(uid, cost, ref);
    return { ok: true, balance };
  } catch (e) {
    if (e instanceof InsufficientCreditsError) {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Not enough credits. This action costs ${e.needed}, you have ${e.have}.`,
            code: "INSUFFICIENT_CREDITS",
            needed: e.needed,
            have: e.have,
          },
          { status: 402 }
        ),
      };
    }
    // On any other error, fail open (don't block a paying user over a DB hiccup)
    // but log it.
    console.error("[credits] charge failed:", (e as Error).message);
    return { ok: true, balance: -1 };
  }
}

// Read a user's balance for the UI (safe, read-only).
export async function readBalance(uid: string) {
  if (!creditsConfigured()) return { balance: -1, plan: "free" };
  try {
    return await getBalance(uid);
  } catch (e) {
    console.error("[credits] readBalance failed:", (e as Error).message);
    return { balance: -1, plan: "free" };
  }
}
