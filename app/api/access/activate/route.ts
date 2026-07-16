import { NextRequest, NextResponse } from "next/server";
import { activateWithToken } from "@/lib/access";

export const runtime = "nodejs";

// POST /api/access/activate  Body: { token }
//
// Deliberately does NOT require a session: the token itself is the proof, so the
// link works even if the user opens it in a browser where they're signed out.
// The token is random (192-bit), single-use, expiring, and only its sha256 is
// stored, so a database leak can't mint activations.
export async function POST(req: NextRequest) {
  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 200) {
    return NextResponse.json({ error: "Invalid activation link.", reason: "invalid" }, { status: 400 });
  }

  try {
    const res = await activateWithToken(token);
    if (!res.ok) {
      const msg =
        res.reason === "expired"
          ? "This activation link has already been used or has expired."
          : "This activation link isn't valid.";
      return NextResponse.json({ error: msg, reason: res.reason }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[access/activate] failed:", err);
    return NextResponse.json({ error: "Couldn't activate. Please try again." }, { status: 500 });
  }
}
