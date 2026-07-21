import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { polar, polarConfigured, PLAN_PRODUCT_IDS, type PlanId } from "@/lib/polar";

export const runtime = "nodejs";

// POST /api/checkout  Body: { plan: "starter" | "creator" | "plus" }
// Creates a Polar checkout session and returns its URL.
//
// The customer is keyed by Firebase UID via externalCustomerId, which is what
// lets the webhook match a payment back to the right account. The client only
// picks WHICH of our products to buy; the price lives in Polar, so a tampered
// request can't discount itself.
export async function POST(req: NextRequest) {
  if (!polarConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet. Please try again shortly." },
      { status: 503 }
    );
  }

  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { plan?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const plan = body.plan as PlanId;
  const productId = PLAN_PRODUCT_IDS[plan];
  if (!productId) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  // Attach the account's email so Polar can pre-fill it and send receipts.
  let email: string | undefined;
  try {
    email = (await adminAuth().getUser(uid)).email ?? undefined;
  } catch { /* non-fatal */ }

  // Behind nginx, req.nextUrl.origin is the INTERNAL origin (localhost:3000), so
  // Polar would redirect the buyer to localhost after paying. Use the public
  // site URL, and only fall back to the request origin in local dev.
  const base = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");

  try {
    const session = await polar.checkouts.create({
      products: [productId],
      // The webhook reads this to credit the right account.
      externalCustomerId: uid,
      customerEmail: email,
      successUrl: `${base}/dashboard/plans?checkout=success`,
      metadata: { uid, plan },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Polar error:", err);
    return NextResponse.json(
      { error: "Couldn't start checkout. Please try again." },
      { status: 502 }
    );
  }
}
