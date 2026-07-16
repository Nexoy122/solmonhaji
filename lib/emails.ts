import "server-only";
import { Resend } from "resend";
import { adminAuth } from "@/lib/firebaseAdmin";

// ── Transactional emails for early access ────────────────────────────────────
// Matches the conventions in app/api/send-welcome/route.ts.

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM?.trim() || "NicheSpy <onboarding@resend.dev>";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");
const LOGO_URL = SITE_URL && !SITE_URL.includes("localhost") ? `${SITE_URL}/favicon.webp` : "";
const resend = apiKey ? new Resend(apiKey) : null;

const RED = "#FF0033";
const INK = "#121212";

// Shared Bauhaus-ish shell so the emails look like the product.
function shell(title: string, body: string, cta?: { label: string; href: string }): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F0F0F0;font-family:'Segoe UI',system-ui,-apple-system,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0F0F0;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:3px solid ${INK};">
        <tr><td style="padding:24px 28px;border-bottom:3px solid ${INK};">
          ${LOGO_URL ? `<img src="${LOGO_URL}" width="34" height="34" alt="NicheSpy" style="vertical-align:middle;border-radius:8px;">` : ""}
          <span style="vertical-align:middle;margin-left:10px;font-size:20px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;color:${INK};">NicheSpy</span>
        </td></tr>
        <tr><td style="padding:32px 28px;">
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.1;font-weight:900;text-transform:uppercase;letter-spacing:-0.8px;color:${INK};">${title}</h1>
          <div style="font-size:15px;line-height:1.65;color:#3A3A3A;">${body}</div>
          ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:26px;background:${RED};color:#fff;text-decoration:none;padding:14px 26px;font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1px;border:3px solid ${INK};">${cta.label}</a>` : ""}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:3px solid ${INK};font-size:12px;color:#8A8A8A;">
          You're receiving this because you signed up for NicheSpy.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function emailFor(uid: string): Promise<{ email: string; name: string } | null> {
  try {
    const rec = await adminAuth().getUser(uid);
    if (!rec.email) return null;
    return { email: rec.email, name: rec.displayName?.split(" ")[0] ?? "there" };
  } catch {
    return null;
  }
}

// Receipt sent right after signup. Not the invite, just "you're on the list".
export async function sendWaitlistEmail(uid: string, position: number | null): Promise<void> {
  if (!resend) return;
  const to = await emailFor(uid);
  if (!to) return;
  await resend.emails.send({
    from: FROM,
    to: to.email,
    subject: "You're on the NicheSpy waitlist",
    html: shell(
      "You're on the list",
      `<p style="margin:0 0 14px;">Hi ${to.name}, thanks for signing up.</p>
       <p style="margin:0 0 14px;">We're rolling out early access in small batches so everyone gets a fast, reliable experience.
       ${position ? `You're currently <strong style="color:${INK};">#${position.toLocaleString()}</strong> in line.` : ""}</p>
       <p style="margin:0;">We'll email you the moment a spot opens up. Nothing else to do for now.</p>`
    ),
  });
}

// "You've been hired" style invite for a team role (tester/staff/admin).
// Sent to an email address, so it can't use emailFor(uid): the person may not
// even have an account yet.
export async function sendRoleInviteEmail(opts: {
  email: string;
  role: string;
  roleLabel: string;
  roleBlurb: string;
  token: string;
  note?: string | null;
}): Promise<void> {
  if (!resend) return;
  const link = `${SITE_URL}/invite?token=${encodeURIComponent(opts.token)}`;
  const isTester = opts.role === "tester";

  await resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: isTester
      ? "You're invited to test NicheSpy 🎉"
      : `You've been invited to the NicheSpy team as ${opts.roleLabel}`,
    html: shell(
      isTester ? "You're on the team" : "Congratulations",
      `<p style="margin:0 0 14px;">You've been invited to join <strong style="color:${INK};">NicheSpy</strong> as
         <strong style="color:${RED};">${opts.roleLabel}</strong>.</p>
       <div style="margin:0 0 16px;padding:14px 16px;background:#F0F0F0;border:3px solid ${INK};">
         <div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;color:#8A8A8A;">Your role</div>
         <div style="margin-top:4px;font-size:15px;font-weight:700;color:${INK};">${opts.roleLabel}</div>
         <div style="margin-top:4px;font-size:13.5px;line-height:1.55;color:#5A5A5A;">${opts.roleBlurb}</div>
       </div>
       ${opts.note ? `<p style="margin:0 0 14px;padding:12px 14px;background:#FFF9DB;border-left:4px solid ${"#F0C020"};font-size:14px;">${opts.note}</p>` : ""}
       ${isTester
          ? `<p style="margin:0 0 14px;">You'll get full access to every tool. Break things, find bugs, and tell us what's wrong, that's exactly what we need.</p>`
          : `<p style="margin:0 0 14px;">Accept below to activate your access.</p>`}
       <p style="margin:0;color:#8A8A8A;font-size:13px;">This invite is for <strong>${opts.email}</strong> and expires in 14 days.
         Sign in with that address to accept it.</p>`,
      { label: isTester ? "Accept & start testing" : "Accept invite", href: link }
    ),
  });
}

// Invite a specific person straight into early access, skipping the waitlist.
export async function sendEarlyAccessInviteEmail(opts: {
  email: string;
  token: string;
  note?: string | null;
}): Promise<void> {
  if (!resend) return;
  const link = `${SITE_URL}/invite?token=${encodeURIComponent(opts.token)}`;
  await resend.emails.send({
    from: FROM,
    to: opts.email,
    subject: "You're invited to NicheSpy early access 🚀",
    html: shell(
      "You're in",
      `<p style="margin:0 0 14px;">You've been personally invited to <strong style="color:${INK};">NicheSpy</strong> early access,
         which means you skip the waitlist entirely.</p>
       ${opts.note ? `<p style="margin:0 0 14px;padding:12px 14px;background:#FFF9DB;border-left:4px solid #F0C020;font-size:14px;">${opts.note}</p>` : ""}
       <p style="margin:0 0 14px;">Find the Shorts pulling 10 to 100 times a channel's average, break down why they popped,
         and turn them into your next script. You start with <strong style="color:${INK};">100 free credits</strong>, no card needed.</p>
       <p style="margin:0;color:#8A8A8A;font-size:13px;">This invite is for <strong>${opts.email}</strong> and expires in 14 days.</p>`,
      { label: "Claim my access", href: link }
    ),
  });
}

// The invite. Contains the one-time activation link.
export async function sendInviteEmail(uid: string, token: string): Promise<void> {
  if (!resend) return;
  const to = await emailFor(uid);
  if (!to) return;
  const link = `${SITE_URL}/activate?token=${encodeURIComponent(token)}`;
  await resend.emails.send({
    from: FROM,
    to: to.email,
    subject: "You're in: welcome to NicheSpy early access",
    html: shell(
      "You're in",
      `<p style="margin:0 0 14px;">Hi ${to.name},</p>
       <p style="margin:0 0 14px;">A spot just opened up and your account is approved. Click below to activate it and get started.</p>
       <p style="margin:0;color:#8A8A8A;font-size:13px;">This link works once and expires in 72 hours.</p>`,
      { label: "Activate my account", href: link }
    ),
  });
}
