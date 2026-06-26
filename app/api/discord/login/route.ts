import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthorizeUrl, isDiscordConfigured } from "@/lib/discord";

export const runtime = "nodejs";

// Kicks off the OAuth flow: sets a CSRF state cookie, redirects to Discord.
export async function GET() {
  if (!isDiscordConfigured()) {
    return NextResponse.json({ error: "Discord login not configured" }, { status: 503 });
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(buildAuthorizeUrl(state));
  res.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 min
  });
  return res;
}
