import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { requireAdmin, logAdminAction, clientIp } from "@/lib/admin";
import { grantCredits, getBalance, creditsConfigured } from "@/lib/credits";

export const runtime = "nodejs";

// Sanity cap. A typo like 100000 instead of 1000 is a lot easier to make than
// it is to undo, so refuse absurd amounts rather than quietly granting them.
const MAX_GRANT = 100_000;

// POST /api/admin/credits
// Body: { email, amount, reason }
//
// Grants credits to a user found by email. Admin-only, requires a reason, and
// every grant is written to both the credit ledger and the admin audit log
// (admin-panel spec s.5: "adjust credits (with mandatory reason)").
export async function POST(req: NextRequest) {
  const adminUid = await verifyRequest(req.headers.get("authorization"));
  const guard = await requireAdmin(adminUid, "admin");
  if (!guard.ok) return guard.response;

  if (!creditsConfigured()) {
    return NextResponse.json({ error: "Credits aren't configured (no database)." }, { status: 503 });
  }

  let body: { email?: string; amount?: unknown; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const amount = Math.floor(Number(body.amount));
  const reason = (body.reason ?? "").trim();

  if (!email) return NextResponse.json({ error: "An email is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount === 0) {
    return NextResponse.json({ error: "Enter a credit amount." }, { status: 400 });
  }
  if (amount < 0) {
    return NextResponse.json({ error: "Amount must be positive." }, { status: 400 });
  }
  if (amount > MAX_GRANT) {
    return NextResponse.json({ error: `That's over the ${MAX_GRANT.toLocaleString()} limit per grant.` }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  // Resolve the email to a real account. We never create one here: granting
  // credits to a typo'd address would silently vanish.
  let uid: string;
  try {
    uid = (await adminAuth().getUserByEmail(email)).uid;
  } catch {
    return NextResponse.json(
      { error: `No account found for ${email}. They need to sign up first.` },
      { status: 404 }
    );
  }

  try {
    // Unique reference so the ledger shows each grant separately and a repeated
    // click can't be mistaken for the same idempotent grant.
    const ref = `admin:${adminUid}:${Date.now()}`;
    await grantCredits(uid, amount, "bonus", ref);
    const { balance } = await getBalance(uid);

    await logAdminAction(
      adminUid!, "credits.granted", "user", uid,
      { email, amount, reason, balance_after: balance },
      clientIp(req.headers)
    );

    return NextResponse.json({ ok: true, email, amount, balance });
  } catch (err) {
    console.error("[admin/credits] grant failed:", err);
    return NextResponse.json({ error: "Couldn't grant the credits." }, { status: 500 });
  }
}
