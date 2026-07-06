import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { adminAuth, adminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { welcomeEmail } from "@/lib/emailTemplates";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5; // wrong-code guesses before the code is burned

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM?.trim() || "NicheSpy <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const emailKey = (email: string) =>
  crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Signup is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { email, code } = (body ?? {}) as { email?: string; code?: string };
  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  if (!code || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const cleanEmail = email.toLowerCase().trim();
  const db = adminDb();
  const ref = db.collection("pending_signups").doc(emailKey(cleanEmail));
  const snap = await ref.get();
  const pending = snap.data();

  if (!pending) {
    return NextResponse.json(
      { error: "No pending signup found. Please start again." },
      { status: 404 }
    );
  }

  // ── Expiry ──
  if (Date.now() > pending.expiresAt) {
    await ref.delete().catch(() => {});
    return NextResponse.json({ error: "Code expired. Please request a new one." }, { status: 410 });
  }

  // ── Attempt limit ──
  if ((pending.attempts ?? 0) >= MAX_ATTEMPTS) {
    await ref.delete().catch(() => {});
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please start again." },
      { status: 429 }
    );
  }

  // ── Code check (constant-time compare on hashes) ──
  const provided = sha256(code);
  const expected: string = pending.codeHash;
  const ok =
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

  if (!ok) {
    await ref.set({ attempts: (pending.attempts ?? 0) + 1 }, { merge: true });
    const left = MAX_ATTEMPTS - ((pending.attempts ?? 0) + 1);
    return NextResponse.json(
      { error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code." },
      { status: 400 }
    );
  }

  // ── Code correct → create the Firebase Auth account ──
  let uid: string;
  try {
    const userRecord = await adminAuth().createUser({
      email: cleanEmail,
      password: pending.password,
      displayName: pending.name,
      emailVerified: true, // verified via our code flow
    });
    uid = userRecord.uid;
  } catch (err: unknown) {
    const codeStr = (err as { code?: string })?.code ?? "";
    if (codeStr === "auth/email-already-exists") {
      await ref.delete().catch(() => {});
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }
    console.error("[verify-code] createUser failed:", err);
    return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
  }

  // ── Clean up the pending doc (removes the stored password) ──
  await ref.delete().catch(() => {});

  // ── Welcome email (best-effort) ──
  if (resend) {
    try {
      const { subject, html, text } = welcomeEmail(pending.name);
      await resend.emails.send({ from: FROM, to: cleanEmail, subject, html, text });
    } catch (err) {
      console.error("[verify-code] welcome email failed:", err);
    }
  }

  // ── Return a custom token so the client can sign in immediately ──
  let token: string | null = null;
  try {
    token = await adminAuth().createCustomToken(uid);
  } catch (err) {
    console.error("[verify-code] custom token failed:", err);
  }

  return NextResponse.json({ ok: true, token });
}
