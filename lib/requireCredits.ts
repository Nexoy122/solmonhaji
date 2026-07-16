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

const PAID_PLANS = new Set(["starter", "creator", "plus"]);

// Read a user's plan (from the credits ledger, the same source the client
// derives isPaid from). Falls back to "free" on any error.
export async function readPlan(uid: string): Promise<string> {
  if (!creditsConfigured()) return "free";
  try {
    const { plan } = await getBalance(uid);
    return plan || "free";
  } catch (e) {
    console.error("[credits] readPlan failed:", (e as Error).message);
    return "free";
  }
}

// True when the user is on any paid plan. When credits aren't configured
// (dev without Postgres), fails OPEN → treats everyone as paid so the app works.
export async function isPaidUser(uid: string): Promise<boolean> {
  if (!creditsConfigured()) return true;
  return PAID_PLANS.has(await readPlan(uid));
}

// A ready-to-return 403 for a paid-only feature.
export function paidFeatureResponse(feature = "This feature") {
  return NextResponse.json(
    { error: `${feature} is available on paid plans.`, code: "UPGRADE_REQUIRED" },
    { status: 403 }
  );
}
