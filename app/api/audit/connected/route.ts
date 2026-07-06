import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminDb } from "@/lib/firebaseAdmin";
import { fetchYouTubeAnalytics, refreshAccessToken } from "@/lib/youtube/analytics";

export const runtime = "nodejs";
export const maxDuration = 60;

const WORKER_URL = (process.env.AUDIT_WORKER_URL ?? "").replace(/\/$/, "");
const WORKER_SECRET = process.env.AUDIT_WORKER_SECRET ?? "";

// Connected-channel DEEP audit: fetch the user's PRIVATE analytics (retention,
// CTR, traffic sources) via their OAuth token, then start a worker audit that
// folds that real audience data into the review. This is the "deep" version.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!WORKER_URL || !WORKER_SECRET) {
    return NextResponse.json({ error: "Channel Audit isn't configured yet." }, { status: 503 });
  }

  // Resolve the user's connected channel + token.
  const col = adminDb().collection("users").doc(uid).collection("youtube_channels");
  const snap = await col.orderBy("lastSyncAt", "asc").limit(1).get();
  const chan = snap.docs[0]?.data();
  if (!chan?.ytAccessToken) {
    return NextResponse.json({ error: "Connect your YouTube channel first." }, { status: 400 });
  }

  let accessToken: string = chan.ytAccessToken;
  const ytId: string = chan.youtubeId;
  const handle: string = chan.customUrl || chan.name || ytId;

  // Refresh token if near expiry.
  if (chan.ytTokenExpiry && chan.ytTokenExpiry < Date.now() + 300_000 && chan.ytRefreshToken) {
    const refreshed = await refreshAccessToken(chan.ytRefreshToken);
    if (refreshed) {
      accessToken = refreshed.access_token;
      await col.doc(ytId).set(
        { ytAccessToken: refreshed.access_token, ytTokenExpiry: Date.now() + refreshed.expires_in * 1000 },
        { merge: true }
      );
    }
  }

  // Fetch the real private analytics (last 90 days, all content).
  let analyticsContext = "";
  try {
    const a = await fetchYouTubeAnalytics(accessToken, ytId, "ALL", 90);
    const lines: string[] = [
      `Avg view duration: ${Math.round(a.avgViewDuration)}s (${a.avgViewPercentage.toFixed(0)}% of video watched — RETENTION)`,
      `Engagement: like rate ${a.likeRate.toFixed(1)}%, comment rate ${a.commentRate.toFixed(2)}%, share rate ${a.shareRate.toFixed(2)}%, saves ${a.savesRate.toFixed(2)}%`,
      a.ctr > 0 ? `CTR (thumbnail/title): ${a.ctr.toFixed(1)}%` : `CTR: not reported by API`,
      `Subscriber conversion: ${a.subsPerThousandViews.toFixed(1)} net subs per 1,000 views (gained ${a.subscribersGained}, lost ${a.subscribersLost})`,
      `Traffic sources: ${a.browsePct.toFixed(0)}% browse/home, ${a.suggestedPct.toFixed(0)}% suggested, ${a.searchPct.toFixed(0)}% search, ${a.externalPct.toFixed(0)}% external`,
      `Audience loyalty: ${a.subscriberViewPct.toFixed(0)}% of views from subscribers`,
      `Momentum (recent vs prior 28d): views ${a.viewsMomentum >= 0 ? "+" : ""}${a.viewsMomentum.toFixed(0)}%, watch time ${a.watchTimeMomentum >= 0 ? "+" : ""}${a.watchTimeMomentum.toFixed(0)}%`,
    ];
    analyticsContext = lines.join("\n");
  } catch (err) {
    console.warn("[audit/connected] analytics fetch failed:", (err as Error).message);
    // Continue without analytics — still runs the video-ML audit.
  }

  try {
    const res = await fetch(`${WORKER_URL}/audit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-worker-secret": WORKER_SECRET },
      body: JSON.stringify({ channel: handle, analyticsContext: analyticsContext || undefined }),
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "Couldn't start the audit." }, { status: res.status });
    return NextResponse.json({ jobId: data.jobId, deep: !!analyticsContext });
  } catch {
    return NextResponse.json({ error: "Audit service is unavailable. Please try again." }, { status: 502 });
  }
}
