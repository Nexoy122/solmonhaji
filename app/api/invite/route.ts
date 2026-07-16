import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminAuth } from "@/lib/firebaseAdmin";
import { peekInvite, acceptInvite } from "@/lib/roles";
import { setStatus } from "@/lib/access";

export const runtime = "nodejs";

// GET /api/invite?token=... -> preview an invite (who it's for, what role).
// No auth: the visitor may not have an account yet, and the token is the proof.
// Returns only what the accept page needs to render, never a role grant.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
  try {
    const inv = await peekInvite(token);
    if (!inv) return NextResponse.json({ error: "This invite is invalid, already used, or expired." }, { status: 400 });
    return NextResponse.json(inv);
  } catch (err) {
    // A bad/unknown token must read as "invalid invite", not as a server fault:
    // a 500 here leaks that something broke and gives the page nothing useful.
    console.error("[invite] peek failed:", err);
    return NextResponse.json({ error: "This invite is invalid, already used, or expired." }, { status: 400 });
  }
}

// POST /api/invite -> accept, for the signed-in user.
// Body: { token }
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Sign in to accept this invite.", code: "AUTH_REQUIRED" }, { status: 401 });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  // The invite is bound to an email; acceptInvite refuses a mismatched account.
  let email: string | null = null;
  try {
    email = (await adminAuth().getUser(uid)).email ?? null;
  } catch { /* handled below */ }

  const res = await acceptInvite(body.token, uid, email);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });

  // Any invited person skips the waitlist: being invited IS the approval.
  try {
    await setStatus(uid, "active", "invite");
  } catch (err) {
    console.error("[invite] activate failed:", err);
  }

  return NextResponse.json({ ok: true, role: res.role, kind: res.kind });
}
