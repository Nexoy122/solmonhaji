import "server-only";
import { db, query } from "@/lib/db";
import { youtubeFetch } from "@/lib/youtubeKeys";
import { NICHES, NicheId, getNicheChannels } from "@/lib/nicheResearch";
import { isWeeklyRefreshDue } from "@/lib/refreshSchedule";

// ── Explore video index, Postgres edition ─────────────────────────────────────
// Deep-crawls EVERY Short from EVERY seed creator into Postgres (unlimited rows,
// no Firestore read caps). The feed refreshes weekly; the UI reads pages via SQL.

const SHORTS_MAX_SEC = 180;          // Shorts only (≤3 min)
const MAX_PER_CHANNEL = 1000;        // safety ceiling per channel (deep paginate up to this)
export const REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // weekly

export interface ExploreVideoRow {
  video_id: string;
  channel_id: string;
  title: string;
  thumbnail: string | null;
  views: number;
  duration_sec: number;
  published_at: string | null;
  outlier_x: number;
  velocity: number;
  // joined channel fields
  channel_name: string;
  channel_avatar: string | null;
  subs: number;
  seed_niche: string | null;
  seed_niche_label: string | null;
}

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

// ── The crawl: fetch every Short per seed channel → upsert into Postgres ──

interface ChannelInfo {
  id: string; name: string; avatar: string | null;
  subs: number; viewCount: number; avgViews: number; totalVideos: number; uploadsPlaylist: string;
}

async function fetchChannels(ids: string[]): Promise<ChannelInfo[]> {
  const out: ChannelInfo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${key}`
      )) as { items?: {
        id: string;
        snippet?: { title?: string; thumbnails?: Record<string, { url?: string }> };
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }[] };
      for (const ch of data.items ?? []) {
        const views = parseInt(ch.statistics?.viewCount ?? "0") || 0;
        const vids = parseInt(ch.statistics?.videoCount ?? "0") || 0;
        out.push({
          id: ch.id,
          name: ch.snippet?.title ?? "Unknown",
          avatar: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          subs: parseInt(ch.statistics?.subscriberCount ?? "0") || 0,
          viewCount: views,
          avgViews: vids > 0 ? Math.round(views / vids) : 0,
          totalVideos: vids,
          uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads ?? "",
        });
      }
    } catch (err) { console.warn("[exploreDb] channel batch failed:", (err as Error).message); }
  }
  return out;
}

interface VidRow { id: string; title: string; thumbnail: string; views: number; durationSec: number; publishedAt: string }

// Deep-paginate a channel's uploads (every video, up to MAX_PER_CHANNEL).
async function fetchAllShorts(ch: ChannelInfo): Promise<VidRow[]> {
  if (!ch.uploadsPlaylist) return [];
  const ids: string[] = [];
  let token = "";
  try {
    while (ids.length < MAX_PER_CHANNEL) {
      const tp = token ? `&pageToken=${token}` : "";
      const pl = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${ch.uploadsPlaylist}&maxResults=50${tp}&key=${key}`
      )) as { items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string };
      for (const it of pl.items ?? []) { const id = it.contentDetails?.videoId; if (id) ids.push(id); }
      if (!pl.nextPageToken) break;
      token = pl.nextPageToken;
    }
  } catch { /* partial is fine */ }

  const out: VidRow[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${key}`
      )) as { items?: {
        id: string;
        snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
        statistics?: { viewCount?: string };
        contentDetails?: { duration?: string };
      }[] };
      for (const v of data.items ?? []) {
        const durationSec = parseDuration(v.contentDetails?.duration ?? "");
        if (durationSec === 0 || durationSec > SHORTS_MAX_SEC) continue; // Shorts only
        out.push({
          id: v.id,
          title: v.snippet?.title ?? "",
          thumbnail: v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.medium?.url ?? "",
          views: parseInt(v.statistics?.viewCount ?? "0") || 0,
          durationSec,
          publishedAt: v.snippet?.publishedAt ?? "",
        });
      }
    } catch { /* skip batch */ }
  }
  return out;
}

// Upsert one channel + all its shorts. Returns how many videos it stored.
async function upsertChannel(ch: ChannelInfo, seedNiche: NicheId | null): Promise<number> {
  const now = Date.now();
  const nicheLabel = seedNiche ? NICHES.find((n) => n.id === seedNiche)!.label : null;
  await query(
    `INSERT INTO explore_channels (channel_id, title, handle, thumbnail_url, url, subscriber_count, view_count, avg_views, total_videos, seed_niche, seed_niche_label, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (channel_id) DO UPDATE SET
       title=EXCLUDED.title, thumbnail_url=EXCLUDED.thumbnail_url, subscriber_count=EXCLUDED.subscriber_count,
       view_count=EXCLUDED.view_count, avg_views=EXCLUDED.avg_views, total_videos=EXCLUDED.total_videos,
       seed_niche=EXCLUDED.seed_niche, seed_niche_label=EXCLUDED.seed_niche_label, updated_at=EXCLUDED.updated_at`,
    [ch.id, ch.name, null, ch.avatar, `https://www.youtube.com/channel/${ch.id}`, ch.subs, ch.viewCount, ch.avgViews, ch.totalVideos, seedNiche, nicheLabel, now]
  );

  const shorts = await fetchAllShorts(ch);
  if (shorts.length === 0) return 0;

  // Batch insert videos (parameterised, chunked to stay under param limits).
  const pool = db();
  const client = await pool.connect();
  try {
    for (let i = 0; i < shorts.length; i += 150) {
      const chunk = shorts.slice(i, i + 150);
      const values: unknown[] = [];
      const rows = chunk.map((v, j) => {
        const days = v.publishedAt ? Math.max(1, (now - new Date(v.publishedAt).getTime()) / 86400000) : 1;
        const outlierX = ch.avgViews > 0 ? v.views / ch.avgViews : 0;
        const velocity = v.views / days;
        const b = j * 10;
        values.push(v.id, ch.id, v.title, v.thumbnail, v.views, v.durationSec, v.publishedAt || null, outlierX, velocity, now);
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10})`;
      }).join(",");
      await client.query(
        `INSERT INTO explore_videos (video_id, channel_id, title, thumbnail, views, duration_sec, published_at, outlier_x, velocity, updated_at)
         VALUES ${rows}
         ON CONFLICT (video_id) DO UPDATE SET
           views=EXCLUDED.views, outlier_x=EXCLUDED.outlier_x, velocity=EXCLUDED.velocity,
           title=EXCLUDED.title, thumbnail=EXCLUDED.thumbnail, updated_at=EXCLUDED.updated_at`,
        values
      );
    }
  } finally {
    client.release();
  }
  return shorts.length;
}

// Full refresh: crawl every seed channel's every Short into Postgres.
export async function refreshExploreIndex(): Promise<{ channels: number; videos: number }> {
  // Build seed-niche map (user's assignment = source of truth).
  const seedNiche = new Map<string, NicheId>();
  for (const n of NICHES) for (const id of await getNicheChannels(n.id)) if (!seedNiche.has(id)) seedNiche.set(id, n.id);

  const channels = await fetchChannels([...seedNiche.keys()]);
  let totalVideos = 0;
  for (const ch of channels) {
    totalVideos += await upsertChannel(ch, seedNiche.get(ch.id) ?? null);
  }
  await query(
    `INSERT INTO explore_meta (key, value) VALUES ('last_refresh', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [Date.now()]
  );
  return { channels: channels.length, videos: totalVideos };
}

export async function getLastRefresh(): Promise<number> {
  const rows = await query<{ value: string }>(`SELECT value FROM explore_meta WHERE key='last_refresh'`);
  return rows[0] ? Number(rows[0].value) : 0;
}

export async function isRefreshDue(): Promise<boolean> {
  // Weekly slot (Monday 04:00 UTC), shared across all pages.
  const last = await getLastRefresh();
  return isWeeklyRefreshDue(last);
}

// ── Shared meta store (drives the unified weekly refresh + countdown) ──
// The whole app refreshes together; `refresh_all` records when the last unified
// crawl finished so every page's countdown reads the same clock.
export async function getMeta(key: string): Promise<number> {
  const rows = await query<{ value: string }>(`SELECT value FROM explore_meta WHERE key=$1`, [key]);
  return rows[0] ? Number(rows[0].value) : 0;
}

export async function setMeta(key: string, value: number): Promise<void> {
  await query(
    `INSERT INTO explore_meta (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [key, value]
  );
}

// ── Paginated reads (unlimited; only fetches one page) ──
export interface FeedQuery {
  niche?: NicheId | "all";
  sort?: "views" | "outlier" | "velocity" | "recent";
  minViews?: number;
  minSubs?: number;
  maxSubs?: number;
  minDuration?: number;
  maxDuration?: number;
  publishedAfter?: number; // ms timestamp
  limit?: number;
  offset?: number;
}

export async function queryFeed(q: FeedQuery): Promise<{ videos: ExploreVideoRow[]; total: number; channelCount: number }> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (clause: string, val: unknown) => { params.push(val); where.push(clause.replace("?", `$${params.length}`)); };

  if (q.niche && q.niche !== "all") add("c.seed_niche = ?", q.niche);
  if (q.minViews) add("v.views >= ?", q.minViews);
  if (q.minSubs) add("c.subscriber_count >= ?", q.minSubs);
  if (q.maxSubs) add("c.subscriber_count < ?", q.maxSubs);
  if (q.minDuration != null) add("v.duration_sec >= ?", q.minDuration);
  if (q.maxDuration != null) add("v.duration_sec <= ?", q.maxDuration);
  if (q.publishedAfter) add("v.published_at >= to_timestamp(? / 1000.0)", q.publishedAfter);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderBy =
    q.sort === "outlier" ? "v.outlier_x DESC" :
    q.sort === "velocity" ? "v.velocity DESC" :
    q.sort === "recent" ? "v.published_at DESC NULLS LAST" :
    "v.views DESC";
  const limit = Math.min(120, q.limit ?? 60);
  const offset = Math.max(0, q.offset ?? 0);

  const videos = await query<ExploreVideoRow>(
    `SELECT v.video_id, v.channel_id, v.title, v.thumbnail, v.views, v.duration_sec, v.published_at, v.outlier_x, v.velocity,
            c.title AS channel_name, c.thumbnail_url AS channel_avatar, c.subscriber_count AS subs,
            c.seed_niche, c.seed_niche_label
       FROM explore_videos v JOIN explore_channels c ON c.channel_id = v.channel_id
       ${whereSql}
       ORDER BY ${orderBy}
       LIMIT ${limit} OFFSET ${offset}`,
    params
  );

  const totals = await query<{ total: string; ch: string }>(
    `SELECT COUNT(*) AS total, COUNT(DISTINCT v.channel_id) AS ch
       FROM explore_videos v JOIN explore_channels c ON c.channel_id = v.channel_id
       ${whereSql}`,
    params
  );
  return {
    videos,
    total: Number(totals[0]?.total ?? 0),
    channelCount: Number(totals[0]?.ch ?? 0),
  };
}
