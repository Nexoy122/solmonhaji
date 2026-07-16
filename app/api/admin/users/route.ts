import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/admin";
import { listAccess, accessStats } from "@/lib/access";

export const runtime = "nodejs";

// GET /api/admin/users?status=pending -> access rows + counts.
// Role is checked server-side, so a regular user gets 403 even hitting this
// endpoint directly.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(uid, "staff");
  if (!guard.ok) return guard.response;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  try {
    const [rows, stats] = await Promise.all([listAccess(status, 200), accessStats()]);
    return NextResponse.json({ users: rows, stats, role: guard.role });
  } catch (err) {
    console.error("[admin/users] failed:", err);
    return NextResponse.json({ error: "Couldn't load users." }, { status: 500 });
  }
}
