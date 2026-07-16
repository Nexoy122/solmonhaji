import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { getAccess, WAITLIST_ENABLED } from "@/lib/access";
import { resolveRole } from "@/lib/admin";
import { sendWaitlistEmail } from "@/lib/emails";

export const runtime = "nodejs";

// GET /api/access -> the caller's access status (+ waitlist position).
// Creates the row on first call, grandfathering anyone who predates the gate.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Pull email/name from Firebase so the admin table has something readable.
    let email: string | null = null;
    let name: string | null = null;
    try {
      const rec = await adminAuth().getUser(uid);
      email = rec.email ?? null;
      name = rec.displayName ?? null;
    } catch { /* non-fatal */ }

    const row = await getAccess(uid, { email, name });

    // First time we've queued this person: send the "you're on the list"
    // receipt. `created` is only true on the insert, so this can't re-send.
    if (row.created && row.status === "pending") {
      void sendWaitlistEmail(uid, row.position).catch((e) =>
        console.error("[access] waitlist email failed:", e)
      );
    }

    return NextResponse.json({
      status: row.status,
      position: row.position,
      waitlistEnabled: WAITLIST_ENABLED,
      role: await resolveRole(uid),
    });
  } catch (err) {
    console.error("[access] read failed:", err);
    // Fail open: a DB hiccup must not lock people out of a product they paid for.
    return NextResponse.json({ status: "active", position: null, waitlistEnabled: WAITLIST_ENABLED, role: await resolveRole(uid) });
  }
}
