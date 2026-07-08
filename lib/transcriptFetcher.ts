import "server-only";
import { YoutubeTranscript } from "youtube-transcript";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import FormData from "form-data";

const execFileAsync = promisify(execFile);
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

// Normalize a Shorts URL to the standard watch URL.
function normalizeYoutubeUrl(url: string): string {
  const m = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : url;
}

// Strategy 1: caption scraping (fast, free, accurate).
async function fetchCaptions(url: string): Promise<string> {
  const transcript = await YoutubeTranscript.fetchTranscript(normalizeYoutubeUrl(url));
  const text = transcript.map((t) => t.text).join(" ");
  return text.split(" ").slice(0, 800).join(" ");
}

// Strategy 2: yt-dlp download + Groq Whisper (fallback for no-caption videos).
async function fetchViaWhisper(url: string): Promise<string> {
  const normalized = normalizeYoutubeUrl(url);
  const outPath = path.join(os.tmpdir(), `yt_audio_${Date.now()}.mp3`);

  await execFileAsync("yt-dlp", [
    "-x", "--audio-format", "mp3", "--audio-quality", "5",
    "--no-playlist", "--no-warnings", "-o", outPath, normalized,
  ]);

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(outPath), { filename: path.basename(outPath), contentType: "audio/mpeg" });
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "text");

    const res = await fetch(GROQ_WHISPER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...form.getHeaders() },
      body: form as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`Groq Whisper error: ${(await res.text()).slice(0, 200)}`);
    const text = await res.text();
    return text.split(" ").slice(0, 800).join(" ");
  } finally {
    fs.unlink(outPath, () => {});
  }
}

// Transcribe an uploaded video/audio buffer via Groq Whisper.
export async function transcribeBufferWithGroq(buffer: Buffer, mimeType = "audio/mpeg"): Promise<string> {
  const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("webm") ? "webm" : mimeType.includes("mov") || mimeType.includes("quicktime") ? "mov" : "bin";
  const srcPath = path.join(os.tmpdir(), `upload_src_${Date.now()}.${ext}`);
  const audioPath = path.join(os.tmpdir(), `upload_audio_${Date.now()}.mp3`);
  fs.writeFileSync(srcPath, buffer);

  try {
    // Extract audio (mono, 16kHz, low bitrate) so even a large video → tiny mp3
    // that Whisper accepts — works with NO captions on any video.
    try {
      await execFileAsync("ffmpeg", ["-y", "-i", srcPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audioPath], { maxBuffer: 1024 * 1024 * 32 });
    } catch (e) {
      throw new Error(`Audio extraction failed (ffmpeg): ${(e as Error).message.slice(0, 160)}`);
    }
    const form = new FormData();
    form.append("file", fs.createReadStream(audioPath), { filename: "audio.mp3", contentType: "audio/mpeg" });
    form.append("model", "whisper-large-v3-turbo");
    form.append("response_format", "text");

    const res = await fetch(GROQ_WHISPER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...form.getHeaders() },
      body: form as unknown as BodyInit,
    });
    if (!res.ok) throw new Error(`Groq Whisper error: ${(await res.text()).slice(0, 200)}`);
    return await res.text();
  } finally {
    fs.unlink(srcPath, () => {});
    fs.unlink(audioPath, () => {});
  }
}

// Main: try captions first, fall back to yt-dlp + Whisper.
export async function getTranscript(url: string): Promise<string> {
  try {
    return await fetchCaptions(url);
  } catch {
    // no captions → fall back
  }
  try {
    return await fetchViaWhisper(url);
  } catch (err) {
    throw new Error(`Transcription failed. Captions unavailable and Whisper failed: ${(err as Error).message}`);
  }
}
