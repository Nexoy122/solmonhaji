import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { getOnboarding, saveOnboarding, STEP_ORDER, type OnboardingStep } from "@/lib/onboarding";

export const runtime = "nodejs";

// GET /api/onboarding -> the caller's onboarding state (creates it on first hit).
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getOnboarding(uid));
  } catch (err) {
    console.error("[onboarding] read failed:", err);
    // Fail open: never trap a user in onboarding because of a DB hiccup.
    return NextResponse.json({ step: "done", niches: [], source: null, sourceNote: null, joinedDiscord: false, completedAt: null });
  }
}

// POST /api/onboarding -> save answers for a step and advance.
// Body: { step?, niches?, source?, sourceNote?, joinedDiscord? }
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const step = typeof body.step === "string" && STEP_ORDER.includes(body.step as OnboardingStep)
    ? (body.step as OnboardingStep)
    : undefined;

  const niches = Array.isArray(body.niches)
    ? body.niches.filter((n): n is string => typeof n === "string").slice(0, 20)
    : undefined;

  const source = typeof body.source === "string" ? body.source.slice(0, 40) : undefined;
  const sourceNote = typeof body.sourceNote === "string" ? body.sourceNote.trim().slice(0, 280) : undefined;
  const joinedDiscord = typeof body.joinedDiscord === "boolean" ? body.joinedDiscord : undefined;

  try {
    const state = await saveOnboarding(uid, { step, niches, source, sourceNote, joinedDiscord });
    return NextResponse.json(state);
  } catch (err) {
    console.error("[onboarding] save failed:", err);
    return NextResponse.json({ error: "Couldn't save. Please try again." }, { status: 500 });
  }
}
