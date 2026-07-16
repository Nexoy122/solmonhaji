import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

// GET /api/admin/whoami -> 200 { role } for staff+, 401/403 otherwise.
// A pure role probe: returns no user data, so it's safe to call before the
// admin UI mounts and useless to anyone who isn't already an admin.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(uid, "staff");
  if (!guard.ok) return guard.response;
  return NextResponse.json({ role: guard.role });
}
