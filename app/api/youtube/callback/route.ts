import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const YT_SCOPE = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");

const toInt = (v: unknown): number => {
  const n = parseInt(String(v ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const uid = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const back = (q: string) => NextResponse.redirect(`${APP_URL}/dashboard/trust-score?${q}`);

  if (oauthError) {
    console.error("[youtube/callback] OAuth error:", oauthError);
    return back(`yt_error=${encodeURIComponent(oauthError)}`);
  }
  if (!code || !uid) {
    return back("yt_error=access_denied");
  }

  try {
    // Validate the uid (state) corresponds to a real Firebase user.
    try {
      await adminAuth().getUser(uid);
    } catch {
      return back("yt_error=session");
    }

    // 1. Exchange the authorization code for tokens.
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
        client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
        redirect_uri: `${APP_URL}/api/youtube/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) {
      console.error("[youtube/callback] token exchange failed:", await tokenRes.text());
      return back("yt_error=token_failed");
    }
    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;
    if (!access_token) return back("yt_error=token_failed");
    const tokenExpiry = Date.now() + (expires_in ?? 3600) * 1000;

    // 2. Fetch the channel(s) this Google account owns.
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings&mine=true",
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!channelRes.ok) {
      console.error("[youtube/callback] channel fetch failed:", await channelRes.text());
      return back("yt_error=no_channel");
    }
    const channelData = await channelRes.json();
    if (!channelData.items?.length) return back("yt_error=no_channel");

    // 3. Store each channel + its tokens under the user's Firestore subcollection.
    const db = adminDb();
    const col = db.collection("users").doc(uid).collection("youtube_channels");
    let connectedId = "";
    for (const ch of channelData.items) {
      const subs = toInt(ch.statistics?.subscriberCount);
      const thumb =
        ch.snippet?.thumbnails?.high?.url ??
        ch.snippet?.thumbnails?.medium?.url ??
        ch.snippet?.thumbnails?.default?.url ??
        null;

      await col.doc(ch.id).set(
        {
          youtubeId: ch.id,
          name: ch.snippet?.title ?? "Untitled channel",
          description: ch.snippet?.description ?? null,
          thumbnailUrl: thumb,
          bannerUrl: ch.brandingSettings?.image?.bannerExternalUrl ?? null,
          customUrl: ch.snippet?.customUrl ?? null,
          country: ch.snippet?.country ?? null,
          publishedAt: ch.snippet?.publishedAt ?? null,
          subscriberCount: subs,
          viewCount: toInt(ch.statistics?.viewCount),
          videoCount: toInt(ch.statistics?.videoCount),
          isVerified: subs >= 100000,
          ytAccessToken: access_token,
          ...(refresh_token ? { ytRefreshToken: refresh_token } : {}),
          ytTokenExpiry: tokenExpiry,
          ytScope: YT_SCOPE,
          lastSyncAt: Date.now(),
        },
        { merge: true }
      );
      if (!connectedId) connectedId = ch.id;
    }

    return back(`yt_connected=1`);
  } catch (error) {
    console.error("[youtube/callback] error:", error);
    return back("yt_error=server");
  }
}
