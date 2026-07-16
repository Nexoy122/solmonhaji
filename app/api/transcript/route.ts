import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { getTranscript } from "@/lib/transcriptFetcher";
import { chargeCredits } from "@/lib/requireCredits";

export const runtime = "nodejs";
// A 1-hour video's Whisper fallback needs real time: download, extract audio,
// transcribe. 120s wasn't close.
export const maxDuration = 300;

// Longest video we'll accept. Past this the Whisper path can't finish inside
// maxDuration, so we'd fail slowly instead of saying no quickly.
const MAX_SECONDS = 60 * 60; // 1 hour

// Extract a video ID from a Shorts or watch URL. Returns { id, wasShortsUrl }.
function parseYouTubeUrl(url: string): { id: string | null; wasShortsUrl: boolean } {
  const shorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (shorts) return { id: shorts[1], wasShortsUrl: true };
  const watch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{6,})/);
  if (watch) return { id: watch[1], wasShortsUrl: false };
  // bare 11-char id
  const bare = url.trim().match(/^[a-zA-Z0-9_-]{11}$/);
  if (bare) return { id: bare[0], wasShortsUrl: false };
  return { id: null, wasShortsUrl: false };
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return parseInt(m[1] ?? "0") * 3600 + parseInt(m[2] ?? "0") * 60 + parseInt(m[3] ?? "0");
}

export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const url = (body?.url ?? "").toString().trim();
  if (!url) return NextResponse.json({ error: "Paste a YouTube link." }, { status: 400 });

  const { id, wasShortsUrl } = parseYouTubeUrl(url);
  if (!id) return NextResponse.json({ error: "That doesn't look like a valid YouTube link." }, { status: 400 });

  // ── Duration check ──
  // Shorts and long-form are both supported; we only reject past MAX_SECONDS.
  // Needs the YouTube API key. Also fetches the title/thumbnail for display.
  let title = "";
  let thumbnail: string | null = null;
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_API_KEYS?.split(",")[0]?.trim();
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${id}&key=${apiKey}`
      );
      if (res.ok) {
        const data = await res.json();
        const item = data.items?.[0];
        if (!item) return NextResponse.json({ error: "Video not found (it may be private or removed)." }, { status: 404 });
        title = item.snippet?.title ?? "";
        thumbnail = item.snippet?.thumbnails?.medium?.url ?? item.snippet?.thumbnails?.default?.url ?? null;
        const duration = parseDuration(item.contentDetails?.duration ?? "PT0S");
        // Long-form is supported now, up to an hour. Beyond that the Whisper
        // fallback would blow past the route's time budget and time out anyway,
        // so refuse clearly rather than hang and fail.
        if (duration > MAX_SECONDS) {
          return NextResponse.json(
            {
              unsupported: "too_long",
              error: `That video is ${Math.round(duration / 60)} minutes. This tool handles videos up to ${MAX_SECONDS / 60} minutes.`,
            },
            { status: 422 }
          );
        }
      }
    } catch {
      // Metadata lookup failed. /shorts/ URLs are safe to try anyway (they're
      // always under the limit); for anything else we can't know the length.
      if (!wasShortsUrl) {
        return NextResponse.json({ error: "Couldn't verify that video. Check the link and try again." }, { status: 502 });
      }
    }
  }

  // Charge credits before transcribing (server-side).
  const charge = await chargeCredits(uid, "transcript", `transcript:${id}`);
  if (!charge.ok) return charge.response;

  // ── Transcribe ──
  try {
    const transcript = await getTranscript(`https://www.youtube.com/watch?v=${id}`);
    if (!transcript || transcript.trim().length < 2) {
      return NextResponse.json({ error: "Couldn't get a transcript for this video. It may have captions disabled and no usable audio." }, { status: 422 });
    }
    return NextResponse.json({ success: true, transcript, title, thumbnail });
  } catch (err) {
    console.error("[transcript] error:", err);
    return NextResponse.json({ error: "Couldn't transcribe this video. Please try again." }, { status: 500 });
  }
}
