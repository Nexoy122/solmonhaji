import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { NICHES } from "@/lib/nicheResearch";
import { getSeedChannels } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/explore/channels → the curated SEED channels only, enriched.
// The Explore "Channels" tab reads this; all filtering/sorting is client-side.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channels = await getSeedChannels();
    return NextResponse.json({ niches: NICHES, channels });
  } catch (err) {
    console.error("[explore/channels] error:", err);
    const msg = (err as Error)?.message ?? "";
    const unavailable = /RESOURCE_EXHAUSTED|Quota exceeded|UNAVAILABLE/i.test(msg);
    return NextResponse.json({ error: "Couldn't load channels.", unavailable }, { status: unavailable ? 503 : 500 });
  }
}
