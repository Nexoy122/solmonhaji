import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { readBalance } from "@/lib/requireCredits";
import { recentTransactions, creditsConfigured } from "@/lib/credits";
import { getUserSubscription } from "@/lib/subscription";

export const runtime = "nodejs";

// GET /api/settings/billing -> live plan, credits, and ledger history.
// Always read fresh from the DB (kept in sync by the Polar webhook); the client
// never caches this as source of truth.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [{ balance, plan }, sub] = await Promise.all([
      readBalance(uid),
      getUserSubscription(uid).catch(() => null),
    ]);

    const transactions = creditsConfigured()
      ? await recentTransactions(uid, 15).catch(() => [])
      : [];

    return NextResponse.json({
      plan,
      balance,
      status: sub?.status ?? "none",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: sub?.cancelAtPeriodEnd ?? false,
      transactions,
    });
  } catch (err) {
    console.error("[settings/billing] failed:", err);
    return NextResponse.json({ error: "Couldn't load billing info." }, { status: 500 });
  }
}
