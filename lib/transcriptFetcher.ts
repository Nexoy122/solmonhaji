import "server-only";
import { YoutubeTranscript } from "youtube-transcript";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

// ── Visual analysis (for silent / no-voiceover videos) ──────────────────────
// Extract a handful of frames with ffmpeg, send them to a vision model, and get
// a description of what happens on screen + any on-screen text. Lets us build a
// script from videos that have NO speech at all.
export async function analyzeVideoFramesFromFile(videoPath: string): Promise<string> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frames_"));
  try {
    // Sample frames, scaled down, capped at 5 (the vision model's per-request max).
    await execFileAsync("ffmpeg", ["-y", "-i", videoPath, "-vf", "fps=1,scale=512:-1", "-frames:v", "5", path.join(dir, "f%02d.jpg")], { maxBuffer: 1024 * 1024 * 32 });
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".jpg")).sort().slice(0, 5);
    if (files.length === 0) throw new Error("No frames extracted.");

    const images = files.map((f) => {
      const b64 = fs.readFileSync(path.join(dir, f)).toString("base64");
      return { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${b64}` } };
    });

    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: VISION_MODEL,
        temperature: 0.4,
        max_tokens: 400,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "These are sequential frames from a short vertical video that may have NO voiceover. Describe what is happening across the video (the subject, action, story, mood) and transcribe ALL on-screen text exactly. Write it as a clear paragraph a scriptwriter can use to understand the video's message." }, ...images,
          ],
        }],
      }),
    });
    if (!res.ok) throw new Error(`Vision error: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? "").trim();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// Normalize a Shorts URL to the standard watch URL.
function normalizeYoutubeUrl(url: string): string {
  const m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url;
}

// Strategy 1: caption scraping (fast, free, accurate).
async function fetchCaptions(url: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(normalizeYoutubeUrl(url));
  const text = transcript.map((t) => t.text).join(" ");
  return text;
}

// Strategy 2: yt-dlp download + Groq Whisper (fallback for no-caption videos).
async function fetchViaWhisper(url: string): Promise<string> {
  const normalized = normalizeYoutubeUrl(url);
  const outPath = path.join(os.tmpdir(), `yt_audio_${Date.now()}.mp3`);

  // Flags that help get past YouTube's bot checks on VPS IPs. If a cookies file
  // is provided (YT_DLP_COOKIES env → path), use it, most reliable bypass.
  const args = [
    "-x", "--audio-format", "mp3", "--audio-quality", "5",
    "--no-playlist", "--no-warnings", "--retries", "3",
    "--user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
    "--extractor-args", "youtube:player_client=android,web",
  ];
  if (process.env.YT_DLP_COOKIES && fs.existsSync(process.env.YT_DLP_COOKIES)) {
    args.push("--cookies", process.env.YT_DLP_COOKIES);
  }
  args.push("-o", outPath, normalized);

  try {
    await execFileAsync("yt-dlp", args, { maxBuffer: 1024 * 1024 * 32 });
  } catch (e) {
    // Surface the real yt-dlp stderr (bot check, geo-block, etc.).
    const msg = (e as { stderr?: string; message?: string }).stderr || (e as Error).message || "";
    throw new Error(`yt-dlp download failed: ${msg.slice(-300)}`);
  }

  try {
    const text = await whisperTranscribeFile(outPath);
    return text;
  } finally {
    fs.unlink(outPath, () => {});
  }
}

// Send an audio file to Groq Whisper using NATIVE Web FormData + Blob (so Node's
// global fetch produces a valid multipart body, the form-data stream truncates).
async function whisperTranscribeFile(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const form = new globalThis.FormData();
  form.append("file", new Blob([new Uint8Array(buf)], { type: "audio/mpeg" }), "audio.mp3");
  form.append("model", "whisper-large-v3-turbo");
  form.append("response_format", "text");
  const res = await fetch(GROQ_WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq Whisper error: ${(await res.text()).slice(0, 200)}`);
  return (await res.text()).trim();
}

// Transcribe an uploaded video/audio buffer via Groq Whisper (speech only).
export async function transcribeBufferWithGroq(buffer: Buffer, mimeType = "audio/mpeg"): Promise<string> {
  const r = await understandVideoFromBuffer(buffer, mimeType, false);
  return r.text;
}

// Understand an uploaded video: transcribe its SPEECH (Whisper) AND, if there's
// little/no speech, analyze the VISUALS (frames → vision model). Returns a
// combined description so a script can be written even for silent videos.
export async function understandVideoFromBuffer(
  buffer: Buffer,
  mimeType = "video/mp4",
  wantVisual = true
): Promise<{ text: string; hadSpeech: boolean; hadVisual: boolean }> {
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("webm") ? "webm" : mimeType.includes("mov") || mimeType.includes("quicktime") ? "mov" : "bin";
  const srcPath = path.join(os.tmpdir(), `upload_src_${Date.now()}.${ext}`);
  const audioPath = path.join(os.tmpdir(), `upload_audio_${Date.now()}.mp3`);
  fs.writeFileSync(srcPath, buffer);

  let speech = "";
  let visual = "";
  let visualErr = "";
  try {
    // 1) Try speech.
    try {
      await execFileAsync("ffmpeg", ["-y", "-i", srcPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audioPath], { maxBuffer: 1024 * 1024 * 32 });
      speech = (await whisperTranscribeFile(audioPath)).trim();
    } catch (e) { console.warn("[video] speech step failed:", (e as Error).message); }

    // 2) If there's little/no speech, analyze the visuals.
    const speechWords = speech.split(/\s+/).filter(Boolean).length;
    console.log(`[video] speech words: ${speechWords}, wantVisual: ${wantVisual}`);
    if (wantVisual && speechWords < 8) {
      try { visual = await analyzeVideoFramesFromFile(srcPath); console.log(`[video] visual chars: ${visual.length}`); }
      catch (e) { visualErr = (e as Error).message; console.error("[video] visual step failed:", visualErr); }
    }
  } finally {
    fs.unlink(srcPath, () => {});
    fs.unlink(audioPath, () => {});
  }

  const parts: string[] = [];
  if (speech) parts.push(`Spoken audio (transcript):\n"${speech}"`);
  if (visual) parts.push(`On-screen visuals & text:\n"${visual}"`);
  if (parts.length === 0) throw new Error(`Nothing readable in the video.${visualErr ? " Visual analysis error: " + visualErr : ""}`);
  return { text: parts.join("\n\n"), hadSpeech: Boolean(speech), hadVisual: Boolean(visual) };
}

// Strategy 0: third-party transcript API (Supadata). Handles proxies + blocking
// on their side, so it works from a datacenter IP without cookies. Enable by
// setting SUPADATA_API_KEY. Docs: https://supadata.ai
async function fetchViaSupadata(url: string): Promise<string> {
  const key = process.env.SUPADATA_API_KEY;
  if (!key) throw new Error("no supadata key");
  const res = await fetch(
    `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(normalizeYoutubeUrl(url))}&text=true`,
    { headers: { "x-api-key": key } }
  );
  if (!res.ok) throw new Error(`Supadata ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { content?: string; text?: string };
  const text = (data.content || data.text || "").trim();
  if (!text) throw new Error("Supadata returned no transcript.");
  return text;
}

// Main transcript resolver. Order (each falls back to the next):
//   1) Supadata API (reliable, no cookies)  →  2) caption scrape  →  3) yt-dlp+Whisper
export async function getTranscript(url: string): Promise<string> {
  const errors: string[] = [];
  // 1) Third-party API (best for a VPS).
  try { return await fetchViaSupadata(url); }
  catch (e) { const m = (e as Error).message; if (m !== "no supadata key") errors.push(`api: ${m}`); }
  // 2) Free caption scrape.
  try { return await fetchCaptions(url); }
  catch (e) { errors.push(`captions: ${(e as Error).message}`); }
  // 3) yt-dlp + Whisper (needs cookies/proxy on a VPS).
  try { return await fetchViaWhisper(url); }
  catch (e) { errors.push(`whisper: ${(e as Error).message}`); }
  throw new Error(`Transcription failed. ${errors.join(" | ").slice(0, 300)}`);
}
