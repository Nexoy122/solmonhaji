// ── Discord OAuth config (server-side only) ────────────────────────────────────
// "Login with Discord" → authorize (identify + guilds.join) → add to server + role.

export const discordConfig = {
  clientId: process.env.DISCORD_CLIENT_ID?.trim() || "",
  clientSecret: process.env.DISCORD_CLIENT_SECRET?.trim() || "",
  botToken: process.env.DISCORD_BOT_TOKEN?.trim() || "",
  guildId: process.env.DISCORD_GUILD_ID?.trim() || "",
  roleId: process.env.DISCORD_JOIN_ROLE_ID?.trim() || "",
  redirectUri: process.env.DISCORD_REDIRECT_URI?.trim() || "",
};

export const DISCORD_SCOPES = ["identify", "guilds.join"];

export function isDiscordConfigured(): boolean {
  const c = discordConfig;
  return Boolean(c.clientId && c.clientSecret && c.botToken && c.guildId && c.redirectUri);
}

/** Build the Discord authorize URL the user is sent to. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: discordConfig.clientId,
    redirect_uri: discordConfig.redirectUri,
    response_type: "code",
    scope: DISCORD_SCOPES.join(" "),
    state,
    prompt: "consent",
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

// ── Lightweight signed session (no DB) ──────────────────────────────────────────
// We store the user's public Discord info in a signed, httpOnly cookie so the
// navbar can show their avatar + name. Signed with the client secret (HMAC) so it
// can't be forged.
import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "ns_discord_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface DiscordSession {
  id: string;
  username: string;
  avatar: string | null; // avatar hash
}

function sign(payload: string): string {
  return createHmac("sha256", discordConfig.clientSecret || "fallback-secret")
    .update(payload)
    .digest("base64url");
}

/** Encode session → "base64(json).signature" */
export function encodeSession(s: DiscordSession): string {
  const body = Buffer.from(JSON.stringify(s)).toString("base64url");
  return `${body}.${sign(body)}`;
}

/** Verify + decode the cookie value. Returns null if tampered/invalid. */
export function decodeSession(value: string | undefined): DiscordSession | null {
  if (!value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    if (
      sig.length !== expected.length ||
      !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    ) {
      return null;
    }
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DiscordSession;
  } catch {
    return null;
  }
}

/** Build the avatar CDN URL (or a default). */
export function avatarUrl(s: DiscordSession): string {
  if (s.avatar) {
    const ext = s.avatar.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/avatars/${s.id}/${s.avatar}.${ext}?size=64`;
  }
  // default avatar (new-username scheme: (id >> 22) % 6)
  const idx = Number((BigInt(s.id) >> BigInt(22)) % BigInt(6));
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}
