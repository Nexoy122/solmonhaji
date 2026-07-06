import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { NICHES, NicheId } from "@/lib/nicheResearch";
import { dbConfigured } from "@/lib/db";
import { queryFeed, getLastRefresh, REFRESH_INTERVAL_MS, FeedQuery } from "@/lib/exploreDb";

export const runtime = "nodejs";
export const maxDuration = 30;

// GET /api/explore — paginated Explore feed from Postgres.
//   ?niche=ranking|all  ?sort=views|outlier|velocity|recent
//   ?minViews= &minSubs= &maxSubs= &minDuration= &maxDuration= &publishedAfter=
//   ?limit=60 &offset=0
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!dbConfigured()) return NextResponse.json({ error: "Explore database isn't configured.", unavailable: true }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const niche = (sp.get("niche") ?? "all") as NicheId | "all";
  if (niche !== "all" && !NICHES.some((n) => n.id === niche)) {
    return NextResponse.json({ error: "Unknown niche." }, { status: 400 });
  }
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined);
  const sortParam = sp.get("sort") ?? "views";
  const sort = (["views", "outlier", "velocity", "recent"].includes(sortParam) ? sortParam : "views") as FeedQuery["sort"];

  const fq: FeedQuery = {
    niche, sort,
    minViews: num("minViews"),
    minSubs: num("minSubs"),
    maxSubs: num("maxSubs"),
    minDuration: num("minDuration"),
    maxDuration: num("maxDuration"),
    publishedAfter: num("publishedAfter"),
    limit: num("limit") ?? 60,
    offset: num("offset") ?? 0,
  };

  try {
    const [{ videos, total, channelCount }, lastRefresh] = await Promise.all([queryFeed(fq), getLastRefresh()]);
    const nextRefresh = lastRefresh ? lastRefresh + REFRESH_INTERVAL_MS : null;
    return NextResponse.json({ niches: NICHES, videos, total, channelCount, nextRefresh });
  } catch (err) {
    console.error("[explore] error:", err);
    return NextResponse.json({ error: "Couldn't load the feed.", detail: (err as Error).message }, { status: 500 });
  }
}
