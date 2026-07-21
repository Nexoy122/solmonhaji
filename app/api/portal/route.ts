import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { polar, polarConfigured } from "@/lib/polar";

export const runtime = "nodejs";

// POST /api/portal -> a Polar customer-portal session URL.
// This is where "Manage subscription" sends the user: invoices, payment method,
// cancellation. The customer is matched by their Firebase UID (externalId).
export async function POST(req: NextRequest) {
  if (!polarConfigured()) {
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 503 });
  }

  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const session = await polar.customerSessions.create({
      externalCustomerId: uid,
    });
    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (err) {
    console.error("[portal] Polar error:", err);
    // Most common cause: this account has no Polar customer record yet, i.e.
    // they've never checked out. Say so plainly.
    return NextResponse.json(
      { error: "No billing account found yet. This appears after your first purchase." },
      { status: 404 }
    );
  }
}
