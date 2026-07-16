import { NextRequest, NextResponse } from "next/server";
import { hasAnyKey } from "@/lib/youtubeKeys";
import { dbConfigured } from "@/lib/db";
import { refreshExploreIndex, getLastRefresh, setMeta } from "@/lib/exploreDb";
import { crawl, refreshIndex } from "@/lib/discovery";
import { refreshAllNiches } from "@/lib/nicheResearch";
import { isWeeklyRefreshDue } from "@/lib/refreshSchedule";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/refresh-all?secret=CRON_SECRET[&force=1]
// The SINGLE unified weekly crawl. Refreshes everything together, on one clock
// (Monday 04:00 UTC), so every page's data + countdown stay in lockstep:
//   1. Explore videos   (Postgres deep crawl of every seed creator's Shorts)
//   2. Discover channels (find + enrich new channels, refresh stale stats)
//   3. Niche Research    (weekly recaps per niche, seeds only)
// Protected by CRON_SECRET. `?force=1` bypasses the weekly-due check.
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  const secret = process.env.CRON_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!isVercelCron && secret && provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasAnyKey()) return NextResponse.json({ error: "No YouTube keys configured." }, { status: 503 });
  if (!dbConfigured()) return NextResponse.json({ error: "Database isn't configured." }, { status: 503 });

  const force = req.nextUrl.searchParams.get("force") === "1";
  const lastAll = await getLastRefresh();
  if (!force && !isWeeklyRefreshDue(lastAll)) {
    return NextResponse.json({ ok: true, skipped: "not due yet (weekly, Monday 04:00 UTC)" });
  }

  const result: Record<string, unknown> = {};
  const started = Date.now();

  // Order matters: run the CHEAP crawls first so Explore's massive deep-crawl
  // (tens of thousands of videos) doesn't drain the YouTube quota before the
  // others get their turn. Niche Research is ~2 units/channel (~150 channels);
  // Discover is a handful of searches; Explore is by far the heaviest.

  // 1) Niche Research weekly recaps (seeds only, cheap, and the most visible).
  try {
    result.niche = await refreshAllNiches();
  } catch (e) { result.nicheError = (e as Error).message; }

  // 2) Discover channels: discover + enrich new, then refresh stale stats.
  try {
    const crawled = await crawl();
    const refreshed = await refreshIndex();
    result.discover = { ...crawled, ...refreshed };
  } catch (e) { result.discoverError = (e as Error).message; }

  // 3) Explore videos → Postgres (heaviest; also stamps explore_meta.last_refresh).
  try {
    result.explore = await refreshExploreIndex();
  } catch (e) { result.exploreError = (e as Error).message; }

  // Stamp the shared unified-refresh clock (drives every countdown).
  const finished = Date.now();
  await setMeta("refresh_all", finished);

  return NextResponse.json({ ok: true, tookMs: finished - started, ...result });
}
