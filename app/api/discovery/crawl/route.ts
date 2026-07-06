import { NextRequest, NextResponse, after } from "next/server";
import { hasAnyKey } from "@/lib/youtubeKeys";
import { crawl, seedIndex, refreshIndex } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 300; // crawling many channels takes time

// GET /api/discovery/crawl?secret=CRON_SECRET[&perNiche=15&maxEnrich=120]
// The daily job: (1) discovery crawl — find + enrich new channels, then
// (2) full-index refresh — re-measure every stale channel's stats so the
// Blowing-up ranking stays honest (runs post-response via after()).
// ?refresh=1 runs ONLY the index refresh. ?seed=1 runs only re-seeding.
// Protected by CRON_SECRET (Vercel cron sends x-vercel-cron).
export async function GET(req: NextRequest) {
  // Allow Vercel's own cron scheduler (adds x-vercel-cron header) OR a matching secret.
  const isVercelCron = req.headers.get("x-vercel-cron") != null;
  const secret = process.env.CRON_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!isVercelCron && secret && provided !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!hasAnyKey()) return NextResponse.json({ error: "No YouTube keys configured." }, { status: 503 });

  const perNiche = req.nextUrl.searchParams.get("perNiche") ? Number(req.nextUrl.searchParams.get("perNiche")) : undefined;
  const maxEnrich = req.nextUrl.searchParams.get("maxEnrich") ? Number(req.nextUrl.searchParams.get("maxEnrich")) : undefined;
  const pages = req.nextUrl.searchParams.get("pages") ? Number(req.nextUrl.searchParams.get("pages")) : undefined;
  const seedOnly = req.nextUrl.searchParams.get("seed") === "1"; // just (re)seed the curated channels

  try {
    if (seedOnly) {
      const seeded = await seedIndex();
      return NextResponse.json({ ok: true, mode: "seed", ...seeded });
    }
    if (req.nextUrl.searchParams.get("refresh") === "1") {
      const r = await refreshIndex();
      return NextResponse.json({ ok: true, mode: "refresh", ...r });
    }
    const result = await crawl({ perNiche, maxEnrich, pages });
    // Stats refresh for the whole index continues after the response.
    after(() => refreshIndex().catch((e) => console.warn("[discovery] index refresh failed:", (e as Error).message)));
    return NextResponse.json({ ok: true, ...result, indexRefresh: "started" });
  } catch (err) {
    console.error("[discovery] crawl error:", err);
    return NextResponse.json({ error: "Crawl failed.", detail: (err as Error).message }, { status: 500 });
  }
}
