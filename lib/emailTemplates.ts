// Branded HTML/text email templates for the auth flow.
// Polished dark theme: hero header band, brand wordmark, clear content card.

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "").replace(/\/$/, "");
const LOGO_URL = SITE_URL && !SITE_URL.includes("localhost") ? `${SITE_URL}/favicon.webp` : "";
const BLUE = "#0FA5E9";
const BLUE_DARK = "#0b8fd0";

function logoMark(size = 30): string {
  return LOGO_URL
    ? `<img src="${LOGO_URL}" width="${size}" height="${size}" alt="" style="display:inline-block;border-radius:8px;vertical-align:middle;" />`
    : `<span style="display:inline-block;width:${size}px;height:${size}px;background:${BLUE};border-radius:8px;text-align:center;line-height:${size}px;vertical-align:middle;">
         <svg width="${Math.round(size * 0.6)}" height="${Math.round(size * 0.6)}" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" style="vertical-align:middle;"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>
       </span>`;
}

// Outer shell: header wordmark band + hero + content card + footer.
function shell(opts: { hero: string; body: string; preheader: string }): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
</head>
<body style="margin:0;padding:0;background:#08080B;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#08080B;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#0F0F14;border:1px solid #1E212B;border-radius:16px;overflow:hidden;">

        <!-- header wordmark -->
        <tr><td style="padding:22px 32px;border-bottom:1px solid #1A1D26;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="padding-right:9px;">${logoMark(28)}</td>
            <td style="font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">NicheSpy</td>
          </tr></table>
        </td></tr>

        <!-- hero band -->
        ${opts.hero}

        <!-- body -->
        ${opts.body}

        <!-- footer -->
        <tr><td align="center" style="padding:26px 32px 30px;border-top:1px solid #1A1D26;">
          <p style="font-size:12px;color:#5A5F6B;margin:0;line-height:1.7;">
            © ${new Date().getFullYear()} NicheSpy · YouTube Shorts intelligence<br>
            This is an automated message — please don't reply.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Verification code email ───────────────────────────────────────────────────
export function verificationCodeEmail(code: string, expiryMinutes: number) {
  const subject = `${code} is your NicheSpy verification code`;
  const preheader = `Your code is ${code} — expires in ${expiryMinutes} minutes.`;

  const text = `Your NicheSpy verification code is: ${code}

Enter this code to finish creating your account. It expires in ${expiryMinutes} minutes.

If you didn't request this, you can safely ignore this email.

— NicheSpy`;

  const hero = `
    <tr><td style="padding:0;">
      <div style="background:linear-gradient(135deg,#0d2635 0%,#0F0F14 70%);padding:34px 32px 30px;text-align:center;">
        <div style="display:inline-block;padding:8px 14px;border:1px solid rgba(15,165,233,0.35);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1px;color:#4fc3f7;text-transform:uppercase;">Verify your email</div>
        <h1 style="font-size:25px;font-weight:700;color:#ffffff;margin:18px 0 0;letter-spacing:-0.4px;">One quick step to finish</h1>
        <p style="font-size:14.5px;line-height:1.6;color:#A7AEB8;margin:10px 0 0;">Enter the code below to create your NicheSpy account.</p>
      </div>
    </td></tr>`;

  const body = `
    <tr><td align="center" style="padding:32px 32px 6px;">
      <div style="background:#08080B;border:1px solid #2A2E3A;border-radius:12px;padding:20px 8px;">
        <div style="font-size:38px;font-weight:700;letter-spacing:14px;color:#ffffff;font-family:'Courier New',monospace;padding-left:14px;">${code}</div>
      </div>
    </td></tr>
    <tr><td align="center" style="padding:20px 40px 30px;">
      <p style="font-size:13px;color:#8B919D;margin:0;line-height:1.6;">This code expires in <strong style="color:#CDD1D9;">${expiryMinutes} minutes</strong>.<br>Didn't request it? You can safely ignore this email.</p>
    </td></tr>`;

  return { subject, html: shell({ hero, body, preheader }), text };
}

// ── Welcome email (after account created) ─────────────────────────────────────
export function welcomeEmail(name?: string) {
  const greeting = name ? `Welcome, ${name}!` : "Welcome to NicheSpy!";
  const subject = "Welcome to NicheSpy 🎉";
  const preheader = "Your account is ready — here's what you can do.";
  const dashUrl = SITE_URL ? `${SITE_URL}/dashboard` : "https://nichespy.app/dashboard";

  const features = [
    ["Explore", "Browse blowing-up Shorts channels across every niche."],
    ["Niche Researcher", "Weekly AI recaps of what's winning right now."],
    ["Script Generator", "Turn any topic into a scroll-stopping script."],
    ["Trust Score", "A 0–100 health score for any channel in seconds."],
  ];

  const text = `${greeting}

Your account is ready. NicheSpy turns hours of YouTube research into a single dashboard.

What you can do:
${features.map(([t, d]) => `- ${t} — ${d}`).join("\n")}

Open your dashboard: ${dashUrl}

— The NicheSpy team`;

  const hero = `
    <tr><td style="padding:0;">
      <div style="background:linear-gradient(135deg,#0d2635 0%,#0F0F14 70%);padding:36px 32px 32px;text-align:center;">
        <div style="display:inline-block;padding:8px 14px;border:1px solid rgba(15,165,233,0.35);border-radius:999px;font-size:11px;font-weight:700;letter-spacing:1px;color:#4fc3f7;text-transform:uppercase;">Account ready</div>
        <h1 style="font-size:27px;font-weight:700;color:#ffffff;margin:18px 0 0;letter-spacing:-0.5px;">${greeting}</h1>
        <p style="font-size:14.5px;line-height:1.65;color:#A7AEB8;margin:10px 0 0;">NicheSpy turns hours of YouTube research into a single dashboard.</p>
      </div>
    </td></tr>`;

  const body = `
    <tr><td style="padding:28px 32px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${features
          .map(
            ([t, d], i) => `<tr><td style="padding:0 0 ${i < features.length - 1 ? "14px" : "0"};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="width:26px;vertical-align:top;padding-top:3px;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="16" height="16" style="background:rgba(15,165,233,0.15);border-radius:5px;text-align:center;line-height:16px;font-size:0;">
                <span style="color:${BLUE};font-size:11px;font-weight:700;line-height:16px;">✓</span>
              </td></tr></table>
            </td>
            <td style="vertical-align:top;font-size:14px;color:#CDD1D9;line-height:1.55;"><strong style="color:#ffffff;">${t}</strong> — ${d}</td>
          </tr></table>
        </td></tr>`
          )
          .join("")}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:30px 32px 34px;">
      <a href="${dashUrl}" style="display:inline-block;background:${BLUE};color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;box-shadow:0 6px 18px rgba(15,165,233,0.28);">Open your dashboard →</a>
    </td></tr>`;

  return { subject, html: shell({ hero, body, preheader }), text };
}
