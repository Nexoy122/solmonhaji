import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";
const MAX_HISTORY = 6; // cap conversation turns sent to the model (token saving)

type ChatMsg = { role: "user" | "assistant"; content: string };

type Metric = {
  key: string; name: string; value: number; score: number; unit?: string;
  benchmark?: number; benchmarkLabel?: string; percentile?: string;
};
type Category = { score: number; grade?: string; label?: string; summary?: string; metrics?: Metric[] };

// Format a metric value cleanly (whole numbers where it makes sense, with unit).
function fmtMetric(m: Metric): string {
  const v = Number.isInteger(m.value) ? m.value : Math.round(m.value * 100) / 100;
  const unit = m.unit ? ` ${m.unit}` : "";
  const bench = m.benchmark !== undefined ? ` (target: ${m.benchmark}${m.unit ? " " + m.unit : ""})` : "";
  return `${m.name}: ${v}${unit}, score ${Math.round(m.score)}/100${bench}`;
}

// Build a COMPLETE, readable snapshot of the user's Trust Score for the model,
// including every individual metric so the AI can answer specific questions.
function buildScoreContext(
  score: Record<string, unknown> | null,
  channelName?: string,
  meta?: { windowDays?: number; subscriberCount?: number; videoCount?: number }
): string {
  if (!score) return "No analysis has been run yet. Tell the user to run an analysis first.";
  const s = score as {
    overall: number; grade: string; label: string; trustTier?: string; trustMeaning?: string;
    percentile?: string;
    engagement?: Category; retention?: Category; upload?: Category;
    authority?: Category; velocity?: Category;
    recommendations?: { title: string; description: string; action?: string; impact: number; level: string }[];
    insights?: string[];
  };
  const r = (n?: number) => (typeof n === "number" ? Math.round(n) : "?");
  const lines: string[] = [];

  lines.push(`Channel: ${channelName ?? "the user's channel"}`);
  if (meta?.subscriberCount !== undefined) lines.push(`Subscribers: ${meta.subscriberCount}`);
  if (meta?.videoCount !== undefined) lines.push(`Total videos: ${meta.videoCount}`);
  lines.push(`Analysis: Shorts only${meta?.windowDays ? `, last ${meta.windowDays} days` : ""}`);
  lines.push("");
  lines.push(`OVERALL TRUST SCORE: ${r(s.overall)}/100, ${s.label} (grade ${s.grade}, tier ${s.trustTier ?? "?"}${s.percentile ? `, ${s.percentile}` : ""})`);
  if (s.trustMeaning) lines.push(`What it means: ${s.trustMeaning}`);
  if (s.insights?.length) {
    lines.push("Key insights:");
    s.insights.forEach((i) => lines.push(`  • ${i}`));
  }

  const cats: [string, Category | undefined][] = [
    ["ENGAGEMENT", s.engagement],
    ["RETENTION", s.retention],
    ["CONSISTENCY (upload)", s.upload],
    ["AUTHORITY", s.authority],
    ["VELOCITY", s.velocity],
  ];
  for (const [label, cat] of cats) {
    if (!cat) continue;
    lines.push("");
    lines.push(`${label}, ${r(cat.score)}/100${cat.grade ? ` (${cat.grade})` : ""}`);
    if (cat.summary) lines.push(`  Summary: ${cat.summary}`);
    if (cat.metrics?.length) {
      cat.metrics.forEach((m) => lines.push(`  - ${fmtMetric(m)}`));
    }
  }

  if (s.recommendations?.length) {
    lines.push("");
    lines.push("TOP FIXES (by impact):");
    s.recommendations.slice(0, 4).forEach((rec) =>
      lines.push(`  - ${rec.title} (+${rec.impact}): ${rec.description}`)
    );
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the NicheSpy AI coach for YouTube creators. You help them understand their "Trust Score", a 0-100 health score reflecting how much the YouTube algorithm trusts and distributes their channel. The score analyzes their whole channel.

Rules:
- BE BRIEF. Default to 2-4 short sentences or a few bullets. Only go longer if explicitly asked for detail. Don't repeat the question back or add filler.
- Explain things in SIMPLE, plain English. No jargon unless you immediately explain it.
- You may use **bold** for key terms and "- " bullets; keep formatting minimal.
- You are given the user's FULL Trust Score data below: the overall score, all 5 category scores, and EVERY individual metric (with its exact value, unit, and benchmark), e.g. "Upload Recency" shows days since last upload, "Like Rate" shows the like %. ALWAYS look through the metrics for the specific number the user asks about before saying you don't have it.
- Base every answer ONLY on this data. Never invent numbers.
- IMPORTANT, what we CANNOT measure: YouTube's API does NOT expose impressions, click-through rate (CTR), or "swipe rate/swipe ratio" (views ÷ impressions). If asked about swipe rate / CTR / impressions, explain plainly that YouTube doesn't share that data through its API (it's only visible inside YouTube Studio), then redirect them to the engagement signals we DO have, Like Rate, Comment Rate, Share Rate, Saves Rate. Do not pretend a swipe rate number exists.
- When giving advice, be specific and actionable: a strong hook in the first 1-2 seconds, retention, consistency, and frequent uploads. Consistent (ideally daily) posting is a strong trust signal, YouTube rewards regular uploaders and pulls back when creators go quiet.
- "View jail" = the algorithm isn't pushing their content (low trust). High trust = YouTube pushes their videos to new viewers.
- If asked something unrelated to their channel/Shorts growth, gently steer back.
- Keep responses focused; don't dump everything at once.`;

export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "AI is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { messages, score, channelName, mode, meta } = (body ?? {}) as {
    messages?: ChatMsg[];
    score?: Record<string, unknown> | null;
    channelName?: string;
    mode?: "summary" | "chat";
    meta?: { windowDays?: number; subscriberCount?: number; videoCount?: number };
  };

  const scoreContext = buildScoreContext(score ?? null, channelName, meta);

  // Compose the message list for Groq.
  const chat: { role: string; content: string }[] = [
    { role: "system", content: `${SYSTEM_PROMPT}\n\n=== USER'S TRUST SCORE DATA ===\n${scoreContext}` },
  ];

  if (mode === "summary") {
    chat.push({
      role: "user",
      content:
        "In under 80 words: 1 line on what my overall score means, my biggest strength, my biggest weakness, and the ONE thing to fix first. Use short bullets.",
    });
  } else {
    const history = (messages ?? []).filter((m) => m.role && m.content).slice(-MAX_HISTORY);
    if (history.length === 0) {
      return NextResponse.json({ error: "No message provided." }, { status: 400 });
    }
    chat.push(...history);
  }

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: chat,
        temperature: 0.5,
        max_tokens: 380,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => "");
      console.error("[ai-chat] groq error:", res.status, errText.slice(0, 300));
      return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 502 });
    }

    // Re-stream the model's tokens to the client as plain text.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = res.body.getReader();
    const stream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (data === "[DONE]") { controller.close(); return; }
              try {
                const json = JSON.parse(data);
                const delta = json.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                /* ignore partial json */
              }
            }
          }
        } catch (e) {
          console.error("[ai-chat] stream error:", e);
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
    });
  } catch (err) {
    console.error("[ai-chat] error:", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
