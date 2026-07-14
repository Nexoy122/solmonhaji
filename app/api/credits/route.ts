import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { readBalance } from "@/lib/requireCredits";

export const runtime = "nodejs";

// GET /api/credits → the logged-in user's current credit balance + plan.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { balance, plan } = await readBalance(uid);
  return NextResponse.json({ balance, plan });
}
