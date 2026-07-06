import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { adminAuth, adminDb, adminConfigured } from "@/lib/firebaseAdmin";
import { verificationCodeEmail } from "@/lib/emailTemplates";
import { verifyTurnstile } from "@/lib/turnstileServer";

export const runtime = "nodejs";

// ── Config ────────────────────────────────────────────────────────────────────
const CODE_TTL_MIN = 10; // code valid for 10 minutes
const RESEND_COOLDOWN_SEC = 60; // min seconds between code emails to same address
const MAX_SENDS_PER_HOUR = 5; // per email, anti-spam
const MAX_SIGNUPS_PER_IP_HOUR = 10; // per IP, anti-abuse

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM?.trim() || "NicheSpy <onboarding@resend.dev>";
const resend = apiKey ? new Resend(apiKey) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Deterministic doc id from email (also avoids storing raw email as the key).
const emailKey = (email: string) =>
  crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : null)?.trim() || req.headers.get("x-real-ip") || "unknown";
}

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

  const { name, email, password, turnstileToken } = (body ?? {}) as {
    name?: string;
    email?: string;
    password?: string;
    turnstileToken?: string;
  };

  // ── Bot protection (Turnstile) ──
  const ip = clientIp(req);
  const human = await verifyTurnstile(turnstileToken, ip === "unknown" ? undefined : ip);
  if (!human) {
    return NextResponse.json({ error: "Bot check failed. Please try again." }, { status: 403 });
  }

  // ── Validation ──
  if (!name || name.trim().length < 2)
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!email || !EMAIL_RE.test(email))
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  if (!password || password.length < 6)
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  if (password.length > 200)
    return NextResponse.json({ error: "Password is too long." }, { status: 400 });

  const cleanEmail = email.toLowerCase().trim();
  const db = adminDb();
  const now = Date.now();

  // ── Already a real account? ──
  try {
    await adminAuth().getUserByEmail(cleanEmail);
    return NextResponse.json(
      { error: "An account with this email already exists. Try logging in." },
      { status: 409 }
    );
  } catch {
    // not found → good, continue
  }

  // ── Per-IP rate limit ──
  try {
    const ip = clientIp(req);
    if (ip !== "unknown") {
      const ipRef = db.collection("auth_ip_limits").doc(sha256(ip));
      const ipSnap = await ipRef.get();
      const ipData = ipSnap.data();
      const windowStart = ipData?.windowStart ?? 0;
      let count = ipData?.count ?? 0;
      if (now - windowStart > 60 * 60 * 1000) {
        count = 0; // window expired, reset
      }
      if (count >= MAX_SIGNUPS_PER_IP_HOUR) {
        return NextResponse.json(
          { error: "Too many signup attempts. Please try again later." },
          { status: 429 }
        );
      }
      await ipRef.set(
        { windowStart: now - windowStart > 60 * 60 * 1000 ? now : windowStart, count: count + 1 },
        { merge: true }
      );
    }
  } catch (err) {
    console.error("[send-code] ip limit check failed:", err);
    // non-fatal — continue
  }

  // ── Per-email rate limit + resend cooldown ──
  const ref = db.collection("pending_signups").doc(emailKey(cleanEmail));
  const snap = await ref.get();
  const existing = snap.data();

  if (existing) {
    if (existing.lastSentAt && now - existing.lastSentAt < RESEND_COOLDOWN_SEC * 1000) {
      const wait = Math.ceil((RESEND_COOLDOWN_SEC * 1000 - (now - existing.lastSentAt)) / 1000);
      return NextResponse.json(
        { error: `Please wait ${wait}s before requesting another code.` },
        { status: 429 }
      );
    }
    const sendWindowStart = existing.sendWindowStart ?? 0;
    const sendCount = now - sendWindowStart > 60 * 60 * 1000 ? 0 : existing.sendCount ?? 0;
    if (sendCount >= MAX_SENDS_PER_HOUR) {
      return NextResponse.json(
        { error: "Too many codes requested. Please try again in an hour." },
        { status: 429 }
      );
    }
  }

  // ── Generate + store code (hashed) ──
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = now + CODE_TTL_MIN * 60 * 1000;
  const sendWindowStart =
    existing?.sendWindowStart && now - existing.sendWindowStart <= 60 * 60 * 1000
      ? existing.sendWindowStart
      : now;
  const sendCount =
    (existing?.sendWindowStart && now - existing.sendWindowStart <= 60 * 60 * 1000
      ? existing.sendCount ?? 0
      : 0) + 1;

  await ref.set({
    name: name.trim(),
    // Password kept only transiently to create the account after verification.
    password, // server-side only; doc is deleted on success/expiry
    codeHash: sha256(code),
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    sendWindowStart,
    sendCount,
    createdAt: existing?.createdAt ?? now,
  });

  // ── Email the code ──
  if (!resend) {
    console.warn("[send-code] Resend not configured — code:", code);
    return NextResponse.json({ ok: true, emailed: false, reason: "not_configured" });
  }
  try {
    const { subject, html, text } = verificationCodeEmail(code, CODE_TTL_MIN);
    await resend.emails.send({ from: FROM, to: cleanEmail, subject, html, text });
    return NextResponse.json({ ok: true, emailed: true, expiresInMin: CODE_TTL_MIN });
  } catch (err) {
    console.error("[send-code] email send failed:", err);
    return NextResponse.json(
      { error: "Couldn't send the verification email. Please try again." },
      { status: 502 }
    );
  }
}
