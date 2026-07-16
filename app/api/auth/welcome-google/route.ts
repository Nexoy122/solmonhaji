import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { welcomeEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM?.trim() || "NicheSpy <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

// Fires the welcome email for a Google sign-in, but only ONCE per user.
// Google auth happens client-side (signInWithPopup) and never touches the
// email/password signup flow, so those users otherwise never get welcomed.
// Idempotency: we record a marker in `welcomed_users/{uid}` and only send if
// it doesn't exist yet, so repeat logins never re-send.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  let name: string | undefined;
  try {
    const decoded = await adminAuth().verifyIdToken(authHeader.slice(7).trim());
    uid = decoded.uid;
    email = decoded.email;
    name = decoded.name || (decoded.email ? decoded.email.split("@")[0] : undefined);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  if (!email) return NextResponse.json({ ok: true, sent: false, reason: "no-email" });

  const marker = adminDb().collection("welcomed_users").doc(uid);

  // Atomically claim the "welcomed" marker, if it already exists, this user has
  // been welcomed before, so we do nothing (prevents duplicate emails on relogin
  // and across concurrent requests).
  try {
    const already = await marker.get();
    if (already.exists) return NextResponse.json({ ok: true, sent: false, reason: "already-welcomed" });
    await marker.create({ at: Date.now(), email, via: "google" });
  } catch {
    // create() throws if the doc was created concurrently → already welcomed.
    return NextResponse.json({ ok: true, sent: false, reason: "already-welcomed" });
  }

  if (!resend) return NextResponse.json({ ok: true, sent: false, reason: "email-not-configured" });

  try {
    const { subject, html, text } = welcomeEmail(name);
    await resend.emails.send({ from: FROM, to: email, subject, html, text });
    return NextResponse.json({ ok: true, sent: true });
  } catch (err) {
    console.error("[welcome-google] send failed:", err);
    // Roll back the marker so a later attempt can retry the email.
    await marker.delete().catch(() => {});
    return NextResponse.json({ ok: true, sent: false, reason: "send-failed" });
  }
}
