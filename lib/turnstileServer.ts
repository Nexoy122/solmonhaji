import "server-only";

const SECRET = process.env.TURNSTILE_SECRET_KEY?.trim();
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Verify a Cloudflare Turnstile token server-side.
 * - If Turnstile isn't configured, returns true (don't block).
 * - On Cloudflare outage, fails OPEN (returns true) so real users aren't locked out.
 * - Returns false only when Turnstile explicitly rejects the token.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  if (!SECRET) return true; // not configured → skip
  if (!token) return false; // configured but no token → reject

  try {
    const form = new URLSearchParams();
    form.append("secret", SECRET);
    form.append("response", token);
    if (ip) form.append("remoteip", ip.split(",")[0].trim());

    const res = await fetch(VERIFY_URL, { method: "POST", body: form });
    const data = (await res.json()) as { success: boolean };
    return Boolean(data.success);
  } catch (err) {
    console.error("[turnstile] verify outage, failing open:", err);
    return true; // fail open on outage
  }
}
