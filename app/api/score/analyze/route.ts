import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminDb } from "@/lib/firebaseAdmin";
import { fetchYouTubeAnalytics, refreshAccessToken } from "@/lib/youtube/analytics";
import { calculateScoreFromAnalytics } from "@/lib/scoring/engine";
import { chargeCredits } from "@/lib/requireCredits";

export const runtime = "nodejs";
export const maxDuration = 60;

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] ?? "0") * 3600 + parseInt(m[2] ?? "0") * 60 + parseInt(m[3] ?? "0");
}

export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    // Analyze the WHOLE channel (Shorts + long-form together), like Satura.
    const windowDays: number = [7, 28, 90].includes(Number(body.days)) ? Number(body.days) : 90;
    const youtubeId: string | undefined = body.channelId;

    // ── Manual inputs (data YouTube's API can't provide) ──
    const clampInt = (v: unknown, lo: number, hi: number): number | undefined => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : undefined;
    };
    const clampNum = (v: unknown, lo: number, hi: number): number | undefined => {
      const n = Number(v);
      return Number.isFinite(n) && n > 0 ? Math.min(hi, Math.max(lo, n)) : undefined;
    };
    const ct = body.manual?.contentType;
    const manual = {
      swipeRate: clampNum(body.manual?.swipeRate, 0, 100),
      communityStrikes: clampInt(body.manual?.communityStrikes, 0, 3),
      copyrightStrikes: clampInt(body.manual?.copyrightStrikes, 0, 3),
      contentType: (ct === "shorts" || ct === "long" || ct === "mixed") ? ct : undefined,
    } as { swipeRate?: number; communityStrikes?: number; copyrightStrikes?: number; contentType?: "shorts" | "long" | "mixed" };

    // ── Resolve which channel to analyze ──
    const col = adminDb().collection("users").doc(uid).collection("youtube_channels");
    let chanDoc;
    if (youtubeId) {
      chanDoc = await col.doc(youtubeId).get();
    } else {
      const snap = await col.orderBy("lastSyncAt", "asc").limit(1).get();
      chanDoc = snap.docs[0];
    }
    if (!chanDoc?.exists) {
      return NextResponse.json(
        { error: "No channel connected. Connect your YouTube channel first." },
        { status: 400 }
      );
    }
    const dbChannel = chanDoc.data()!;

    if (!dbChannel.ytAccessToken) {
      return NextResponse.json({ error: "Channel isn't connected for analytics. Please reconnect." }, { status: 400 });
    }

    let accessToken: string = dbChannel.ytAccessToken;
    const ytId: string = dbChannel.youtubeId;

    // ── Refresh token if near expiry ──
    if (dbChannel.ytTokenExpiry && dbChannel.ytTokenExpiry < Date.now() + 300_000) {
      if (!dbChannel.ytRefreshToken) {
        return NextResponse.json({ error: "Channel session expired. Please reconnect." }, { status: 401 });
      }
      const refreshed = await refreshAccessToken(dbChannel.ytRefreshToken);
      if (!refreshed) {
        return NextResponse.json({ error: "Failed to refresh session. Please reconnect." }, { status: 401 });
      }
      accessToken = refreshed.access_token;
      await col.doc(ytId).set(
        { ytAccessToken: refreshed.access_token, ytTokenExpiry: Date.now() + refreshed.expires_in * 1000 },
        { merge: true }
      );
    }

    // ── Refresh channel info from YouTube ──
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,brandingSettings,contentDetails&id=${ytId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!channelRes.ok) {
      return NextResponse.json({ error: "Failed to fetch channel data from YouTube." }, { status: 400 });
    }
    const channelJson = await channelRes.json();
    if (!channelJson.items?.length) {
      return NextResponse.json({ error: "Channel not found on YouTube." }, { status: 404 });
    }
    const ch = channelJson.items[0];
    const channel = {
      id: ytId,
      name: ch.snippet.title as string,
      description: (ch.snippet.description ?? "") as string,
      thumbnailUrl: (ch.snippet.thumbnails?.high?.url ?? ch.snippet.thumbnails?.default?.url ?? "") as string,
      subscriberCount: parseInt(ch.statistics.subscriberCount ?? "0"),
      viewCount: parseInt(ch.statistics.viewCount ?? "0"),
      videoCount: parseInt(ch.statistics.videoCount ?? "0"),
      publishedAt: ch.snippet.publishedAt as string,
      country: (ch.snippet.country ?? "") as string,
      customUrl: (ch.snippet.customUrl ?? "") as string,
    };

    // ── Recent videos for upload cadence ──
    const now = new Date();
    const d90 = new Date(now.getTime() - 90 * 86400000);
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const d7 = new Date(now.getTime() - 7 * 86400000);
    let videoData = {
      uploadsLast7Days: 0,
      uploadsLast30Days: 0,
      uploadsLast90Days: 0,
      daysSinceLastUpload: 999,
      avgVideoDurationSeconds: 300,
    };
    const SHORT_MAX = 60;
    let shortsCount = 0;
    let longCount = 0;
    let videoDataLoaded = false; // did we actually read the channel's videos?
    let quotaExceeded = false;

    // The channel's "uploads" playlist is the authoritative, complete, date-ordered
    // list of every upload, far more reliable than search.list (which can return
    // nothing or stale results and is quota-heavy).
    const uploadsPlaylist: string | undefined =
      ch.contentDetails?.relatedPlaylists?.uploads;

    try {
      let ids = "";
      if (uploadsPlaylist) {
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (plRes.ok) {
          const plData = await plRes.json();
          ids = (plData.items ?? [])
            .map((v: { contentDetails?: { videoId?: string } }) => v.contentDetails?.videoId)
            .filter(Boolean)
            .join(",");
        } else if (plRes.status === 403) {
          quotaExceeded = true;
        }
      }
      // Fallback to search.list only if the playlist call yielded nothing (and not a quota error).
      if (!ids && !quotaExceeded) {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${ytId}&maxResults=50&order=date&type=video`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (searchRes.ok) {
          const sData = await searchRes.json();
          ids = (sData.items ?? []).map((v: { id?: { videoId?: string } }) => v.id?.videoId).filter(Boolean).join(",");
        } else if (searchRes.status === 403) {
          quotaExceeded = true;
        }
      }
      {
        if (ids) {
          const vRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ids}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (vRes.status === 403) quotaExceeded = true;
          if (vRes.ok) {
            const vData = await vRes.json();
            const classified = (vData.items ?? []).map((v: { contentDetails: { duration?: string }; snippet: { publishedAt: string } }) => ({
              durationSeconds: parseDuration(v.contentDetails.duration ?? "PT0S"),
              publishedAt: new Date(v.snippet.publishedAt),
            }));
            const shorts = classified.filter((v: { durationSeconds: number }) => v.durationSeconds > 0 && v.durationSeconds <= SHORT_MAX);
            const longs = classified.filter((v: { durationSeconds: number }) => v.durationSeconds > SHORT_MAX);
            shortsCount = shorts.length;
            longCount = longs.length;
            // Whole-channel analysis: use ALL videos (Shorts + long-form together).
            const pool: { durationSeconds: number; publishedAt: Date }[] = classified;
            const durations = pool.map((v) => v.durationSeconds).filter((d) => d > 0);
            const avgDur = durations.length
              ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length
              : 300;
            const dates = pool.map((v) => v.publishedAt).sort((a, b) => b.getTime() - a.getTime());
            const lastUpload = dates[0] ?? null;
            videoData = {
              uploadsLast7Days: dates.filter((d) => d >= d7).length,
              uploadsLast30Days: dates.filter((d) => d >= d30).length,
              uploadsLast90Days: dates.filter((d) => d >= d90).length,
              daysSinceLastUpload: lastUpload
                ? Math.floor((now.getTime() - lastUpload.getTime()) / 86400000)
                : 999,
              avgVideoDurationSeconds: avgDur,
            };
            videoDataLoaded = true;
          }
        }
      }
    } catch (e) {
      console.warn("[analyze] video fetch failed:", e);
    }

    // Brand-new / empty channel: nothing to analyze.
    if (channel.videoCount === 0 || (videoDataLoaded && shortsCount === 0 && longCount === 0)) {
      return NextResponse.json(
        {
          unsupported: "no_videos",
          error:
            "This channel hasn't posted any videos yet. Upload some content first, then come back to get your Trust Score.",
        },
        { status: 422 }
      );
    }

    // If we couldn't read the channel's uploads, don't fabricate upload stats, // tell the user the real reason (usually the daily YouTube API quota).
    if (!videoDataLoaded) {
      return NextResponse.json(
        {
          error: quotaExceeded
            ? "YouTube's daily data limit was reached. Please try again after it resets (midnight Pacific Time)."
            : "Couldn't read your recent uploads from YouTube. Please try again in a moment.",
          quota: quotaExceeded,
        },
        { status: quotaExceeded ? 429 : 502 }
      );
    }

    // Charge credits, only now, after all validation passed and we're about to
    // run the (paid) analytics pull. Avoids charging for early error returns.
    const charge = await chargeCredits(uid, "trustScore");
    if (!charge.ok) return charge.response;

    // ── Analytics ── This is a Shorts tool: score Shorts-only metrics when the
    // channel is mostly Shorts, so retention/engagement reflect the Shorts feed.
    const mostlyShorts = shortsCount >= longCount;
    let analytics = await fetchYouTubeAnalytics(accessToken, ytId, mostlyShorts ? "SHORTS" : "ALL", windowDays);
    // Some channels don't expose the SHORTS content-type filter; fall back to ALL.
    if (mostlyShorts && analytics.views === 0) {
      analytics = await fetchYouTubeAnalytics(accessToken, ytId, "ALL", windowDays);
    }

    // ── Score ── (Shorts cadence + benchmarks when the channel is mostly Shorts)
    const score = calculateScoreFromAnalytics(
      analytics,
      channel,
      channel.videoCount,
      videoData,
      mostlyShorts,
      manual
    );

    // ── Confidence (data completeness, not just volume) ──
    // Count how many of the key real signals actually came back from Analytics.
    const analyzedVideos = shortsCount + longCount;
    const dataSignals = [
      analytics.views > 0,
      analytics.avgViewPercentage > 0,   // retention (heaviest weight)
      analytics.hasDislikeData,          // sentiment
      analytics.savesRate > 0,           // saves
      analytics.subscriberViewPct > 0,   // loyalty / traffic mix
    ].filter(Boolean).length;

    let confidence: "high" | "medium" | "low";
    if (analyzedVideos >= 20 && analytics.views > 0 && dataSignals >= 4) confidence = "high";
    else if (analyzedVideos >= 8 && analytics.views > 0 && dataSignals >= 3) confidence = "medium";
    else confidence = "low";

    // Persist latest channel stats (best-effort).
    col.doc(ytId).set(
      {
        name: channel.name,
        thumbnailUrl: channel.thumbnailUrl,
        subscriberCount: channel.subscriberCount,
        viewCount: channel.viewCount,
        videoCount: channel.videoCount,
        lastScore: score.overall,
        lastAnalyzedAt: Date.now(),
      },
      { merge: true }
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      score,
      channel,
      confidence,
      windowDays,
      contentMix: { shorts: shortsCount, long: longCount },
    });
  } catch (error: unknown) {
    console.error("[analyze] error:", error);
    return NextResponse.json(
      { error: (error as Error)?.message ?? "Failed to analyze channel" },
      { status: 500 }
    );
  }
}
