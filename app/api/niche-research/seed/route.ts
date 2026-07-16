import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";
import { hasRole } from "@/lib/admin";
import { NICHES, NicheId, resolveChannelIds, getNicheChannels, setNicheChannels } from "@/lib/nicheResearch";

export const runtime = "nodejs";
export const maxDuration = 60;

// Admin UIDs allowed to seed the tracked channel lists.

// POST /api/niche-research/seed  { niche, channels: string[], replace?: boolean }
// Resolves handles/URLs/IDs → channel IDs and stores them for the niche.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(uid, "admin")) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const niche = body?.niche as NicheId;
  const channels: string[] = Array.isArray(body?.channels) ? body.channels : [];
  const replace = !!body?.replace;

  if (!NICHES.some((n) => n.id === niche)) return NextResponse.json({ error: "Unknown niche." }, { status: 400 });
  if (channels.length === 0) return NextResponse.json({ error: "Provide channels." }, { status: 400 });

  const resolved = await resolveChannelIds(channels);
  const newIds = resolved.map((r) => r.id);
  const failed = channels.filter((c) => !resolved.some((r) => r.input === c.trim()));

  const existing = replace ? [] : await getNicheChannels(niche);
  const merged = [...new Set([...existing, ...newIds])];
  await setNicheChannels(niche, merged);

  return NextResponse.json({
    niche, added: newIds.length, total: merged.length,
    resolved: resolved.map((r) => ({ input: r.input, id: r.id })),
    failed,
  });
}

// GET → list current tracked channel counts per niche.
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasRole(uid, "admin")) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const counts: Record<string, number> = {};
  for (const n of NICHES) counts[n.id] = (await getNicheChannels(n.id)).length;
  return NextResponse.json({ counts });
}
