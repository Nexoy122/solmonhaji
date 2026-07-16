import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { getSettings, saveNotificationPrefs } from "@/lib/settings";

export const runtime = "nodejs";

// GET /api/settings -> notification prefs (+ soft-delete state).
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getSettings(uid));
  } catch (err) {
    console.error("[settings] read failed:", err);
    return NextResponse.json({ error: "Couldn't load settings." }, { status: 500 });
  }
}

// POST /api/settings -> save notification prefs. Keys are allowlisted in
// lib/settings.ts; anything else the client sends is ignored.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const prefs = (body.prefs && typeof body.prefs === "object" ? body.prefs : body) as Record<string, unknown>;
  try {
    return NextResponse.json(await saveNotificationPrefs(uid, prefs));
  } catch (err) {
    console.error("[settings] save failed:", err);
    return NextResponse.json({ error: "Couldn't save settings." }, { status: 500 });
  }
}
