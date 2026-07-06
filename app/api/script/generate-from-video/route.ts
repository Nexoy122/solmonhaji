import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { generateScriptFromStyle } from "@/lib/scriptGen";

export const runtime = "nodejs";
export const maxDuration = 120; // transcription can take a bit

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

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

  const transcript = (form.get("transcript") as string | null)?.trim() || null;
  const youtubeUrl = (form.get("youtubeUrl") as string | null)?.trim() || null;
  const file = form.get("video") as File | null;

  let videoBuffer: Buffer | null = null;
  let videoMime: string | null = null;
  if (file && typeof file.arrayBuffer === "function") {
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Video is too large (max 25 MB)." }, { status: 413 });
    }
    videoBuffer = Buffer.from(await file.arrayBuffer());
    videoMime = file.type || "video/mp4";
  }

  if (!transcript && !youtubeUrl && !videoBuffer) {
    return NextResponse.json(
      { error: "Provide at least one: a transcript, a YouTube URL, or a video file." },
      { status: 400 }
    );
  }

  try {
    const script = await generateScriptFromStyle({ transcript, youtubeUrl, videoBuffer, videoMime });
    return NextResponse.json({ success: true, script });
  } catch (err) {
    console.error("[script/from-video] error:", err);
    return NextResponse.json({ error: "Couldn't generate the script. Please try again." }, { status: 500 });
  }
}
