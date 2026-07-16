import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminDb } from "@/lib/firebaseAdmin";
import { readPlan } from "@/lib/requireCredits";

export const runtime = "nodejs";

// Per-plan connected-channel limits (free = 1). Paid plans effectively unlimited.
const CHANNEL_LIMIT: Record<string, number> = { free: 1, starter: 999, creator: 999, plus: 999 };

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
].join(" ");

const APP_URL = (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000").replace(/\/$/, "");

// The client calls this with its Firebase ID token; we return the Google consent URL.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GOOGLE_OAUTH_CLIENT_ID) {
    return NextResponse.json({ error: "YouTube connect is not configured." }, { status: 503 });
  }

  // Enforce the per-plan connected-channel limit (free = 1).
  try {
    const plan = await readPlan(uid);
    const limit = CHANNEL_LIMIT[plan] ?? 1;
    const snap = await adminDb().collection("users").doc(uid).collection("youtube_channels").get();
    if (snap.size >= limit) {
      return NextResponse.json(
        { error: `Your plan allows ${limit} connected channel${limit === 1 ? "" : "s"}. Upgrade to connect more.`, code: "UPGRADE_REQUIRED" },
        { status: 403 }
      );
    }
  } catch (err) {
    console.error("[youtube/connect] channel-limit check failed:", err);
    // Fail open, don't block connecting over a Firestore hiccup.
  }

  const redirectUri = `${APP_URL}/api/youtube/callback`;
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: YOUTUBE_SCOPES,
    access_type: "offline",
    // Always show the picker so the user chooses WHICH channel to connect.
    prompt: "select_account consent",
    include_granted_scopes: "true",
    state: uid, // verified Firebase uid
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.json({ url: authUrl });
}
