import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { getTranscript } from "@/lib/transcriptFetcher";

export const runtime = "nodejs";
export const maxDuration = 120; // Whisper fallback can take a bit

const SHORT_MAX_SECONDS = 190; // Shorts are up to ~3 min

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
  if (!url) return NextResponse.json({ error: "Paste a YouTube Shorts link." }, { status: 400 });

  const { id, wasShortsUrl } = parseYouTubeUrl(url);
  if (!id) return NextResponse.json({ error: "That doesn't look like a valid YouTube link." }, { status: 400 });

  // ── Shorts-only check ──
  // /shorts/ URLs are definitively Shorts. For watch URLs, verify duration ≤ 3 min
  // (needs the YouTube API key). Also fetch the title/thumbnail for display.
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
        if (!wasShortsUrl && duration > SHORT_MAX_SECONDS) {
          return NextResponse.json(
            { unsupported: "not_short", error: "This is a long-form video. This tool only transcribes YouTube Shorts (up to ~3 minutes)." },
            { status: 422 }
          );
        }
      }
    } catch {
      // If the metadata check fails, still allow /shorts/ URLs (they're Shorts by definition).
      if (!wasShortsUrl) {
        return NextResponse.json({ error: "Couldn't verify the video. Please try a Shorts link." }, { status: 502 });
      }
    }
  }

  // ── Transcribe ──
  try {
    const transcript = await getTranscript(`https://www.youtube.com/watch?v=${id}`);
    if (!transcript || transcript.trim().length < 2) {
      return NextResponse.json({ error: "Couldn't get a transcript for this Short (no captions and audio transcription failed)." }, { status: 422 });
    }
    return NextResponse.json({ success: true, transcript, title, thumbnail });
  } catch (err) {
    console.error("[transcript] error:", err);
    return NextResponse.json({ error: "Couldn't transcribe this Short. Please try again." }, { status: 500 });
  }
}
