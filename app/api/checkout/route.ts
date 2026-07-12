import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { polar, polarConfigured, PLAN_PRODUCT_IDS, type PlanId } from "@/lib/polar";

export async function POST(req: NextRequest) {
  if (!polarConfigured()) {
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 503 });
  }

  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let plan: PlanId;
  try {
    const body = await req.json();
    plan = body.plan;
  } catch {
    return NextResponse.json({ error: "Missing plan" }, { status: 400 });
  }

  const productId = PLAN_PRODUCT_IDS[plan];
  if (!productId) {
    return NextResponse.json({ error: `No Polar product configured for "${plan}"` }, { status: 400 });
  }

  const user = await adminAuth().getUser(uid);
  const origin = req.nextUrl.origin;

  try {
    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email || undefined,
      externalCustomerId: uid,
      successUrl: `${origin}/dashboard/plans?checkout=success`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Polar checkout error:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 500 });
  }
}
