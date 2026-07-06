import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { generateScript } from "@/lib/scriptGen";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "Script generation is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const topic = (body as { topic?: string })?.topic?.trim();
  if (!topic) return NextResponse.json({ error: "Please enter a topic." }, { status: 400 });
  if (topic.length > 200) return NextResponse.json({ error: "Topic is too long." }, { status: 400 });

  try {
    const script = await generateScript(topic);
    return NextResponse.json({ success: true, script });
  } catch (err) {
    console.error("[script/generate] error:", err);
    return NextResponse.json({ error: "Couldn't generate the script. Please try again." }, { status: 500 });
  }
}
