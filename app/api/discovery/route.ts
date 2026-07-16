import { NextRequest, NextResponse, after } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { hasRole } from "@/lib/admin";
import { hasAnyKey } from "@/lib/youtubeKeys";
import { NICHES, NicheId } from "@/lib/nicheResearch";
import { queryChannels, getCrawlMeta, deleteChannel, startQueryExpansion, expandQuery, DiscoveryQuery } from "@/lib/discovery";

export const runtime = "nodejs";
export const maxDuration = 300; // headroom for post-response query expansion (after())

// Admin UIDs allowed to delete channels (empty in dev = any logged-in user).

// GET /api/discovery?niche=all&sort=blowing_up&minSubs=&faceless=
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAnyKey()) return NextResponse.json({ error: "Discover isn't configured." }, { status: 503 });

  const sp = req.nextUrl.searchParams;
  const niche = (sp.get("niche") ?? "all") as NicheId | "all";
  if (niche !== "all" && !NICHES.some((n) => n.id === niche)) {
    return NextResponse.json({ error: "Unknown niche." }, { status: 400 });
  }
  const sortParam = sp.get("sort") ?? "blowing_up";
  const sort = (["blowing_up", "relevance", "subscribers", "views", "recent"].includes(sortParam) ? sortParam : "blowing_up") as DiscoveryQuery["sort"];

  const query: DiscoveryQuery = {
    q: sp.get("q") || undefined,
    niche,
    sort,
    minSubs: sp.get("minSubs") ? Number(sp.get("minSubs")) : undefined,
    faceless: sp.get("faceless") === "1" ? true : undefined,
    language: sp.get("language") || undefined,
    limit: sp.get("limit") ? Math.min(120, Number(sp.get("limit"))) : 60,
  };

  try {
    // A new search query live-discovers more channels in the background, // every unique search grows the index (deduped per query for 7 days).
    // `expand=1` ("Discover more" button) forces a deeper pass, bypassing the TTL.
    // `after()` keeps the work alive past the response (Vercel-safe).
    let expanding = false;
    if (query.q) {
      const q = query.q;
      const force = sp.get("expand") === "1";
      expanding = await startQueryExpansion(q, force).catch(() => false);
      if (expanding) {
        const opts = force ? { pages: 3, maxNew: 50 } : {};
        after(() => expandQuery(q, opts).catch((e) => console.warn("[discovery] expansion failed:", (e as Error).message)));
      }
    }

    const [{ channels, total }, meta] = await Promise.all([queryChannels(query), getCrawlMeta()]);
    return NextResponse.json({ niches: NICHES, channels, total, meta, expanding });
  } catch (err) {
    console.error("[discovery] error:", err);
    // Detect a temporary capacity issue (Firestore/quota) so the UI can show a
    // graceful "temporarily unavailable" state instead of a hard error.
    const msg = (err as Error)?.message ?? "";
    const unavailable = /RESOURCE_EXHAUSTED|Quota exceeded|UNAVAILABLE|DEADLINE_EXCEEDED|too many requests/i.test(msg);
    return NextResponse.json(
      { error: "Couldn't load channels.", unavailable },
      { status: unavailable ? 503 : 500 }
    );
  }
}

// DELETE /api/discovery?channelId=UC, ...  → remove from index + blocklist it.
export async function DELETE(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(uid, "admin")) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "Missing channelId." }, { status: 400 });

  try {
    await deleteChannel(channelId);
    return NextResponse.json({ ok: true, deleted: channelId });
  } catch (err) {
    console.error("[discovery] delete error:", err);
    return NextResponse.json({ error: "Couldn't delete channel." }, { status: 500 });
  }
}
