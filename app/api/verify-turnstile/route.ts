import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const SECRET = process.env.TURNSTILE_SECRET_KEY?.trim();
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verifies a Cloudflare Turnstile token server-side.
 * The browser must pass a valid token before its waitlist signup is allowed.
 */
export async function POST(req: NextRequest) {
  // If Turnstile isn't configured, don't block signups, just pass through.
  if (!SECRET) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let token: string | undefined;
  try {
    token = (await req.json())?.token;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  if (!token || typeof token !== "string") {
    return NextResponse.json({ ok: false, error: "missing_token" }, { status: 400 });
  }

  try {
    const ip = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "";
    const form = new URLSearchParams();
    form.append("secret", SECRET);
    form.append("response", token);
    if (ip) form.append("remoteip", ip.split(",")[0].trim());

    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };

    if (!data.success) {
      return NextResponse.json(
        { ok: false, error: "verification_failed", codes: data["error-codes"] },
        { status: 403 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verify-turnstile] failed:", err);
    // On a verification outage, fail OPEN so real users aren't locked out.
    return NextResponse.json({ ok: true, degraded: true });
  }
}
