import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { hasAnyKey } from "@/lib/youtubeKeys";
import { NICHES, NicheId, getRecap, getRecapForWeek, listWeeks, refreshAllIfDue } from "@/lib/nicheResearch";

export const runtime = "nodejs";
export const maxDuration = 60;

// GET /api/niche-research?niche=commentary[&week=2026-06-29]
//  - no week → the latest recap + list of available past weeks
//  - week    → that specific archived week's recap
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAnyKey()) return NextResponse.json({ error: "Niche Researcher isn't configured." }, { status: 503 });

  const niche = (req.nextUrl.searchParams.get("niche") ?? NICHES[0].id) as NicheId;
  const week = req.nextUrl.searchParams.get("week");
  if (!NICHES.some((n) => n.id === niche)) {
    return NextResponse.json({ error: "Unknown niche." }, { status: 400 });
  }

  try {
    // Auto-refresh all niches if the data is >7 days old (fire-and-forget).
    void refreshAllIfDue().catch(() => {});

    const [recap, weeks] = await Promise.all([
      week ? getRecapForWeek(niche, week) : getRecap(niche),
      listWeeks(niche),
    ]);
    return NextResponse.json({ niches: NICHES, recap, weeks });
  } catch (err) {
    console.error("[niche-research] error:", err);
    return NextResponse.json({ error: "Couldn't load niche data." }, { status: 500 });
  }
}
