import "server-only";
import { getTranscript, transcribeBufferWithGroq } from "@/lib/transcriptFetcher";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export const SYSTEM_PROMPT = `
You are one of the world's best YouTube Shorts scriptwriters.

Your job is to write scripts that maximize watch time, retention, and shares.

The script should sound exactly like a successful educational YouTube Short.

Think like Zack D. Films, Daily Dose of Internet, RealLifeLore Shorts, History Dose, and MagnatesMedia Shorts.

The script should NEVER sound like AI.

==========================
SCRIPT STRUCTURE
==========================

1. HOOK (0-3 sec)
The first sentence is everything. It MUST instantly stop scrolling.
Good hooks often begin with: Did you know... / Imagine if... / Here's why... / The truth is... / Scientists discovered... / Nobody talks about... / This should be impossible... / This changed history forever... / You would never survive... / The craziest part is...
Avoid generic openings.

2. BUILD CURIOSITY
Every sentence should make the viewer NEED the next sentence. Never dump information. Reveal facts one by one.

3. ESCALATION
Each new fact must be more surprising than the previous one. Use exact numbers, years, names, comparisons, records.

4. ENDING
The final sentence must be the strongest fact. The viewer should immediately want to share the video. Never waste the ending.

==========================
WRITING STYLE
==========================
- Spoken words only.
- Natural conversational English.
- Maximum 15 words per sentence.
- Short sentences.
- No introductions. No conclusions. No titles. No headings. No emojis. No hashtags. No stage directions. No markdown.

==========================
QUALITY CHECK
==========================
Before answering, silently verify:
- The hook is impossible to ignore.
- Every sentence increases curiosity.
- No repeated information.
- The ending is stronger than the beginning.
- Sounds like a human, not AI.

Only output the final script.
`;

async function callGroq(userContent: string, systemPrompt: string = SYSTEM_PROMPT): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      max_tokens: 500,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 300));
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// Resolve a reference (YouTube URL or manual transcript) → { text, hook }.
// The reference is used for STYLE/PACING, and its first line can become the hook.
async function resolveReference(opts: { transcript?: string | null; youtubeUrl?: string | null }): Promise<{ text: string; hook: string | null }> {
  let text = "";
  if (opts.youtubeUrl) {
    try { text = await getTranscript(opts.youtubeUrl); } catch { /* fall through */ }
  }
  if (!text && opts.transcript) text = opts.transcript;
  if (!text) return { text: "", hook: null };
  const trimmed = text.split(" ").slice(0, 800).join(" ");
  const firstSentence = trimmed.match(/^.*?[.!?]/);
  const hook = firstSentence ? firstSentence[0].trim() : trimmed.split(" ").slice(0, 15).join(" ");
  return { text: trimmed, hook };
}

// Append a "with timestamps" instruction when requested.
function timestampRule(withTs: boolean): string {
  return withTs
    ? `\n\nFORMAT: Add a timestamp range before each beat, like "[0-3s] ..." then the line. Keep the whole script under ~60 seconds of spoken time.`
    : `\n\nFORMAT: Plain spoken lines only. No timestamps, no labels.`;
}

// ── Generate from a topic ──
export async function generateScript(topic: string): Promise<string> {
  return callGroq(`Topic: "${topic}"\n\nWrite one complete YouTube Shorts script.\n\nOnly output the final script.`);
}

// ── Mode 1: idea + reference style ──
// User gives their idea (e.g. "Iran vs USA military") + a reference (transcript
// or YouTube URL). AI writes THEIR idea in the reference's style/pacing.
export async function generateFromIdeaWithReference(opts: {
  idea: string;
  transcript?: string | null;
  youtubeUrl?: string | null;
  withTimestamps?: boolean;
}): Promise<string> {
  const ref = await resolveReference(opts);
  let content = `The creator's video idea/topic:\n"${opts.idea}"\n\n`;
  if (ref.text) {
    content += `Here is a REFERENCE script to copy the STYLE, pacing, and hook energy from (do NOT copy its topic or facts):\n"${ref.text}"\n\nStudy how it builds curiosity, its sentence length, and its rhythm.\n\n`;
  }
  content += `Now write a NEW original YouTube Shorts script about the creator's idea above, in that same style and pacing.`;
  content += timestampRule(opts.withTimestamps ?? false);
  content += `\n\nOnly output the final script.`;
  return callGroq(content);
}

// ── Mode 2: improve an existing script ──
export type ImproveOption =
  | "better_hook" | "tighter_pacing" | "stronger_cta" | "more_engaging" | "shorter" | "longer";

const IMPROVE_LABELS: Record<ImproveOption, string> = {
  better_hook: "a stronger, scroll-stopping hook in the first line",
  tighter_pacing: "tighter pacing — cut filler, shorten sentences",
  stronger_cta: "a stronger call-to-action at the end",
  more_engaging: "more engaging, higher-curiosity phrasing throughout",
  shorter: "make it noticeably shorter and punchier",
  longer: "expand it with more surprising facts/details",
};

export async function improveScript(opts: {
  script: string;
  options: ImproveOption[];
  transcript?: string | null;
  youtubeUrl?: string | null;
  withTimestamps?: boolean;
}): Promise<string> {
  const asks = opts.options.length
    ? opts.options.map((o) => `- ${IMPROVE_LABELS[o]}`).join("\n")
    : "- overall quality, retention, and shareability";
  const ref = await resolveReference(opts);
  let content = `Here is the creator's current script:\n"${opts.script}"\n\nRewrite and IMPROVE it. Specifically apply:\n${asks}\n`;
  if (ref.text) content += `\nMatch the STYLE/pacing of this reference (do not copy its content):\n"${ref.text}"\n`;
  content += `\nKeep the same core topic. Return only the improved script.`;
  content += timestampRule(opts.withTimestamps ?? false);
  return callGroq(content);
}

// ── Mode 3: from a video (upload or YouTube URL) → analyze → script ──
export async function generateFromVideo(opts: {
  videoBuffer?: Buffer | null;
  videoMime?: string | null;
  youtubeUrl?: string | null;
  transcript?: string | null; // reference for style
  withTimestamps?: boolean;
}): Promise<string> {
  // 1) Get the source video's transcript (what the video is about).
  let source = "";
  let lastErr = "";
  if (opts.videoBuffer) {
    try { source = (await transcribeBufferWithGroq(opts.videoBuffer, opts.videoMime ?? "audio/mpeg")).split(" ").slice(0, 900).join(" "); }
    catch (e) { lastErr = `upload: ${(e as Error).message}`; console.error("[from-video] upload transcribe failed:", (e as Error).message); }
  }
  if (!source && opts.youtubeUrl) {
    try { source = (await getTranscript(opts.youtubeUrl)).split(" ").slice(0, 900).join(" "); }
    catch (e) { lastErr = `url: ${(e as Error).message}`; console.error("[from-video] url transcribe failed:", (e as Error).message); }
  }
  if (!source) throw new Error(`Couldn't read the video. ${lastErr || "No audio was extracted."}`);

  // 2) Optional style reference (separate transcript).
  const ref = await resolveReference({ transcript: opts.transcript });

  let content = `Below is the full spoken content (transcript) of the creator's video:\n"${source}"\n\nANALYZE this video: identify its core topic, the key message/story, the most interesting facts, and its emotional angle. Then write a POLISHED, punchier YouTube Shorts script that delivers the same idea far more effectively — a stronger hook, tighter pacing, and a share-worthy ending. Do NOT just copy the transcript; improve and restructure it.`;
  if (ref.text) content += `\n\nWrite it in the STYLE/pacing of this reference (do not copy its content):\n"${ref.text}"`;
  content += timestampRule(opts.withTimestamps ?? false);
  content += `\n\nOnly output the final script.`;
  return callGroq(content);
}

// ── Generate from a reference style (transcript / YouTube URL / uploaded video) ──
export async function generateScriptFromStyle(opts: {
  transcript?: string | null;
  youtubeUrl?: string | null;
  videoBuffer?: Buffer | null;
  videoMime?: string | null;
}): Promise<string> {
  const { transcript, youtubeUrl, videoBuffer, videoMime } = opts;
  let context = "";

  if (youtubeUrl) {
    try {
      const yt = await getTranscript(youtubeUrl);
      context += `Here is the transcript from the YouTube video (${youtubeUrl}):\n\n"${yt}"\n\n`;
    } catch (err) {
      context += `A YouTube video was provided (${youtubeUrl}) but transcription failed: ${(err as Error).message}. Use any other provided content below for style reference.\n\n`;
    }
  }

  if (videoBuffer) {
    try {
      const uploaded = await transcribeBufferWithGroq(videoBuffer, videoMime ?? "audio/mpeg");
      const trimmed = uploaded.split(" ").slice(0, 800).join(" ");
      context += `Here is the transcript from the uploaded video:\n\n"${trimmed}"\n\n`;
    } catch (err) {
      context += `A video file was uploaded but transcription failed: ${(err as Error).message}\n\n`;
    }
  }

  let manualHook: string | null = null;
  if (transcript) {
    const trimmed = transcript.split(" ").slice(0, 800).join(" ");
    const firstSentence = trimmed.match(/^.*?[.!?]/);
    manualHook = firstSentence ? firstSentence[0].trim() : trimmed.split(" ").slice(0, 15).join(" ");
    context += `Here is a manually provided transcript:\n\n"${trimmed}"\n\n`;
  }

  context += `Study all provided content carefully:
- How does it build curiosity?
- What is the pacing and sentence length?
- What makes it engaging?

Now write a NEW original script on the SAME topic or a closely related one.`;

  if (manualHook) {
    context += `\n\nCRITICAL RULE — HOOK: You MUST start the script with this EXACT hook, word for word:\n"${manualHook}"\nDo not change a single word of the hook. Copy it exactly as the very first line.`;
  }

  context += `\n\nAfter the hook, continue with a completely new original script in the same style and pacing.
Do NOT copy anything else verbatim from the transcript.
Make the ending hit as hard as possible.
Only output the final script.`;

  return callGroq(context);
}
