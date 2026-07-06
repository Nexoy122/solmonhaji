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

async function callGroq(userContent: string): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.9,
      max_tokens: 350,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });
  if (!res.ok) throw new Error((await res.text()).slice(0, 300));
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// ── Generate from a topic ──
export async function generateScript(topic: string): Promise<string> {
  return callGroq(`Topic: "${topic}"\n\nWrite one complete YouTube Shorts script.\n\nOnly output the final script.`);
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
