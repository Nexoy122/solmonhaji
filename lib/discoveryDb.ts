import "server-only";
import { query } from "@/lib/db";
import type { DiscoveryChannel, DiscoveryQuery, DiscoveryShort } from "@/lib/discovery";
import type { NicheId } from "@/lib/nicheResearch";

// ── Discover channel index, Postgres data access ────────────────────────────
// The Discover page's channel index lives in `discovery_channels`. This module
// is the only place that talks SQL for it. discovery.ts calls these; the API
// routes + UI are unchanged (same DiscoveryChannel shape in/out).

// Raw DB row → DiscoveryChannel (camelCase, typed).
interface Row {
  channel_id: string;
  title: string;
  handle: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  url: string | null;
  subscriber_count: string | number;
  view_count: string | number;
  shorts_count: number;
  total_videos: number;
  avg_shorts_views: string | number;
  views_48h: string | number;
  views_7d: string | number;
  country: string | null;
  ai_niche: string | null;
  niche_label: string | null;
  format: string | null;
  faceless: boolean;
  primary_language: string | null;
  description: string | null;
  ai_topics: unknown;
  recent_videos: unknown;
  source_keyword: string | null;
  updated_at: string | number;
  created_at: string | number;
}

const n = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v)) || 0;

function rowToChannel(r: Row): DiscoveryChannel {
  return {
    channelId: r.channel_id,
    title: r.title ?? "",
    handle: r.handle,
    thumbnailUrl: r.thumbnail_url,
    bannerUrl: r.banner_url,
    url: r.url ?? `https://www.youtube.com/channel/${r.channel_id}`,
    subscriberCount: n(r.subscriber_count),
    viewCount: n(r.view_count),
    shortsCount: n(r.shorts_count),
    totalVideos: n(r.total_videos),
    avgShortsViews: n(r.avg_shorts_views),
    views48h: n(r.views_48h),
    views7d: n(r.views_7d),
    country: r.country,
    aiNiche: (r.ai_niche as NicheId) ?? null,
    nicheLabel: r.niche_label,
    format: (r.format as DiscoveryChannel["format"]) ?? null,
    faceless: Boolean(r.faceless),
    primaryLanguage: r.primary_language,
    description: r.description,
    aiTopics: Array.isArray(r.ai_topics) ? (r.ai_topics as string[]) : [],
    recentVideos: Array.isArray(r.recent_videos) ? (r.recent_videos as DiscoveryShort[]) : [],
    sourceKeyword: r.source_keyword,
    updatedAt: n(r.updated_at),
    createdAt: n(r.created_at),
  };
}

// ── Upsert one enriched channel ──────────────────────────────────────────────
export async function upsertChannel(c: DiscoveryChannel): Promise<void> {
  await query(
    `INSERT INTO discovery_channels (
       channel_id, title, handle, thumbnail_url, url, subscriber_count, view_count,
       shorts_count, total_videos, avg_shorts_views, views_48h, views_7d, country,
       ai_niche, niche_label, format, faceless, primary_language, description,
       ai_topics, recent_videos, source_keyword, updated_at, created_at, banner_url
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
       $20::jsonb,$21::jsonb,$22,$23,$24,$25
     )
     ON CONFLICT (channel_id) DO UPDATE SET
       title=EXCLUDED.title, handle=EXCLUDED.handle, thumbnail_url=EXCLUDED.thumbnail_url,
       url=EXCLUDED.url, subscriber_count=EXCLUDED.subscriber_count, view_count=EXCLUDED.view_count,
       shorts_count=EXCLUDED.shorts_count, total_videos=EXCLUDED.total_videos,
       avg_shorts_views=EXCLUDED.avg_shorts_views, views_48h=EXCLUDED.views_48h,
       views_7d=EXCLUDED.views_7d, country=EXCLUDED.country, ai_niche=EXCLUDED.ai_niche,
       niche_label=EXCLUDED.niche_label, format=EXCLUDED.format, faceless=EXCLUDED.faceless,
       primary_language=EXCLUDED.primary_language, description=EXCLUDED.description,
       ai_topics=EXCLUDED.ai_topics, recent_videos=EXCLUDED.recent_videos,
       source_keyword=EXCLUDED.source_keyword, updated_at=EXCLUDED.updated_at,
       banner_url=EXCLUDED.banner_url`,
    [
      c.channelId, c.title, c.handle, c.thumbnailUrl, c.url, c.subscriberCount, c.viewCount,
      c.shortsCount, c.totalVideos, c.avgShortsViews, c.views48h, c.views7d, c.country,
      c.aiNiche, c.nicheLabel, c.format, c.faceless, c.primaryLanguage, c.description,
      JSON.stringify(c.aiTopics ?? []), JSON.stringify(c.recentVideos ?? []),
      c.sourceKeyword, c.updatedAt, c.createdAt, c.bannerUrl ?? null,
    ]
  );
}

// Fetch a single stored channel (for enrich's "reuse tags on stats-only refresh").
export async function getChannel(channelId: string): Promise<DiscoveryChannel | undefined> {
  const rows = await query<Row>(`SELECT * FROM discovery_channels WHERE channel_id = $1`, [channelId]);
  return rows[0] ? rowToChannel(rows[0]) : undefined;
}

// Which of these IDs already exist (for the crawl/expansion "skip already-indexed").
export async function existingIds(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await query<{ channel_id: string }>(
    `SELECT channel_id FROM discovery_channels WHERE channel_id = ANY($1)`,
    [ids]
  );
  return new Set(rows.map((r) => r.channel_id));
}

// Recently-enriched (updated_at within staleMs), crawl skips these.
export async function freshIds(ids: string[], now: number, staleMs: number): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const rows = await query<{ channel_id: string }>(
    `SELECT channel_id FROM discovery_channels WHERE channel_id = ANY($1) AND $2 - updated_at < $3`,
    [ids, now, staleMs]
  );
  return new Set(rows.map((r) => r.channel_id));
}

// Stale channels (oldest first) for the index refresh.
export async function staleChannels(now: number, staleMs: number, max: number): Promise<DiscoveryChannel[]> {
  const rows = await query<Row>(
    `SELECT * FROM discovery_channels WHERE $1 - updated_at > $2 ORDER BY updated_at ASC LIMIT $3`,
    [now, staleMs, max]
  );
  return rows.map(rowToChannel);
}

export async function countChannels(): Promise<number> {
  const rows = await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM discovery_channels`);
  return Number(rows[0]?.c ?? 0);
}

// ── Blocklist ────────────────────────────────────────────────────────────────
export async function getBlockedSet(): Promise<Set<string>> {
  const rows = await query<{ channel_id: string }>(`SELECT channel_id FROM discovery_blocked`);
  return new Set(rows.map((r) => r.channel_id));
}

export async function deleteChannelDb(channelId: string, at: number): Promise<void> {
  await query(`DELETE FROM discovery_channels WHERE channel_id = $1`, [channelId]);
  await query(
    `INSERT INTO discovery_blocked (channel_id, at) VALUES ($1, $2)
     ON CONFLICT (channel_id) DO UPDATE SET at = EXCLUDED.at`,
    [channelId, at]
  );
}

// ── Read side: the Discover feed query (filter + sort + limit in SQL) ─────────
export async function queryChannelsDb(
  q: DiscoveryQuery
): Promise<{ channels: DiscoveryChannel[]; total: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const p = (v: unknown) => { params.push(v); return `$${params.length}`; };

  if (q.niche && q.niche !== "all") where.push(`ai_niche = ${p(q.niche)}`);
  if (q.faceless) where.push(`faceless = TRUE`);
  if (q.minSubs) where.push(`subscriber_count >= ${p(q.minSubs)}`);
  if (q.language) where.push(`primary_language = ${p(q.language)}`);

  // Free-text: every term must appear somewhere in the searchable haystack
  // (title, handle, niche label, format, source keyword, recent Shorts titles).
  if (q.q?.trim()) {
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    for (const t of terms) {
      const like = `%${t}%`;
      where.push(
        `(LOWER(title) LIKE ${p(like)} OR LOWER(COALESCE(handle,'')) LIKE ${p(like)}
          OR LOWER(COALESCE(niche_label,'')) LIKE ${p(like)} OR LOWER(COALESCE(ai_niche,'')) LIKE ${p(like)}
          OR LOWER(COALESCE(format,'')) LIKE ${p(like)} OR LOWER(COALESCE(source_keyword,'')) LIKE ${p(like)}
          OR LOWER(recent_videos::text) LIKE ${p(like)})`
      );
    }
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Total (for the "X channels", Discover hides the count now, but the API
  // still returns it and the Explore Channels tab uses the same shape).
  const totalRows = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM discovery_channels ${whereSql}`,
    params
  );
  const total = Number(totalRows[0]?.c ?? 0);

  // ORDER BY per sort mode. "recent" = new & rising (high avg views ÷ √uploads,
  // requires a real signal ≥10k avg). "relevance" without a query → blowing_up.
  const sort = q.sort ?? "blowing_up";
  let orderSql: string;
  if (sort === "recent") {
    orderSql = `ORDER BY (CASE WHEN avg_shorts_views < 10000 THEN -1
      ELSE avg_shorts_views / SQRT(GREATEST(total_videos, shorts_count, 1)) END) DESC`;
  } else if (sort === "subscribers") {
    orderSql = `ORDER BY subscriber_count DESC`;
  } else if (sort === "views") {
    orderSql = `ORDER BY view_count DESC`;
  } else {
    orderSql = `ORDER BY views_48h DESC`; // blowing_up (+ relevance fallback)
  }

  const limit = q.limit ?? 60;
  const rows = await query<Row>(
    `SELECT * FROM discovery_channels ${whereSql} ${orderSql} LIMIT ${p(limit)}`,
    params
  );
  return { channels: rows.map(rowToChannel), total };
}

// All channels matching seed IDs (for the Explore Channels tab's getSeedChannels).
export async function channelsByIds(ids: string[]): Promise<DiscoveryChannel[]> {
  if (ids.length === 0) return [];
  const rows = await query<Row>(
    `SELECT * FROM discovery_channels WHERE channel_id = ANY($1)`,
    [ids]
  );
  return rows.map(rowToChannel);
}
