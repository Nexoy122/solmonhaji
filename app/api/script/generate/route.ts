import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { chargeCredits } from "@/lib/requireCredits";
import {
  generateScript,
  generateFromIdeaWithReference,
  improveScript,
  type ImproveOption,
} from "@/lib/scriptGen";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/script/generate — JSON modes:
//   { mode:"idea", idea, transcript?, youtubeUrl?, withTimestamps? }
//   { mode:"improve", script, options[], transcript?, youtubeUrl?, withTimestamps? }
//   (legacy) { topic }  → simple topic generation
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Script generation is not configured." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const mode = str(body.mode) || (body.topic ? "topic" : "");
  const transcript = str(body.transcript) || null;
  const youtubeUrl = str(body.youtubeUrl) || null;
  const withTimestamps = body.withTimestamps === true;

  // Charge credits before generating (server-side, race-safe).
  const charge = await chargeCredits(uid, "script");
  if (!charge.ok) return charge.response;

  try {
    let script = "";
    let warning: string | undefined;
    if (mode === "idea") {
      const idea = str(body.idea);
      if (idea.length < 5) return NextResponse.json({ error: "Describe your idea (at least 5 characters)." }, { status: 400 });
      if (idea.length > 10000) return NextResponse.json({ error: "Idea is too long." }, { status: 400 });
      const r = await generateFromIdeaWithReference({ idea, transcript, youtubeUrl, withTimestamps });
      script = r.script; warning = r.warning;
    } else if (mode === "improve") {
      const src = str(body.script);
      if (src.length < 20) return NextResponse.json({ error: "Paste a script to improve (at least 20 characters)." }, { status: 400 });
      const options = (Array.isArray(body.options) ? body.options : []).filter(
        (o): o is ImproveOption => typeof o === "string"
      ) as ImproveOption[];
      const instruction = str(body.instruction) || null;
      script = await improveScript({ script: src, options, instruction, transcript, youtubeUrl, withTimestamps });
    } else {
      // legacy topic mode
      const topic = str(body.topic);
      if (!topic) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
      if (topic.length > 200) return NextResponse.json({ error: "Topic is too long." }, { status: 400 });
      script = await generateScript(topic);
    }
    return NextResponse.json({ success: true, script, warning });
  } catch (err) {
    console.error("[script/generate] error:", err);
    return NextResponse.json({ error: (err as Error).message || "Couldn't generate the script." }, { status: 500 });
  }
}
