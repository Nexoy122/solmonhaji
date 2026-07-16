import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { markAccountDeleted } from "@/lib/settings";
import { getUserSubscription, setUserSubscription } from "@/lib/subscription";
import { polar, polarConfigured } from "@/lib/polar";

export const runtime = "nodejs";

// How recently the user must have proven who they are. Firebase puts auth_time
// in the ID token; we require a fresh re-authentication so a stolen, long-lived
// session can't delete an account.
const REAUTH_MAX_AGE_SEC = 5 * 60;

// POST /api/settings/delete-account
// Body: { confirm: "DELETE" }
//
// Requires: a valid token, a recent re-auth, and the exact confirmation text.
// Cancels any active Polar subscription, soft-deletes with a grace period, and
// revokes all sessions. The Firebase user is disabled (not destroyed) so the
// account can be restored within the grace window.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const uid = await verifyRequest(authHeader);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { confirm?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // 1. Typed confirmation must match exactly.
  if (body.confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }

  // 2. Re-authentication must be recent (the client re-auths, then retries).
  try {
    const token = authHeader!.replace(/^Bearer\s+/i, "");
    const decoded = await adminAuth().verifyIdToken(token, true);
    const authAge = Math.floor(Date.now() / 1000) - Number(decoded.auth_time ?? 0);
    if (!decoded.auth_time || authAge > REAUTH_MAX_AGE_SEC) {
      return NextResponse.json(
        { error: "Please confirm your identity again.", code: "REAUTH_REQUIRED" },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Please confirm your identity again.", code: "REAUTH_REQUIRED" },
      { status: 401 }
    );
  }

  // 3. Cancel any live Polar subscription BEFORE tearing the account down, so we
  //    never leave a customer being billed for an account they deleted.
  try {
    const sub = await getUserSubscription(uid);
    if (polarConfigured() && sub.polarSubscriptionId && sub.status === "active") {
      await polar.subscriptions.revoke({ id: sub.polarSubscriptionId });
      await setUserSubscription(uid, { plan: "free", status: "canceled" });
    }
  } catch (err) {
    // Billing must not be left running silently: refuse rather than delete an
    // account whose subscription we couldn't cancel.
    console.error("[delete-account] subscription cancel failed:", err);
    return NextResponse.json(
      { error: "Couldn't cancel your subscription. Please cancel in the billing portal first, or contact support." },
      { status: 502 }
    );
  }

  // 4. Soft-delete + lock the account out.
  try {
    await markAccountDeleted(uid);
    await adminAuth().updateUser(uid, { disabled: true });
    await adminAuth().revokeRefreshTokens(uid);
  } catch (err) {
    console.error("[delete-account] teardown failed:", err);
    return NextResponse.json({ error: "Couldn't delete the account. Contact support." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
