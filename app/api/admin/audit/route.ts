import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { requireAdmin, recentAuditLog } from "@/lib/admin";

export const runtime = "nodejs";

// GET /api/admin/audit -> the append-only admin action log.
// Read-only by design: there is no write/delete endpoint for this table.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(uid, "staff");
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json({ entries: await recentAuditLog(150) });
  } catch (err) {
    console.error("[admin/audit] failed:", err);
    return NextResponse.json({ error: "Couldn't load the audit log." }, { status: 500 });
  }
}
