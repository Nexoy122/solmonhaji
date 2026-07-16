import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// POST /api/settings/sessions -> "sign out everywhere".
// Revokes every refresh token for the user, so all other devices are forced to
// re-authenticate. The caller's own session dies too and the client signs out.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await adminAuth().revokeRefreshTokens(uid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[settings/sessions] revoke failed:", err);
    return NextResponse.json({ error: "Couldn't sign out other sessions." }, { status: 500 });
  }
}
