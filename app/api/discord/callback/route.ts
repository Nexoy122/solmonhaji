import { NextRequest, NextResponse } from "next/server";
import { discordConfig, isDiscordConfigured } from "@/lib/discord";

export const runtime = "nodejs";

const API = "https://discord.com/api/v10";

function done(req: NextRequest, status: "success" | "exists" | "error", detail?: string) {
  const url = new URL("/discord/done", req.nextUrl.origin);
  url.searchParams.set("status", status);
  if (detail) url.searchParams.set("reason", detail);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  if (!isDiscordConfigured()) return done(req, "error", "not_configured");

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("discord_oauth_state")?.value;

  // CSRF check
  if (!code || !state || !cookieState || state !== cookieState) {
    return done(req, "error", "invalid_state");
  }

  try {
    // 1. Exchange the code for an access token
    const tokenRes = await fetch(`${API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: discordConfig.clientId,
        client_secret: discordConfig.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: discordConfig.redirectUri,
      }),
    });
    if (!tokenRes.ok) return done(req, "error", "token_failed");
    const token = (await tokenRes.json()) as { access_token: string };

    // 2. Identify the user
    const userRes = await fetch(`${API}/users/@me`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) return done(req, "error", "user_failed");
    const user = (await userRes.json()) as { id: string };

    // 3. Add the user to the guild with the role (bot token + guilds.join scope).
    //    PUT returns 201 if added, 204 if already a member.
    const joinRes = await fetch(`${API}/guilds/${discordConfig.guildId}/members/${user.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bot ${discordConfig.botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: token.access_token,
        roles: discordConfig.roleId ? [discordConfig.roleId] : [],
      }),
    });

    if (joinRes.status === 201) {
      // newly added (role applied via body)
      const res = done(req, "success");
      res.cookies.delete("discord_oauth_state");
      return res;
    }

    if (joinRes.status === 204) {
      // already a member — ensure they still get the role
      if (discordConfig.roleId) {
        await fetch(
          `${API}/guilds/${discordConfig.guildId}/members/${user.id}/roles/${discordConfig.roleId}`,
          { method: "PUT", headers: { Authorization: `Bot ${discordConfig.botToken}` } }
        );
      }
      const res = done(req, "exists");
      res.cookies.delete("discord_oauth_state");
      return res;
    }

    console.error("[discord callback] join failed:", joinRes.status, await joinRes.text());
    return done(req, "error", "join_failed");
  } catch (err) {
    console.error("[discord callback] error:", err);
    return done(req, "error", "exception");
  }
}
