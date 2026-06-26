import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const apiKey = process.env.RESEND_API_KEY;
// Until vixo.live is verified in Resend, you can leave EMAIL_FROM unset and it
// falls back to Resend's shared test sender so you can try it immediately.
const FROM = process.env.EMAIL_FROM?.trim() || "NicheSpy <onboarding@resend.dev>";

// Absolute URL to the logo for email clients. Set NEXT_PUBLIC_SITE_URL to your
// deployed domain so the favicon loads in inboxes.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/$/, "");
const LOGO_URL = SITE_URL && !SITE_URL.includes("localhost") ? `${SITE_URL}/favicon.webp` : "";

const resend = apiKey ? new Resend(apiKey) : null;

// Discord bot notification endpoint (separate service). Best-effort.
const BOT_NOTIFY_URL = process.env.BOT_NOTIFY_URL?.trim();
const BOT_NOTIFY_SECRET = process.env.BOT_NOTIFY_SECRET?.trim();

function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Ping the Discord bot so a new-signup embed is posted. Never throws. */
async function notifyDiscordBot(payload: {
  email: string;
  source?: string;
  medium?: string;
  campaign?: string;
}) {
  if (!BOT_NOTIFY_URL || !BOT_NOTIFY_SECRET) return;
  try {
    const url = BOT_NOTIFY_URL.replace(/\/$/, "") + "/notify";
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notify-secret": BOT_NOTIFY_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("[notify-bot] failed:", err);
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, source, medium, campaign } = (body ?? {}) as {
    email?: string;
    source?: string;
    medium?: string;
    campaign?: string;
  };
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Fire the Discord notification regardless of email config (best-effort).
  await notifyDiscordBot({ email, source, medium, campaign });

  // Email is optional — if Resend isn't configured, the signup still succeeded.
  if (!resend) {
    return NextResponse.json({ ok: true, emailed: false, reason: "not_configured" });
  }

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "You're on the NicheSpy waitlist",
      html: WELCOME_HTML,
      text: WELCOME_TEXT,
    });
    return NextResponse.json({ ok: true, emailed: true });
  } catch (err) {
    console.error("[send-welcome] failed:", err);
    // Don't surface a hard error — the signup already succeeded in Firestore.
    return NextResponse.json({ ok: true, emailed: false, reason: "send_failed" });
  }
}

const WELCOME_TEXT = `You're on the NicheSpy waitlist

Thanks for joining NicheSpy — the tool that turns hours of YouTube competitor
research into a single 60-second scan. No more tab-hopping, no more spreadsheets.

Here's what NicheSpy does:
- Competitor Finder — every rival channel in your niche, instantly
- Outlier Detector — the videos the algorithm is rewarding right now
- Gap Finder — trending topics nobody has covered yet
- Viral Alerts — know the moment a competitor starts gaining traction

What happens next:
We're rolling out early access in batches. You'll get an email the moment your
spot opens, and waitlist members get the best launch pricing.

Want updates sooner? Join the community on Discord: https://discord.gg/7AYW4693XQ

NicheSpy — built for creators who want the edge.`;

// Inline SVG icons (email-safe). Stroke uses the brand blue.
const BLUE = "#0FA5E9";
const ic = (paths: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BLUE}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;

const FEATURES = [
  { t: "Competitor Finder", d: "Every rival channel in your niche, instantly", icon: ic('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>') },
  { t: "Outlier Detector", d: "The videos the algorithm is rewarding right now", icon: ic('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>') },
  { t: "Gap Finder", d: "Trending topics nobody has covered yet", icon: ic('<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2h6c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"/>') },
  { t: "Viral Alerts", d: "Know the moment a competitor gains traction", icon: ic('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/>') },
  { t: "Trust Score", d: "A 0–100 health score for any channel — coming soon", icon: ic('<path d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z"/><path d="M9 12l2 2 4-4"/>') },
];

// Discord glyph for the CTA button
const DISCORD_ICON = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style="vertical-align:middle;"><path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02C1.9 9.4 1.15 13.36 1.52 17.28c0 .02.01.04.03.05a16.2 16.2 0 0 0 4.85 2.45.06.06 0 0 0 .07-.02c.37-.51.7-1.05.99-1.61.02-.04 0-.08-.04-.09-.53-.2-1.03-.44-1.51-.72-.04-.02-.04-.08-.01-.11.1-.08.2-.16.3-.23a.06.06 0 0 1 .06-.01c3.17 1.45 6.6 1.45 9.73 0a.06.06 0 0 1 .07.01c.1.08.2.16.3.24.04.02.03.09-.01.11-.48.28-.98.52-1.51.72-.04.01-.05.05-.04.09.3.56.63 1.1.99 1.61a.06.06 0 0 0 .07.02 16.15 16.15 0 0 0 4.86-2.45.05.05 0 0 0 .02-.05c.44-4.53-.73-8.46-3.1-11.93a.04.04 0 0 0-.02-.02zM8.52 14.91c-.95 0-1.74-.88-1.74-1.96s.77-1.96 1.74-1.96c.98 0 1.76.89 1.74 1.96 0 1.08-.77 1.96-1.74 1.96zm6.97 0c-.95 0-1.74-.88-1.74-1.96s.77-1.96 1.74-1.96c.98 0 1.76.89 1.74 1.96 0 1.08-.76 1.96-1.74 1.96z"/></svg>`;

const WELCOME_HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0b10;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">You're on the NicheSpy waitlist — here's what it does and what happens next.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b10;padding:0;font-family:Arial,Helvetica,sans-serif;">
    <tr><td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#101218;border:1px solid #1e212b;border-radius:18px;overflow:hidden;">

        <!-- hero: logo + headline + subtitle, centered -->
        <tr><td align="center" style="padding:48px 40px 8px;">
          ${
            LOGO_URL
              ? `<img src="${LOGO_URL}" width="46" height="46" alt="NicheSpy" style="display:inline-block;border-radius:12px;" />`
              : `<span style="display:inline-block;width:46px;height:46px;background:#0FA5E9;border-radius:12px;text-align:center;line-height:46px;">
                   <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" style="vertical-align:middle;"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>
                 </span>`
          }
        </td></tr>

        <tr><td align="center" style="padding:24px 40px 0;">
          <h1 style="font-size:30px;font-weight:600;color:#ffffff;margin:0;letter-spacing:-0.4px;line-height:1.25;">Welcome to NicheSpy</h1>
        </td></tr>

        <tr><td align="center" style="padding:14px 52px 0;">
          <p style="font-size:16px;line-height:1.7;color:#9aa0ad;margin:0;">
            You're officially on the waitlist. NicheSpy turns hours of YouTube
            competitor research into a single 60-second scan.
          </p>
        </td></tr>

        <!-- feature list: numbered, icon + title + description -->
        <tr><td style="padding:40px 40px 8px;">
          <p style="font-size:15px;color:#9aa0ad;margin:0 0 26px;">Here's what you'll unlock when access opens:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${FEATURES.map((f, i) => `
            <tr><td style="padding:0 0 ${i < FEATURES.length - 1 ? "24px" : "0"};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                <td style="width:26px;vertical-align:top;padding-top:7px;">
                  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td width="8" height="8" style="background:#0FA5E9;border-radius:50%;font-size:0;line-height:0;">&nbsp;</td>
                  </tr></table>
                </td>
                <td style="vertical-align:top;">
                  <div style="font-size:16px;color:#ffffff;margin-bottom:3px;">${f.t}</div>
                  <div style="font-size:14px;color:#8b919d;line-height:1.6;">${f.d}</div>
                </td>
              </tr></table>
            </td></tr>`).join("")}
          </table>
        </td></tr>

        <!-- what happens next -->
        <tr><td style="padding:32px 40px 0;">
          <div style="border-top:1px solid #1e212b;padding-top:28px;">
            <p style="font-size:14px;line-height:1.7;color:#9aa0ad;margin:0;">
              We're rolling out early access in batches — you'll get an email the moment your
              spot opens, and waitlist members lock in the best launch pricing.
            </p>
          </div>
        </td></tr>

        <!-- CTA, centered -->
        <tr><td align="center" style="padding:28px 40px 8px;">
          <a href="https://discord.gg/7AYW4693XQ" style="display:inline-block;background:#0FA5E9;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:10px;font-weight:500;font-size:15px;">
            Join the community on Discord
          </a>
          <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">
            We share progress and answer questions there — come say hi.
          </p>
        </td></tr>

        <!-- footer -->
        <tr><td align="center" style="padding:36px 40px 44px;">
          <div style="font-size:12px;color:#5b606c;line-height:1.7;">
            You're receiving this because you joined the NicheSpy waitlist.<br>
            NicheSpy — built for creators who want the edge.
          </div>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;
