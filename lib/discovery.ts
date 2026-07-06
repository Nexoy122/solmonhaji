import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { youtubeFetch } from "@/lib/youtubeKeys";
import { NICHES, NicheId, getNicheChannels } from "@/lib/nicheResearch";

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

const CHANNELS = "discovery_channels"; // doc per channel → DiscoveryChannel
const META = "discovery_meta";         // doc "state" → { lastCrawl, ... }
const BLOCKED = "discovery_blocked";   // doc per channelId → { at } — never re-add
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
        (key) => `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${batch.join(",")}&key=${key}`
      )) as { items?: {
        id: string;
        snippet?: { title?: string; description?: string; country?: string; customUrl?: string; thumbnails?: Record<string, { url?: string }> };
        statistics?: { subscriberCount?: string; viewCount?: string; videoCount?: string };
        contentDetails?: { relatedPlaylists?: { uploads?: string } };
      }[] };
      for (const ch of data.items ?? []) {
        out.push({
          id: ch.id,
          title: ch.snippet?.title ?? "Unknown",
          handle: ch.snippet?.customUrl ? (ch.snippet.customUrl.startsWith("@") ? ch.snippet.customUrl : `@${ch.snippet.customUrl}`) : null,
          thumbnailUrl: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
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

NICHE DEFINITIONS (pick ONE by the dominant SUBJECT, use the exact id):
- ranking = videos that literally rank/list/tier things ("Ranking...", "Top 5...", "Tier list", "Best/Worst..."). The word "Ranking" or a numbered list is the giveaway.
- gaming = actual VIDEO GAME content: gameplay footage, Minecraft, Roblox, Fortnite, game facts, game edits. Titles mention games/game mechanics.
- animation = the visuals are ANIMATED/cartoon/drawn (2D/3D animation, animated stories, animation tutorials). NOT live-action.
- commentary = a person reacting to / talking over / giving takes on clips, news, or topics (opinion, reactions, "the comments section", storytime with a voice).
- memes = funny/relatable/brainrot/absurd humor clips, meme formats. Comedy is the point.
- edits_montages = clips cut & synced to music/beat (sports edits, character edits, montages, "velocity edit"). Aesthetic, music-driven.
- captions_only = on-screen TEXT story/facts with NO talking (text over b-roll, silent reddit-style text, AI-voice facts over stock footage).

CRITICAL ANTI-CONFUSION RULES:
- FOOTBALL / SOCCER / basketball / real SPORTS clips are NOT "gaming". A football-highlights or Ronaldo/Messi channel = edits_montages if music-synced, else commentary. NEVER gaming unless it's a VIDEO GAME (FIFA/eFootball the game counts as gaming; real matches do NOT).
- "gaming" requires an actual VIDEO GAME on screen. If unsure whether footage is a real sport vs a game, it is NOT gaming.
- Minecraft/Roblox "facts" or "did you know" channels = gaming.
- If the channel clearly matches NONE of the 7 niches, return niche: null (do not force it).

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

  const existing = (await adminDb().collection(CHANNELS).doc(raw.id).get()).data() as DiscoveryChannel | undefined;

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
  await adminDb().collection(CHANNELS).doc(raw.id).set(doc);
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
  const now = Date.now();
  const blocked = await getBlockedIds();
  const toEnrich: [string, string | null][] = [];
  for (const [id, kw] of candidates) {
    if (blocked.has(id)) continue; // never re-add a manually deleted channel
    const snap = await adminDb().collection(CHANNELS).doc(id).get();
    const d = snap.data() as DiscoveryChannel | undefined;
    if (d && now - d.updatedAt < STALE_MS) continue;
    toEnrich.push([id, kw]);
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
  const db = adminDb();
  const snap = await db.collection(CHANNELS).limit(3000).get();
  const now = Date.now();
  const stale = snap.docs
    .map((d) => d.data() as DiscoveryChannel)
    .filter((c) => now - c.updatedAt > STALE_MS)
    .sort((a, b) => a.updatedAt - b.updatedAt) // oldest first
    .slice(0, opts.max ?? 500);
  if (stale.length === 0) return { stale: 0, refreshed: 0 };

  const raws = await fetchChannelsRaw(stale.map((c) => c.channelId));
  // isSeed=true → skip the region gate (these channels already passed it when
  // they entered the index); skipAi=true → stats only.
  const results = await inChunks(raws, 5, (raw) => enrichChannel(raw, null, true, true).catch(() => null));
  const refreshed = results.filter(Boolean).length;
  await db.collection(META).doc("state").set({ lastIndexRefresh: now, indexRefreshed: refreshed }, { merge: true });
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
  const db = adminDb();
  const maxNew = opts.maxNew ?? EXPANSION_MAX_NEW;
  // VIDEO search (Shorts) is the high-yield source: channels actively posting
  // Shorts about the query. Channel search adds a few more on top.
  const [fromVideos, fromChannels] = await Promise.all([
    searchShortsChannelIds(`${q} shorts`, opts.pages ?? 2),
    searchChannelIds(`${q} shorts`, 25, 1),
  ]);
  const found = [...new Set([...fromVideos, ...fromChannels])];

  // Drop blocked + already-indexed (batched read, not one-by-one).
  const blocked = await getBlockedIds();
  const candidates = found.filter((id) => !blocked.has(id));
  const existing = new Set<string>();
  for (let i = 0; i < candidates.length; i += 100) {
    const refs = candidates.slice(i, i + 100).map((id) => db.collection(CHANNELS).doc(id));
    const snaps = await db.getAll(...refs);
    for (const s of snaps) if (s.exists) existing.add(s.id);
  }
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
  const db = adminDb();
  await Promise.all([
    db.collection(CHANNELS).doc(channelId).delete(),
    db.collection(BLOCKED).doc(channelId).set({ at: Date.now() }),
  ]);
  invalidateChannelCache();
}

// Set of blocked channel IDs (crawler consults this before enriching).
async function getBlockedIds(): Promise<Set<string>> {
  const snap = await adminDb().collection(BLOCKED).get();
  return new Set(snap.docs.map((d) => d.id));
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

// In-memory cache of the full channel index. Filtering/sorting happens on this
// cached copy so we don't re-read hundreds of Firestore docs on every request
// (Discover fires a query on mount + every keystroke/sort). Refreshed at most
// once per CHANNEL_CACHE_TTL, drastically cutting Firestore read quota usage.
const CHANNEL_CACHE_TTL = 5 * 60 * 1000; // 5 min
let channelCache: { at: number; data: DiscoveryChannel[] } | null = null;

async function getAllChannelsCached(): Promise<DiscoveryChannel[]> {
  if (channelCache && Date.now() - channelCache.at < CHANNEL_CACHE_TTL) return channelCache.data;
  const snap = await adminDb().collection(CHANNELS).limit(3000).get();
  const data = snap.docs.map((d) => d.data() as DiscoveryChannel);
  channelCache = { at: Date.now(), data };
  return data;
}

// Invalidate after writes (crawl/delete) so fresh data shows promptly.
function invalidateChannelCache() { channelCache = null; }

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
  const [all, seedMap] = await Promise.all([getAllChannelsCached(), getSeedNicheMap()]);
  return all
    .filter((c) => seedMap.has(c.channelId))
    .map((c) => {
      const seedNiche = seedMap.get(c.channelId)!;
      return { ...c, seedNiche, seedNicheLabel: NICHES.find((n) => n.id === seedNiche)!.label };
    });
}

export async function queryChannels(q: DiscoveryQuery): Promise<{ channels: DiscoveryChannel[]; total: number }> {
  // Read the full index from the in-memory cache, then filter/sort in memory.
  const all = await getAllChannelsCached();
  let list = q.niche && q.niche !== "all" ? all.filter((c) => c.aiNiche === q.niche) : all.slice();

  if (q.faceless) list = list.filter((c) => c.faceless);
  if (q.minSubs) list = list.filter((c) => c.subscriberCount >= q.minSubs!);
  if (q.language) list = list.filter((c) => c.primaryLanguage === q.language);

  // Free-text search: every term must appear somewhere in the channel's
  // name/handle/niche/format/Shorts titles ("funny football", "minecraft"…).
  if (q.q?.trim()) {
    const terms = q.q.toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((c) => {
      const hay = [
        c.title, c.handle ?? "", c.nicheLabel ?? "", c.aiNiche ?? "",
        c.format ?? "", c.sourceKeyword ?? "",
        ...(c.recentVideos ?? []).map((v) => v.title),
      ].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const sort = q.sort ?? "blowing_up";
  if (sort === "relevance" && q.q?.trim()) {
    // Best match: weight by WHERE the terms hit (name > handle > niche > shorts),
    // tiebreak by 48h velocity so strong matches that are also hot rank first.
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
    list.sort((a, b) => score(b) - score(a) || b.views48h - a.views48h);
  } else if (sort === "recent") {
    // "New & rising" = small channels punching above their weight: FEW total
    // videos but HIGH average views. A channel with 20 videos at 1M avg views
    // ranks far above one with 800 videos at 1M. Uses the channel's real total
    // upload count (not the ~30 we sampled). Requires a real signal (10k+ avg).
    const rising = (c: DiscoveryChannel) => {
      if (c.avgShortsViews < 10_000) return -1;
      const uploads = c.totalVideos || c.shortsCount || 1;
      return c.avgShortsViews / Math.sqrt(uploads);
    };
    list.sort((a, b) => rising(b) - rising(a));
  } else {
    list.sort((a, b) =>
      sort === "subscribers" ? b.subscriberCount - a.subscriberCount :
      sort === "views" ? b.viewCount - a.viewCount :
      b.views48h - a.views48h); // blowing_up (also the relevance fallback w/o a query)
  }

  const total = list.length;
  return { channels: list.slice(0, q.limit ?? 60), total };
}

export async function getCrawlMeta(): Promise<{ lastCrawl: number | null; discovered: number; enriched: number }> {
  const d = (await adminDb().collection(META).doc("state").get()).data();
  return { lastCrawl: d?.lastCrawl ?? null, discovered: d?.discovered ?? 0, enriched: d?.enriched ?? 0 };
}
