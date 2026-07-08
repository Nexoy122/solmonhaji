import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { youtubeFetch } from "@/lib/youtubeKeys";
import { NICHES, NicheId, getNicheChannels } from "@/lib/nicheResearch";
import {
  upsertChannel, getChannel, existingIds, freshIds, staleChannels,
  getBlockedSet, deleteChannelDb, queryChannelsDb, channelsByIds,
} from "@/lib/discoveryDb";

// ── Discovery ─────────────────────────────────────────────────────────────────
// An auto-growing index of faceless Shorts channels. A scheduled crawler:
//   1. Seeds from our curated niche channels.
//   2. Discovers NEW channels via niche keyword search on YouTube.
//   3. Enriches each channel: stats, recent OWN Shorts, 48h view velocity,
//      and an AI tag (niche + format + faceless).
//   4. Stores everything in Firestore so the Discover feed reads instantly.
//
// KEY GUARANTEE: each channel doc holds ONLY that channel's own recent Shorts.
// We never mix videos from other channels into a card.

// Channels + blocklist now live in Postgres (see lib/discoveryDb.ts) — unlimited
// rows, no Firestore read cap, SQL filter/sort. These two stay tiny in Firestore.
const META = "discovery_meta";         // doc "state" → { lastCrawl, ... }
const EXPANSIONS = "discovery_expansions"; // doc per search query → { at } — dedupe live expansion

const SHORTS_MAX_SEC = 180;   // Shorts cap (3 min)
const RECENT_ON_CARD = 3;     // how many of the channel's own Shorts to store for the card
const STALE_MS = 24 * 60 * 60 * 1000; // re-enrich a channel at most once/day

// Region allowlist: only channels from these countries are indexed. Channels
// with NO country set (null) are still kept (we AI-flag their language so they
// can be filtered later). Everything else (e.g. IN, PK, BD) is rejected so the
// feed stays on target-region creators.
const ALLOWED_COUNTRIES = new Set([
  "US", "GB", "CA", "AU", "IE", "NZ", // core English-Western
]);
function regionAllowed(country: string | null): boolean {
  if (!country) return true; // keep null-country, filter by language instead
  return ALLOWED_COUNTRIES.has(country);
}

// Content-format taxonomy (mirrors the reference tool's set).
export const FORMATS = [
  "reddit-story", "ai-voice-facts", "edits-montage", "captions-only",
  "compilation", "animation", "reaction-brainrot", "listicle-ranking",
  "asmr", "slideshow-quotes", "tutorial", "clip-repost", "talking-head", "commentary",
] as const;
export type Format = (typeof FORMATS)[number];

export interface DiscoveryShort {
  id: string;
  title: string;
  views: number;
  publishedAt: string;
}

export interface DiscoveryChannel {
  bannerUrl?: string | null;
  channelId: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  url: string;
  subscriberCount: number;
  viewCount: number;          // total channel views
  shortsCount: number;        // # of Shorts we saw (capped ~30)
  totalVideos: number;        // channel's real total upload count (for "rising")
  avgShortsViews: number;     // avg views across recent Shorts
  views48h: number;           // sum of views on Shorts published in the last 48h
  views7d: number;            // sum of views on Shorts published in the last 7 days
  country: string | null;
  // ── AI enrichment ──
  aiNiche: NicheId | null;    // one of our 7 niches (or null if none fit)
  nicheLabel: string | null;
  format: Format | null;
  faceless: boolean;
  primaryLanguage: string | null; // ISO code (en, hi, es…) — for language filtering
  description: string | null;      // channel's About description (trimmed)
  aiTopics: string[];              // AI-extracted topic hashtags (3-8)
  // ── the channel's OWN recent Shorts (never mixed) ──
  recentVideos: DiscoveryShort[];
  // ── bookkeeping ──
  sourceKeyword: string | null; // how we discovered it
  updatedAt: number;
  createdAt: number;
}

// ── Search queries per niche (used to DISCOVER new channels) ──
const NICHE_QUERIES: Record<NicheId, string[]> = {
  commentary: ["football commentary shorts", "reaction commentary shorts", "sports commentary shorts"],
  ranking: ["ranking shorts", "tier list shorts", "top 5 shorts ranking"],
  animation: ["animation shorts", "animated story shorts", "cartoon shorts"],
  gaming: ["gaming shorts", "minecraft shorts", "gameplay shorts"],
  captions_only: ["text story shorts", "captions only shorts", "story time text shorts"],
  edits_montages: ["edit shorts", "montage shorts", "football edit shorts"],
  memes: ["meme shorts", "funny meme shorts", "brainrot shorts"],
};

const DAY = 86400000;

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

// ── YouTube helpers ──

// Search returns channel IDs matching a query (for discovery).
// `pages` walks deeper into results so repeat crawls surface NEW channels
// instead of always hitting the same top hits.
async function searchChannelIds(query: string, perPage = 25, pages = 1): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  for (let p = 0; p < pages; p++) {
    try {
      const tokenParam = pageToken ? `&pageToken=${pageToken}` : "";
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=${perPage}&q=${encodeURIComponent(query)}${tokenParam}&key=${key}`
      )) as { items?: { snippet?: { channelId?: string }; id?: { channelId?: string } }[]; nextPageToken?: string };
      for (const it of data.items ?? []) {
        const id = it.id?.channelId ?? it.snippet?.channelId;
        if (id) ids.push(id);
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    } catch {
      break;
    }
  }
  return [...new Set(ids)];
}

// Search SHORTS VIDEOS for a query and collect their channel IDs. Much higher
// yield than type=channel search: it finds channels actively POSTING Shorts on
// the topic (30-40 unique channels per page vs a handful).
async function searchShortsChannelIds(query: string, pages = 2): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = "";
  for (let p = 0; p < pages; p++) {
    try {
      const tokenParam = pageToken ? `&pageToken=${pageToken}` : "";
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoDuration=short&maxResults=50&q=${encodeURIComponent(query)}${tokenParam}&key=${key}`
      )) as { items?: { snippet?: { channelId?: string } }[]; nextPageToken?: string };
      for (const it of data.items ?? []) {
        const id = it.snippet?.channelId;
        if (id) ids.push(id);
      }
      if (!data.nextPageToken) break;
      pageToken = data.nextPageToken;
    } catch {
      break;
    }
  }
  return [...new Set(ids)];
}

// Run an async fn over items in parallel chunks (bounds concurrency).
async function inChunks<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  }
  return out;
}

interface RawChannel {
  id: string;
  title: string;
  handle: string | null;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  subs: number;
  views: number;
  videoCount: number;
  country: string | null;
  description: string;
  uploadsPlaylist: string;
}

async function fetchChannelsRaw(ids: string[]): Promise<RawChannel[]> {
  const out: RawChannel[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const data = (await youtubeFetch(
        // brandingSettings adds the channel banner at no extra quota cost.
        (key) => `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails,brandingSettings&id=${batch.join(",")}&key=${key}`
      )) as { items?: {
        id: string;
        snippet?: { title?: string; description?: string; country?: string; customUrl?: string; thumbnails?: Record<string, { url?: string }> };
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
        brandingSettings?: { image?: { bannerExternalUrl?: string } };
      }[] };
      for (const ch of data.items ?? []) {
        const banner = ch.brandingSettings?.image?.bannerExternalUrl;
        out.push({
          id: ch.id,
          title: ch.snippet?.title ?? "Unknown",
          handle: ch.snippet?.customUrl ? (ch.snippet.customUrl.startsWith("@") ? ch.snippet.customUrl : `@${ch.snippet.customUrl}`) : null,
          thumbnailUrl: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          // Request a sized crop of the banner (wide, ~1280px).
          bannerUrl: banner ? `${banner}=w1280-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj` : null,
          subs: parseInt(ch.statistics?.subscriberCount ?? "0") || 0,
          views: parseInt(ch.statistics?.viewCount ?? "0") || 0,
          videoCount: parseInt(ch.statistics?.videoCount ?? "0") || 0,
          country: ch.snippet?.country ?? null,
          description: ch.snippet?.description ?? "",
          uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads ?? "",
        });
      }
    } catch (err) {
      console.warn("[discovery] channel batch failed:", (err as Error).message);
    }
  }
  return out;
}

interface OwnShort { id: string; title: string; views: number; publishedAt: string; durationSec: number }

// Pull a channel's OWN recent Shorts (≤3min). Never touches other channels.
async function fetchOwnShorts(uploadsPlaylist: string, limit = 30): Promise<OwnShort[]> {
  if (!uploadsPlaylist) return [];
  let ids: string[] = [];
  try {
    const pl = (await youtubeFetch(
      (key) => `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=${limit}&key=${key}`
    )) as { items?: { contentDetails?: { videoId?: string } }[] };
    ids = (pl.items ?? []).map((v) => v.contentDetails?.videoId).filter(Boolean) as string[];
  } catch {
    return [];
  }
  if (ids.length === 0) return [];
  const shorts: OwnShort[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    try {
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${key}`
      )) as { items?: {
        id: string;
        snippet?: { title?: string; publishedAt?: string };
        statistics?: { viewCount?: string };
        contentDetails?: { duration?: string };
      }[] };
      for (const v of data.items ?? []) {
        const durationSec = parseDuration(v.contentDetails?.duration ?? "");
        if (durationSec === 0 || durationSec > SHORTS_MAX_SEC) continue; // Shorts only
        shorts.push({
          id: v.id,
          title: v.snippet?.title ?? "",
          views: parseInt(v.statistics?.viewCount ?? "0") || 0,
          publishedAt: v.snippet?.publishedAt ?? "",
          durationSec,
        });
      }
    } catch { /* skip */ }
  }
  return shorts;
}

// ── AI tagging (Groq): niche + format + faceless + language + topics ──
async function aiTag(raw: RawChannel, sampleTitles: string[]): Promise<{ niche: NicheId | null; format: Format | null; faceless: boolean; language: string | null; topics: string[] }> {
  if (!process.env.GROQ_API_KEY) return { niche: null, format: null, faceless: false, language: null, topics: [] };
  const formatList = FORMATS.join(", ");
  const prompt = `Channel: "${raw.title}"
Description: ${raw.description.slice(0, 300) || "(none)"}
Recent Shorts titles:
${sampleTitles.slice(0, 8).map((t) => `- ${t.slice(0, 90)}`).join("\n") || "(none)"}`;
  // Retry on 429 (rate limit) with backoff — the free tier limits are strict.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0, max_tokens: 120, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `You are a strict YouTube Shorts channel classifier. Read the channel name + its recent Short titles and pick the SINGLE niche the CHANNEL is actually about. Return STRICT JSON only: {"niche": <id or null>, "format": <id or null>, "faceless": <bool>, "language": <ISO639-1 or null>, "topics": [<3-6 lowercase one-word topic tags, no # or spaces, e.g. "football","cats","reddit","minecraft">]}.

Work through the niches IN THIS ORDER and STOP at the first one that clearly fits. "commentary" is the LAST resort — only use it if NONE of the others fit. Do NOT default to commentary when unsure.

1. ranking — the titles literally RANK / LIST / TIER things. Signals: the word "Ranking"/"Ranked", "Top 5/10", "Tier list", "Best... / Worst...", "vs", numbered lists, "from weakest to strongest". If MOST titles do this → niche = "ranking". This beats everything else. (A "Ranking funniest football moments" channel is RANKING, not commentary and not edits.)

2. gaming — an actual VIDEO GAME is the subject: Minecraft, Roblox, Fortnite, GTA, gameplay footage, game facts/"did you know", game character skits (Roblox/Minecraft avatars on screen). Roblox or Minecraft avatars in the thumbnails/titles → gaming. (FIFA/eFootball the game = gaming; a REAL football match ≠ gaming.)

3. animation — the visuals are ANIMATED / cartoon / drawn (2D/3D animation, animated stories). NOT live-action.

4. captions_only — on-screen TEXT story/facts with NO talking head (text over b-roll, silent reddit-style text, AI-voice facts over stock footage).

5. edits_montages — real clips cut & synced to MUSIC/beat (sports edits, character edits, "velocity edit", montages). Aesthetic, music-driven, minimal talking.

6. memes — the point is COMEDY: funny/relatable/brainrot/absurd humor, meme formats, skits made to make you laugh.

7. commentary — LAST RESORT. A person REACTING to / TALKING OVER / giving opinions on clips, news, or storytime with a voice, that fits none of 1–6. If a channel could be ranking OR commentary, choose RANKING. If it could be gaming OR commentary, choose GAMING.

CRITICAL ANTI-CONFUSION RULES:
- Titles containing "Ranking", "Top N", "Tier", "Best/Worst", or "vs" → ranking (NOT commentary, NOT edits), even if the topic is football or games.
- Roblox / Minecraft avatars or gameplay → gaming (NOT commentary).
- FOOTBALL / SOCCER / basketball / real SPORTS clips are NOT gaming. Real match footage music-synced = edits_montages; ranking real players/moments = ranking.
- "gaming" requires an actual VIDEO GAME on screen. If unsure real sport vs game, it is NOT gaming.
- Only use commentary when 1–6 genuinely do not fit. If truly none of the 7 fit, return niche: null.

format = one of [${formatList}] or null. faceless = true if creator is NOT on camera (voiceover/text/gameplay/animation/compilation). language = ISO 639-1 of the titles' language ("en","es","hi","ar","pt") or null.` },
            { role: "user", content: prompt },
          ],
        }),
      });
      if (res.status === 429) {
        const wait = 2000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) return { niche: null, format: null, faceless: false, language: null, topics: [] };
      const parsed = JSON.parse((await res.json()).choices?.[0]?.message?.content ?? "{}");
      const niche = NICHES.some((n) => n.id === parsed.niche) ? (parsed.niche as NicheId) : null;
      const format = (FORMATS as readonly string[]).includes(parsed.format) ? (parsed.format as Format) : null;
      const language = typeof parsed.language === "string" && /^[a-z]{2}$/.test(parsed.language) ? parsed.language : null;
      const topics = Array.isArray(parsed.topics)
        ? parsed.topics.filter((t: unknown) => typeof t === "string").map((t: string) => t.toLowerCase().replace(/[^a-z0-9]/g, "")).filter(Boolean).slice(0, 6)
        : [];
      return { niche, format, faceless: parsed.faceless === true, language, topics };
    } catch {
      return { niche: null, format: null, faceless: false, language: null, topics: [] };
    }
  }
  return { niche: null, format: null, faceless: false, language: null, topics: [] };
}

// ── Enrich a single channel (stats + own Shorts + AI tag) and upsert it ──
// `isSeed` = a curated channel you provided (exempt from the region filter).
// `skipAi` = stats-only refresh: keep the stored niche/format/faceless tags.
export async function enrichChannel(raw: RawChannel, sourceKeyword: string | null, isSeed = false, skipAi = false): Promise<DiscoveryChannel | null> {
  // Region gate (discovered channels only): reject non-allowed countries so
  // e.g. Indian channels never enter the index. Seeds are trusted → exempt.
  if (!isSeed && !regionAllowed(raw.country)) return null;

  const shorts = await fetchOwnShorts(raw.uploadsPlaylist);
  if (shorts.length === 0) return null; // not a Shorts channel → skip

  const now = Date.now();
  const views48h = shorts.filter((s) => s.publishedAt && now - new Date(s.publishedAt).getTime() <= 2 * DAY).reduce((a, s) => a + s.views, 0);
  const views7d = shorts.filter((s) => s.publishedAt && now - new Date(s.publishedAt).getTime() <= 7 * DAY).reduce((a, s) => a + s.views, 0);
  const avgShortsViews = Math.round(shorts.reduce((a, s) => a + s.views, 0) / shorts.length);

  const existing = await getChannel(raw.id);

  // Stats-only refresh (skipAi) reuses the stored tags — a channel's niche
  // doesn't change day to day, so no Groq call is needed.
  const tag = skipAi && existing
    ? { niche: existing.aiNiche, format: existing.format, faceless: existing.faceless, language: existing.primaryLanguage, topics: existing.aiTopics ?? [] }
    : await aiTag(raw, shorts.map((s) => s.title));
  const nicheLabel = tag.niche ? NICHES.find((n) => n.id === tag.niche)!.label : null;

  // The channel's OWN top recent Shorts for the card (newest-weighted by views).
  const recentVideos: DiscoveryShort[] = [...shorts]
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, RECENT_ON_CARD)
    .map((s) => ({ id: s.id, title: s.title, views: s.views, publishedAt: s.publishedAt }));

  const doc: DiscoveryChannel = {
    channelId: raw.id,
    title: raw.title,
    handle: raw.handle,
    thumbnailUrl: raw.thumbnailUrl,
    bannerUrl: raw.bannerUrl,
    url: raw.handle ? `https://www.youtube.com/${raw.handle}` : `https://www.youtube.com/channel/${raw.id}`,
    subscriberCount: raw.subs,
    viewCount: raw.views,
    shortsCount: shorts.length,
    totalVideos: raw.videoCount,
    avgShortsViews,
    views48h,
    views7d,
    country: raw.country,
    aiNiche: tag.niche,
    nicheLabel,
    format: tag.format,
    faceless: tag.faceless,
    primaryLanguage: tag.language,
    description: raw.description ? raw.description.slice(0, 600) : null,
    aiTopics: tag.topics,
    recentVideos,
    sourceKeyword: existing?.sourceKeyword ?? sourceKeyword,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  };
  await upsertChannel(doc);
  invalidateChannelCache();
  return doc;
}

// ── The crawl: seed + discover + enrich. Bounded per run to respect quota. ──
// QUOTA BUDGET: YouTube's `search` costs 100 units/call; the free daily quota is
// ~10,000. Defaults below do 7 niches × 3 queries × 2 pages = 42 searches
// (~4,200 units), leaving headroom for the enrich calls (channels+playlist+videos
// are 1 unit each). This keeps ONE daily crawl comfortably inside the budget so
// the auto-cron never self-exhausts.
export async function crawl(opts: { perNiche?: number; maxEnrich?: number; pages?: number } = {}): Promise<{ discovered: number; enriched: number }> {
  const perNiche = opts.perNiche ?? 15;
  const maxEnrich = opts.maxEnrich ?? 120;

  // 1) Gather candidate channel IDs: our seeds + fresh search discovery.
  //    Walk several search pages per query so repeat crawls keep finding NEW
  //    channels (page 1 is always the same big names).
  const pages = opts.pages ?? 2;
  const candidates = new Map<string, string | null>(); // id → sourceKeyword
  for (const n of NICHES) {
    for (const id of await getNicheChannels(n.id)) if (!candidates.has(id)) candidates.set(id, `seed:${n.id}`);
    for (const q of NICHE_QUERIES[n.id]) {
      const found = await searchChannelIds(q, perNiche, pages);
      for (const id of found) if (!candidates.has(id)) candidates.set(id, q);
    }
  }

  // 2) Skip blocked (manually deleted) + recently-enriched channels, cap batch.
  //    Freshness is one batched SQL read instead of a Firestore get per candidate.
  const now = Date.now();
  const blocked = await getBlockedIds();
  const candidateIds = [...candidates.keys()].filter((id) => !blocked.has(id));
  const fresh = await freshIds(candidateIds, now, STALE_MS);
  const toEnrich: [string, string | null][] = [];
  for (const id of candidateIds) {
    if (fresh.has(id)) continue; // enriched within the last day → skip
    toEnrich.push([id, candidates.get(id) ?? null]);
    if (toEnrich.length >= maxEnrich) break;
  }

  // 3) Fetch raw channel data, then enrich each.
  let enriched = 0;
  const ids = toEnrich.map(([id]) => id);
  const rawList = await fetchChannelsRaw(ids);
  const kwById = new Map(toEnrich);
  for (const raw of rawList) {
    const kw = kwById.get(raw.id) ?? null;
    const isSeed = kw?.startsWith("seed:") ?? false; // curated seeds bypass region filter
    const res = await enrichChannel(raw, kw, isSeed);
    if (res) enriched++;
  }

  await adminDb().collection(META).doc("state").set({ lastCrawl: now, discovered: candidates.size, enriched }, { merge: true });
  return { discovered: candidates.size, enriched };
}

// ── Seed the index directly from the curated niche channel lists ──
// Enriches every seed channel (region-exempt), so the index has a trusted base
// before/independent of discovery. Skips blocked channels.
export async function seedIndex(): Promise<{ seeds: number; enriched: number }> {
  const blocked = await getBlockedIds();
  const seedIds: string[] = [];
  for (const n of NICHES) {
    for (const id of await getNicheChannels(n.id)) {
      if (!blocked.has(id) && !seedIds.includes(id)) seedIds.push(id);
    }
  }
  let enriched = 0;
  const rawList = await fetchChannelsRaw(seedIds);
  for (const raw of rawList) {
    const res = await enrichChannel(raw, "seed:reseed", true); // isSeed → region-exempt
    if (res) enriched++;
  }
  return { seeds: seedIds.length, enriched };
}

// ── Full-index refresh (vids.so's "video refresh") ──
// Re-measures EVERY indexed channel whose stats are stale (>24h), no matter how
// it entered the index — seeds, crawl, or search expansion. Stats only (no AI
// re-tagging), so it's cheap: ~2 YouTube units per channel, zero Groq calls.
// Keeps "+X / 48h" and the Blowing-up ranking honest across the whole index.
export async function refreshIndex(opts: { max?: number } = {}): Promise<{ stale: number; refreshed: number }> {
  const now = Date.now();
  // Pull the oldest-stale channels straight from Postgres (no 3,000-doc cap).
  const stale = await staleChannels(now, STALE_MS, opts.max ?? 500);
  if (stale.length === 0) return { stale: 0, refreshed: 0 };

  const raws = await fetchChannelsRaw(stale.map((c) => c.channelId));
  // isSeed=true → skip the region gate (these channels already passed it when
  // they entered the index); skipAi=true → stats only.
  const results = await inChunks(raws, 5, (raw) => enrichChannel(raw, null, true, true).catch(() => null));
  const refreshed = results.filter(Boolean).length;
  await adminDb().collection(META).doc("state").set({ lastIndexRefresh: now, indexRefreshed: refreshed }, { merge: true });
  console.log(`[discovery] index refresh: ${stale.length} stale → ${refreshed} refreshed`);
  return { stale: stale.length, refreshed };
}

// ── Search-triggered expansion ──
// Every UNIQUE user search grows the index: we run a live YouTube search for
// that query, enrich the NEW channels found (region filter + AI tag), and
// store them. Deduped per query for 7 days so repeat searches don't burn the
// YouTube search quota (100 units/call).
const EXPANSION_TTL = 7 * 24 * 60 * 60 * 1000;
const EXPANSION_MAX_NEW = 30; // new channels to enrich per query expansion

function expansionKey(q: string): string {
  return q.toLowerCase().trim().replace(/[^a-z0-9 ]+/g, "").replace(/\s+/g, "-").slice(0, 80);
}

// Marks the query as expanded and returns true if it's NEW (caller should then
// run expandQuery in the background, e.g. via next/server `after`).
// `force` bypasses the TTL — used by the "Discover more channels" button.
export async function startQueryExpansion(q: string, force = false): Promise<boolean> {
  const key = expansionKey(q);
  if (!key || key.length < 3) return false;
  const ref = adminDb().collection(EXPANSIONS).doc(key);
  if (!force) {
    const d = (await ref.get()).data();
    if (d && Date.now() - (d.at as number) < EXPANSION_TTL) return false; // already expanded recently
  }
  await ref.set({ at: Date.now(), q });
  return true;
}

export async function expandQuery(q: string, opts: { pages?: number; maxNew?: number } = {}): Promise<number> {
  const maxNew = opts.maxNew ?? EXPANSION_MAX_NEW;
  // VIDEO search (Shorts) is the high-yield source: channels actively posting
  // Shorts about the query. Channel search adds a few more on top.
  const [fromVideos, fromChannels] = await Promise.all([
    searchShortsChannelIds(`${q} shorts`, opts.pages ?? 2),
    searchChannelIds(`${q} shorts`, 25, 1),
  ]);
  const found = [...new Set([...fromVideos, ...fromChannels])];

  // Drop blocked + already-indexed (one batched SQL read).
  const blocked = await getBlockedIds();
  const candidates = found.filter((id) => !blocked.has(id));
  const existing = await existingIds(candidates);
  const fresh = candidates.filter((id) => !existing.has(id)).slice(0, maxNew);
  if (fresh.length === 0) return 0;

  // Enrich in parallel chunks of 5 (each = ~3 YT calls + 1 Groq call).
  const raws = await fetchChannelsRaw(fresh);
  const results = await inChunks(raws, 5, (raw) => enrichChannel(raw, q, false).catch(() => null));
  const added = results.filter(Boolean).length;
  console.log(`[discovery] expansion "${q}": ${found.length} found → ${fresh.length} new → +${added} added`);
  return added;
}

// ── Delete + blocklist ──
// Removes a channel from the index AND records it so the crawler never re-adds it.
export async function deleteChannel(channelId: string): Promise<void> {
  await deleteChannelDb(channelId, Date.now());
  invalidateChannelCache();
}

// Set of blocked channel IDs (crawler consults this before enriching).
async function getBlockedIds(): Promise<Set<string>> {
  return getBlockedSet();
}

// ── Read side: query the index for the Discover feed ──
export interface DiscoveryQuery {
  q?: string;        // free-text search: channel name, niche, format, Shorts titles
  niche?: NicheId | "all";
  sort?: "blowing_up" | "relevance" | "subscribers" | "views" | "recent";
  minSubs?: number;
  faceless?: boolean;
  language?: string; // ISO code, e.g. "en" — filter to one primary language
  limit?: number;
}

// Channels are read from Postgres now (filter/sort/limit in SQL), so there's no
// need to cache the whole index in memory. The seed-niche MAP (which channel the
// USER assigned to each niche) still comes from Firestore's niche_channels and is
// cheaply cached below, since seeds change rarely.
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 min

// No-op kept so call sites (enrich/delete) stay unchanged. Postgres reads are
// always live, so nothing to invalidate.
function invalidateChannelCache() { /* Postgres reads are live — nothing cached */ }

// Seed channels only — the curated set the user provided (niche_channels),
// with their enriched data. Each channel keeps the niche the USER put it in
// (seedNiche) — the source of truth for seeds — separate from the AI's guess.
let seedNicheCache: { at: number; map: Map<string, NicheId> } | null = null;
async function getSeedNicheMap(): Promise<Map<string, NicheId>> {
  if (seedNicheCache && Date.now() - seedNicheCache.at < CHANNEL_CACHE_TTL) return seedNicheCache.map;
  const map = new Map<string, NicheId>();
  for (const n of NICHES) for (const id of await getNicheChannels(n.id)) if (!map.has(id)) map.set(id, n.id);
  seedNicheCache = { at: Date.now(), map };
  return map;
}

export async function getSeedChannels(): Promise<(DiscoveryChannel & { seedNiche: NicheId; seedNicheLabel: string })[]> {
  const seedMap = await getSeedNicheMap();
  // Fetch only the seed channels' rows by ID (not the whole index).
  const rows = await channelsByIds([...seedMap.keys()]);
  return rows
    .filter((c) => seedMap.has(c.channelId))
    .map((c) => {
      const seedNiche = seedMap.get(c.channelId)!;
      return { ...c, seedNiche, seedNicheLabel: NICHES.find((n) => n.id === seedNiche)!.label };
    });
}

// Overlay the USER's seed-niche assignment onto a channel's AI niche. For the
// ~150 curated seed channels, what the user put the channel in ALWAYS wins over
// the AI's guess (the AI mislabels e.g. a Ranking channel as commentary). Non-
// seed (auto-discovered) channels keep their AI niche.
function applySeedNiche(c: DiscoveryChannel, seedMap: Map<string, NicheId>): DiscoveryChannel {
  const seedNiche = seedMap.get(c.channelId);
  if (!seedNiche) return c;
  const nicheLabel = NICHES.find((n) => n.id === seedNiche)?.label ?? c.nicheLabel;
  return { ...c, aiNiche: seedNiche, nicheLabel };
}

export async function queryChannels(q: DiscoveryQuery): Promise<{ channels: DiscoveryChannel[]; total: number }> {
  const seedMap = await getSeedNicheMap();
  const sort = q.sort ?? "blowing_up";

  // ── Niche filter with seed override ──
  // The niche shown/filtered is the EFFECTIVE niche = seed assignment if the
  // channel is a seed, else the AI guess. Because SQL only knows ai_niche, when
  // a specific niche is selected we fetch a broad candidate set (niche:"all")
  // and filter by the effective niche in the app layer. This makes a seed the
  // user filed under "Ranking" show under Ranking even if the AI said commentary,
  // and hides it from the (wrong) commentary bucket.
  const filteringNiche = q.niche && q.niche !== "all" ? q.niche : null;

  // "relevance" needs positional per-term scoring (name > handle > niche > shorts)
  // that doesn't map cleanly to a SQL ORDER BY: fetch broad, rank in JS.
  if (sort === "relevance" && q.q?.trim()) {
    const { channels: raw } = await queryChannelsDb({ ...q, niche: "all", sort: "blowing_up", limit: 5000 });
    let candidates = raw.map((c) => applySeedNiche(c, seedMap));
    if (filteringNiche) candidates = candidates.filter((c) => c.aiNiche === filteringNiche);
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    const score = (c: DiscoveryChannel): number => {
      let s = 0;
      const title = c.title.toLowerCase();
      const handle = (c.handle ?? "").toLowerCase();
      const niche = `${c.nicheLabel ?? ""} ${c.aiNiche ?? ""}`.toLowerCase();
      for (const t of terms) {
        if (title.includes(t)) s += 5;
        if (handle.includes(t)) s += 3;
        if (niche.includes(t)) s += 2;
        if ((c.format ?? "").includes(t)) s += 1;
        for (const v of c.recentVideos ?? []) if (v.title.toLowerCase().includes(t)) s += 1;
      }
      return s;
    };
    const ranked = candidates.sort((a, b) => score(b) - score(a) || b.views48h - a.views48h);
    return { channels: ranked.slice(0, q.limit ?? 60), total: candidates.length };
  }

  if (filteringNiche) {
    // Fetch a broad set (all niches, other filters still applied in SQL), overlay
    // the seed niche, then filter by the effective niche + re-limit in the app.
    const { channels: raw } = await queryChannelsDb({ ...q, niche: "all", limit: 5000 });
    const overlaid = raw.map((c) => applySeedNiche(c, seedMap)).filter((c) => c.aiNiche === filteringNiche);
    return { channels: overlaid.slice(0, q.limit ?? 60), total: overlaid.length };
  }

  // No niche filter → SQL does sort + limit; just overlay the seed niche on the page.
  const { channels, total } = await queryChannelsDb(q);
  return { channels: channels.map((c) => applySeedNiche(c, seedMap)), total };
}

export async function getCrawlMeta(): Promise<{ lastCrawl: number | null; discovered: number; enriched: number }> {
  const d = (await adminDb().collection(META).doc("state").get()).data();
  return { lastCrawl: d?.lastCrawl ?? null, discovered: d?.discovered ?? 0, enriched: d?.enriched ?? 0 };
}
