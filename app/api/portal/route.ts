import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { polar, polarConfigured } from "@/lib/polar";

export async function POST(req: NextRequest) {
  if (!polarConfigured()) {
    return NextResponse.json({ error: "Payments aren't configured yet." }, { status: 503 });
  }

  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const origin = req.nextUrl.origin;

  try {
    const session = await polar.customerSessions.create({
      externalCustomerId: uid,
      returnUrl: `${origin}/dashboard/plans`,
    });
    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (err) {
    console.error("Polar customer portal error:", err);
    return NextResponse.json(
      { error: "No active subscription found for this account." },
      { status: 404 }
    );
  }
}
