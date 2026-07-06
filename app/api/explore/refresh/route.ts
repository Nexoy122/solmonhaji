import { NextRequest, NextResponse } from "next/server";
import { hasAnyKey } from "@/lib/youtubeKeys";
import { dbConfigured } from "@/lib/db";
import { refreshExploreIndex, isRefreshDue } from "@/lib/exploreDb";

export const runtime = "nodejs";
export const maxDuration = 300;

// GET /api/explore/refresh?secret=CRON_SECRET[&force=1]
// Weekly crawl: pulls every Short from every seed creator into Postgres.
// Protected by CRON_SECRET (Vercel cron sends x-vercel-cron).
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  const secret = process.env.CRON_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!isVercelCron && secret && provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!dbConfigured()) return NextResponse.json({ error: "Explore database isn't configured." }, { status: 503 });
  if (!hasAnyKey()) return NextResponse.json({ error: "No YouTube keys configured." }, { status: 503 });

  const force = req.nextUrl.searchParams.get("force") === "1";
  if (!force && !(await isRefreshDue())) {
    return NextResponse.json({ ok: true, skipped: "not due yet (weekly)" });
  }

  try {
    const result = await refreshExploreIndex();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[explore/refresh] error:", err);
    return NextResponse.json({ error: "Refresh failed.", detail: (err as Error).message }, { status: 500 });
  }
}
