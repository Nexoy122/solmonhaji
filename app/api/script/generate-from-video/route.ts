import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { generateFromVideo } from "@/lib/scriptGen";

export const runtime = "nodejs";
export const maxDuration = 300; // ffmpeg extraction + transcription + analysis

const MAX_FILE_BYTES = 500 * 1024 * 1024; // 500 MB (audio is extracted server-side)

export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Script generation is not configured." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // transcript here = optional STYLE reference; youtubeUrl/file = the source video.
  const transcript = (form.get("transcript") as string | null)?.trim() || null;
  const youtubeUrl = (form.get("youtubeUrl") as string | null)?.trim() || null;
  const file = form.get("video") as File | null;
  const withTimestamps = (form.get("withTimestamps") as string | null) === "1";

  let videoBuffer: Buffer | null = null;
  let videoMime: string | null = null;
  if (file && typeof file.arrayBuffer === "function") {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Video is too large (max 500 MB)." }, { status: 413 });
    }
    videoBuffer = Buffer.from(await file.arrayBuffer());
    videoMime = file.type || "video/mp4";
  }

  if (!youtubeUrl && !videoBuffer) {
    return NextResponse.json(
      { error: "Upload a video or provide a YouTube Short URL." },
      { status: 400 }
    );
  }

  try {
    const script = await generateFromVideo({ videoBuffer, videoMime, youtubeUrl, transcript, withTimestamps });
    return NextResponse.json({ success: true, script });
  } catch (err) {
    console.error("[script/from-video] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't generate the script." }, { status: 500 });
  }
}
