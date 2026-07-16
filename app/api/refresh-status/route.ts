import { NextResponse } from "next/server";
import { dbConfigured } from "@/lib/db";
import { getMeta, getLastRefresh } from "@/lib/exploreDb";
import { nextRefreshAt } from "@/lib/refreshSchedule";

export const runtime = "nodejs";

// GET /api/refresh-status → the shared weekly-refresh clock for every page's
// countdown. No auth needed (just two timestamps). nextRefresh is the fixed
// Monday-04:00-UTC slot; lastRefresh is when the unified crawl last finished.
export async function GET() {
  let last = 0;
  if (dbConfigured()) {
    try {
      // Prefer the unified stamp; fall back to the Explore crawl stamp.
      last = (await getMeta("refresh_all")) || (await getLastRefresh());
    } catch { /* db down, still return the schedule */ }
  }
  return NextResponse.json({ lastRefresh: last, nextRefresh: nextRefreshAt() });
}
