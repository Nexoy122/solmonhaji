import { NextRequest, NextResponse } from "next/server";
import { NICHES, refreshNiche } from "@/lib/nicheResearch";

export const runtime = "nodejs";
export const maxDuration = 300;

// Weekly refresh trigger. Protect with CRON_SECRET (sent as ?secret= or the
// Authorization: Bearer header). Point a weekly scheduler (Vercel Cron, GitHub
// Action, or your server's crontab) at this endpoint.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.nextUrl.searchParams.get("secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (secret && provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, string> = {};
  for (const n of NICHES) {
    try {
      const r = await refreshNiche(n.id);
      results[n.id] = `ok (${r.trackedChannels} channels, ${r.viral.length} viral)`;
    } catch (err) {
      results[n.id] = `error: ${(err as Error).message}`;
    }
  }
  return NextResponse.json({ refreshedAt: new Date().toISOString(), results });
}
