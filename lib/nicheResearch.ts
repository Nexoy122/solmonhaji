import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { youtubeFetch } from "@/lib/youtubeKeys";

// ── Niche Researcher ──────────────────────────────────────────────────────────
// Tracks a curated set of channels per niche. Weekly it snapshots each channel's
// stats + recent uploads, computes deltas (subs/views gained, new uploads,
// virality rate), finds viral videos, ranks top gainers, and writes an AI brief.
// Everything is cached in Firestore so the page reads instantly.

export const NICHES = [
  { id: "commentary", label: "Commentary" },
  { id: "ranking", label: "Ranking" },
  { id: "animation", label: "Animation" },
  { id: "gaming", label: "Gaming" },
  { id: "captions_only", label: "Captions Only" },
  { id: "edits_montages", label: "Edits/Montages" },
  { id: "memes", label: "Memes" },
] as const;

export type NicheId = (typeof NICHES)[number]["id"];

// ── Firestore collections ──
const CH_LIST = "niche_channels";       // doc per niche → { channelIds: string[] }
const SNAP = "channel_snapshots";       // doc per channel → { history: Snapshot[] }
const RECAP = "niche_recaps";           // doc per niche → latest NicheRecap
const HISTORY = "niche_recaps_history"; // doc per niche+week → archived NicheRecap

// Monday-anchored week key (e.g. "2026-06-29") for the week a timestamp falls in.
export function weekKeyOf(ts: number): string {
  const d = new Date(ts);
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday.toISOString().split("T")[0];
}

interface Snapshot {
  at: number;
  subs: number;
  views: number;
  videoCount: number;
}

export interface ViralVideo {
  id: string;
  title: string;
  channelName: string;
  thumbnail: string;
  views: number;
  url: string;
  outlierX: number; // how many times the channel's average
}

export interface RankedChannel {
  channelId: string;
  name: string;
  avatar: string | null;
  subs: number;
  delta: number;     // subs or views gained
  deltaPct?: number; // for sub gainers
  uploads?: number;  // for most-uploads
}

export interface SubNiche {
  name: string;             // e.g. "Animal Rankings"
  viralCount: number;       // # of viral videos in this sub-niche
  viralRate: number;        // % of the niche's viral videos this sub-niche is
  avgViews: number;         // avg views of its viral videos
  totalViews: number;       // combined views
  topOutlierX: number;      // the biggest outlier multiplier in it
  topChannels: string[];    // channel names driving it
  exampleTitle: string;     // a standout title
  // ── paid-tier detail ──
  opportunity: "hot" | "rising" | "saturated" | "untapped"; // computed signal
  movement: number;         // % change in viral share vs last week (0 if no history)
  titlePatterns: string[];  // common winning title formats/words
  aiInsight: string;        // why it's winning
  contentAngle: string;     // a concrete idea to try
  examples: { title: string; thumbnail: string; url: string; views: number; outlierX: number }[];
}

export interface NicheRecap {
  niche: NicheId;
  label: string;
  updatedAt: number;
  weekKey: string; // Monday-anchored week this recap covers, e.g. "2026-06-29"
  trackedChannels: number;
  viewsGained: number;
  subsGained: number;
  newUploads: number;
  viralityRate: number; // % of new uploads that hit 2x+ outlier
  brief: string;
  viral: ViralVideo[];
  resurging: ViralVideo[]; // older videos (>1 week) still pulling big views
  subNiches: SubNiche[];
  topSubGainers: RankedChannel[];
  topViewGainers: RankedChannel[];
  mostUploads: RankedChannel[];
}

// ── Channel list management ──
// Seeds-only model: the tracked list IS the curated list (channelIds == seeds).
export async function getNicheChannels(niche: NicheId): Promise<string[]> {
  const snap = await adminDb().collection(CH_LIST).doc(niche).get();
  const d = snap.data();
  return (d?.seeds as string[]) ?? (d?.channelIds as string[]) ?? [];
}

// Alias — in the seeds-only model the tracked set and the seed set are the same.
export async function getNicheSeeds(niche: NicheId): Promise<string[]> {
  return getNicheChannels(niche);
}

// ADD channels to a niche (merges with existing). Used by seeding + "Add Channel".
export async function setNicheChannels(niche: NicheId, channelIds: string[]): Promise<void> {
  const existing = await getNicheChannels(niche);
  const merged = [...new Set([...existing, ...channelIds])];
  await adminDb().collection(CH_LIST).doc(niche).set({ channelIds: merged, seeds: merged }, { merge: true });
}

// Resolve @handles / URLs / IDs → channel IDs (batched where possible).
export async function resolveChannelIds(inputs: string[]): Promise<{ id: string; input: string }[]> {
  const out: { id: string; input: string }[] = [];
  for (const raw of inputs) {
    const input = raw.trim();
    if (!input) continue;
    const idMatch = input.match(/(UC[a-zA-Z0-9_-]{22})/);
    if (idMatch) { out.push({ id: idMatch[1], input }); continue; }
    const handleMatch = input.match(/@([a-zA-Z0-9_.-]+)/) || input.match(/youtube\.com\/@([a-zA-Z0-9_.-]+)/);
    const handle = handleMatch ? handleMatch[1] : input.replace(/^@/, "");
    try {
      const data = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${encodeURIComponent(handle)}&key=${key}`
      )) as { items?: { id: string }[] };
      const id = data.items?.[0]?.id;
      if (id) out.push({ id, input });
    } catch { /* skip */ }
  }
  return out;
}

// ── Fetch current stats + recent uploads for a batch of channels ──
interface ChannelNow {
  id: string;
  name: string;
  avatar: string | null;
  subs: number;
  views: number;
  videoCount: number;
  uploadsPlaylist: string;
}

async function fetchChannelsNow(ids: string[]): Promise<ChannelNow[]> {
  const result: ChannelNow[] = [];
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
        result.push({
          id: ch.id,
          name: ch.snippet?.title ?? "Unknown",
          avatar: ch.snippet?.thumbnails?.medium?.url ?? ch.snippet?.thumbnails?.default?.url ?? null,
          subs: parseInt(ch.statistics?.subscriberCount ?? "0") || 0,
          views: parseInt(ch.statistics?.viewCount ?? "0") || 0,
          videoCount: parseInt(ch.statistics?.videoCount ?? "0") || 0,
          uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads ?? "",
        });
      }
    } catch (err) {
      console.warn("[niche-research] channel batch failed:", (err as Error).message);
    }
  }
  return result;
}

// Recent uploads (last 7 days) for one channel, with view counts.
interface RecentVideo { id: string; title: string; publishedAt: string; views: number; thumbnail: string }
async function fetchRecentUploads(uploadsPlaylist: string): Promise<RecentVideo[]> {
  if (!uploadsPlaylist) return [];
  try {
    const pl = (await youtubeFetch(
      (key) => `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${uploadsPlaylist}&maxResults=25&key=${key}`
    )) as { items?: { contentDetails?: { videoId?: string } }[] };
    // Return the last ~25 uploads (any age); the caller classifies new vs older.
    const recentIds = (pl.items ?? [])
      .map((v) => v.contentDetails?.videoId)
      .filter(Boolean) as string[];
    if (recentIds.length === 0) return [];

    const vids = (await youtubeFetch(
      (key) => `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${recentIds.join(",")}&key=${key}`
    )) as { items?: {
      id: string;
      snippet?: { title?: string; publishedAt?: string; thumbnails?: Record<string, { url?: string }> };
      statistics?: { viewCount?: string };
    }[] };
    return (vids.items ?? []).map((v): RecentVideo => ({
      id: v.id,
      title: v.snippet?.title ?? "",
      publishedAt: v.snippet?.publishedAt ?? "",
      views: parseInt(v.statistics?.viewCount ?? "0") || 0,
      thumbnail: v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.medium?.url ?? "",
    }));
  } catch {
    return [];
  }
}

// ── The weekly refresh for one niche ──
// SEEDS-ONLY: tracks exactly the curated channels (like the reference tool).
// No noisy keyword auto-discovery → 100% accurate niches.
export async function refreshNiche(niche: NicheId): Promise<NicheRecap> {
  const label = NICHES.find((n) => n.id === niche)!.label;
  const seeds = await getNicheSeeds(niche);
  const channelIds = seeds.length ? seeds : await getNicheChannels(niche);
  const now = await fetchChannelsNow(channelIds);
  // Keep the tracked list == the curated set.
  await adminDb().collection(CH_LIST).doc(niche).set({ channelIds, seeds: seeds.length ? seeds : channelIds }, { merge: true });

  const db = adminDb();
  let viewsGained = 0, subsGained = 0, newUploads = 0, viralCount = 0, hasPrior = false;
  const subGainers: RankedChannel[] = [];
  const viewGainers: RankedChannel[] = [];
  const uploaders: RankedChannel[] = [];
  const viral: ViralVideo[] = [];
  const resurging: ViralVideo[] = [];
  const WEEK = 7 * 86400000;

  for (const ch of now) {
    // Read prior snapshot to compute deltas.
    const snapDoc = await db.collection(SNAP).doc(ch.id).get();
    const history: Snapshot[] = (snapDoc.data()?.history as Snapshot[]) ?? [];
    const prev = history.length ? history[history.length - 1] : null;
    if (prev) hasPrior = true;

    const dSubs = prev ? ch.subs - prev.subs : 0;
    const dViews = prev ? ch.views - prev.views : 0;
    const dUploads = prev ? Math.max(0, ch.videoCount - prev.videoCount) : 0;

    if (dSubs > 0) subsGained += dSubs;
    if (dViews > 0) viewsGained += dViews;
    newUploads += dUploads;

    subGainers.push({ channelId: ch.id, name: ch.name, avatar: ch.avatar, subs: ch.subs, delta: dSubs, deltaPct: prev && prev.subs > 0 ? (dSubs / prev.subs) * 100 : 0 });
    viewGainers.push({ channelId: ch.id, name: ch.name, avatar: ch.avatar, subs: ch.subs, delta: dViews });
    uploaders.push({ channelId: ch.id, name: ch.name, avatar: ch.avatar, subs: ch.subs, delta: 0, uploads: dUploads });

    // Uploads → outlier detection (2x+ the channel's average views).
    //  - VIRAL     = high-outlier videos published in the last 7 days.
    //  - RESURGING = high-outlier videos OLDER than 7 days but still huge.
    const recent = await fetchRecentUploads(ch.uploadsPlaylist);
    const avgViews = ch.videoCount > 0 ? ch.views / ch.videoCount : 0;
    for (const v of recent) {
      const outlierX = avgViews > 0 ? v.views / avgViews : 0;
      if (outlierX < 2) continue;
      const vid = { id: v.id, title: v.title, channelName: ch.name, thumbnail: v.thumbnail, views: v.views, url: `https://www.youtube.com/watch?v=${v.id}`, outlierX };
      const ageMs = v.publishedAt ? Date.now() - new Date(v.publishedAt).getTime() : 0;
      if (ageMs <= WEEK) { viralCount++; viral.push(vid); }
      else if (v.views >= 1_000_000) resurging.push(vid);
    }

    // Store the new snapshot (keep last 12 weeks).
    history.push({ at: Date.now(), subs: ch.subs, views: ch.views, videoCount: ch.videoCount });
    await db.collection(SNAP).doc(ch.id).set({ history: history.slice(-12) });
  }

  const viralityRate = newUploads > 0 ? Math.round((viralCount / newUploads) * 100) : 0;

  // All the niche's outlier videos feed the sub-niche clustering.
  const allViral = [...viral, ...resurging];
  const subNiches = await clusterSubNiches(label, niche, allViral);

  const nowTs = Date.now();
  const recap: NicheRecap = {
    niche, label, updatedAt: nowTs, weekKey: weekKeyOf(nowTs),
    trackedChannels: now.length,
    viewsGained, subsGained, newUploads, viralityRate,
    brief: await generateBrief(label, { viewsGained, subsGained, newUploads, viralityRate, viral, now: now.length, hasPrior }),
    viral: viral.sort((a, b) => b.views - a.views).slice(0, 12),
    resurging: resurging.sort((a, b) => b.views - a.views).slice(0, 12),
    subNiches,
    topSubGainers: subGainers.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
    topViewGainers: viewGainers.filter((c) => c.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5),
    mostUploads: uploaders.filter((c) => (c.uploads ?? 0) > 0).sort((a, b) => (b.uploads ?? 0) - (a.uploads ?? 0)).slice(0, 5),
  };

  // Save the latest recap + archive it under this week's key (so history persists).
  await db.collection(RECAP).doc(niche).set(recap);
  await db.collection(HISTORY).doc(`${niche}_${recap.weekKey}`).set(recap);
  return recap;
}

// ── AI brief (Groq) ──
async function generateBrief(
  label: string,
  d: { viewsGained: number; subsGained: number; newUploads: number; viralityRate: number; viral: ViralVideo[]; now: number; hasPrior: boolean }
): Promise<string> {
  if (!process.env.GROQ_API_KEY) return "";
  const hasPrior = d.hasPrior;
  const topViral = d.viral.slice(0, 5).map((v) => `"${v.title}" by ${v.channelName} — ${fmt(v.views)} views (${v.outlierX.toFixed(1)}x outlier)`).join("; ");
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 320,
        messages: [
          { role: "system", content: "You are a YouTube Shorts niche analyst. Write ONE punchy paragraph (4-6 sentences) recapping the week in a niche: what's winning, the standout viral videos + why they worked (patterns in titles/hooks), and ONE concrete, actionable takeaway for a creator. No preamble, no bullet points. NEVER say the niche is 'dead', 'halted', or growth is 'zero' — if week-over-week numbers aren't available yet, simply focus on the viral videos and what's resonating." },
          { role: "user", content: hasPrior
            ? `Niche: ${label} Shorts. This week: ${fmt(d.viewsGained)} views gained across ${d.now} tracked channels, ${fmt(d.subsGained)} subs gained, ${d.newUploads} new uploads, ${d.viralityRate}% hit 2x+ outlier. Top viral: ${topViral || "none major"}. Write the brief.`
            : `Niche: ${label} Shorts, across ${d.now} tracked channels. (Week-over-week growth data starts next week.) The standout viral videos right now: ${topViral || "none major"}. Analyze what's working in this niche based on these viral videos and give a concrete takeaway. Do NOT mention growth numbers.` },
        ],
      }),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? "").trim();
  } catch {
    return "";
  }
}

function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

// Common title-pattern detection (code, not AI → accurate).
const HOOK_PATTERNS: [RegExp, string][] = [
  [/\bpov\b/i, "POV:"], [/\bbro\b/i, "\"Bro...\""], [/\bwhen\b/i, "\"When...\""],
  [/\bhow to\b/i, "How-to"], [/\btop \d/i, "Top-N lists"], [/\branking\b/i, "Ranking"],
  [/\bvs\.?\b/i, "X vs Y"], [/\byou (won't|wont|never)\b/i, "\"You won't believe\""],
  [/\?$/, "Question hooks"], [/🥀|😭|💀|😳/, "Emoji hooks"], [/#\w+/, "Hashtag-heavy"],
  [/\bstory\b/i, "Storytime"], [/\bfails?\b/i, "Fails"], [/\bfacts?\b/i, "Facts"],
];
function detectTitlePatterns(titles: string[]): string[] {
  const counts = new Map<string, number>();
  for (const [re, label] of HOOK_PATTERNS) {
    const n = titles.filter((t) => re.test(t)).length;
    if (n >= Math.max(2, Math.ceil(titles.length * 0.25))) counts.set(label, n);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((c) => c[0]);
}

// ── Sub-niche clustering + rich paid-tier detail ──
// The AI (1) assigns each video to a sub-niche, and (2) gives a short insight +
// content angle per sub-niche. ALL numeric stats (counts, rates, views, outliers,
// opportunity, movement, patterns) are computed in code so they're accurate.
async function clusterSubNiches(label: string, niche: NicheId, videos: ViralVideo[]): Promise<SubNiche[]> {
  if (!process.env.GROQ_API_KEY || videos.length < 3) return [];
  const list = videos.map((v, i) => `${i}: "${v.title.slice(0, 90)}"`).join("\n");
  try {
    // 1) Assign videos → sub-niches.
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.2, max_tokens: 700, response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `You group YouTube ${label} Shorts into BROAD sub-niches. Assign EACH video index to a short sub-niche name (2-3 words, Title Case). CRITICAL: use only 4-6 BROAD sub-niches total — group aggressively, reuse names, do NOT create one per video. Return STRICT JSON: {"assignments":{"0":"Name",...}} covering every index.` },
          { role: "user", content: list },
        ],
      }),
    });
    if (!res.ok) return [];
    const parsed = JSON.parse((await res.json()).choices?.[0]?.message?.content ?? "{}");
    const assignments: Record<string, string> = parsed.assignments ?? {};

    const groups = new Map<string, ViralVideo[]>();
    videos.forEach((v, i) => {
      const sub = (assignments[String(i)] ?? "Other").trim();
      if (!groups.has(sub)) groups.set(sub, []);
      groups.get(sub)!.push(v);
    });

    const total = videos.length;
    const totalChannelsInNiche = new Set(videos.map((v) => v.channelName)).size;

    // Prior week's sub-niche shares (for movement).
    const prevRecap = await getRecap(niche);
    const prevShare = new Map<string, number>();
    for (const s of prevRecap?.subNiches ?? []) prevShare.set(s.name, s.viralRate);

    let subs: SubNiche[] = [...groups.entries()].map(([name, vids]): SubNiche => {
      const channelCounts = new Map<string, number>();
      for (const v of vids) channelCounts.set(v.channelName, (channelCounts.get(v.channelName) ?? 0) + 1);
      const topChannels = [...channelCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((c) => c[0]);
      const sorted = [...vids].sort((a, b) => b.views - a.views);
      const viralRate = Math.round((vids.length / total) * 100);
      const avgViews = Math.round(vids.reduce((s, v) => s + v.views, 0) / vids.length);
      const totalViews = vids.reduce((s, v) => s + v.views, 0);
      const topOutlierX = Math.max(...vids.map((v) => v.outlierX));
      const uniqueChannels = channelCounts.size;

      // Opportunity: high views + few channels = untapped/hot; many channels = saturated.
      let opportunity: SubNiche["opportunity"];
      const compRatio = uniqueChannels / Math.max(1, totalChannelsInNiche);
      if (avgViews >= 10_000_000 && compRatio <= 0.35) opportunity = "hot";
      else if (compRatio <= 0.25 && avgViews >= 3_000_000) opportunity = "untapped";
      else if (compRatio >= 0.6) opportunity = "saturated";
      else opportunity = "rising";

      const prev = prevShare.get(name);
      const movement = prev !== undefined ? viralRate - prev : 0;

      return {
        name, viralCount: vids.length, viralRate, avgViews, totalViews, topOutlierX,
        topChannels, exampleTitle: sorted[0]?.title ?? "",
        opportunity, movement,
        titlePatterns: detectTitlePatterns(vids.map((v) => v.title)),
        aiInsight: "", contentAngle: "",
        examples: sorted.slice(0, 3).map((v) => ({ title: v.title, thumbnail: v.thumbnail, url: v.url, views: v.views, outlierX: v.outlierX })),
      };
    }).sort((a, b) => b.viralCount - a.viralCount);

    // Merge over-fragmented singletons into "Other / Mixed".
    if (subs.length > 8) {
      const meaningful = subs.filter((s) => s.viralCount >= 2);
      subs = meaningful.length >= 3 ? meaningful : subs.slice(0, 6);
    }
    subs = subs.slice(0, 8);

    // 2) One batched AI call for insight + content angle per kept sub-niche.
    try {
      const summary = subs.map((s) => `${s.name}: ${s.viralCount} viral, ${fmt(s.avgViews)} avg views, top hits: ${s.examples.slice(0, 2).map((e) => `"${e.title.slice(0, 60)}"`).join(", ")}`).join("\n");
      const insRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile", temperature: 0.6, max_tokens: 700, response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `You are a YouTube Shorts strategist. For each ${label} sub-niche given, write: "insight" = 1 sentence on WHY it's winning right now, and "angle" = 1 specific, concrete content idea a creator could make. Be sharp and specific to the examples. Return STRICT JSON: {"SubNicheName":{"insight":"...","angle":"..."}, ...}` },
            { role: "user", content: summary },
          ],
        }),
      });
      if (insRes.ok) {
        const ins = JSON.parse((await insRes.json()).choices?.[0]?.message?.content ?? "{}");
        for (const s of subs) {
          const o = ins[s.name];
          if (o) { s.aiInsight = (o.insight ?? "").trim(); s.contentAngle = (o.angle ?? "").trim(); }
        }
      }
    } catch { /* insights best-effort */ }

    return subs;
  } catch {
    return [];
  }
}

export async function getRecap(niche: NicheId): Promise<NicheRecap | null> {
  const snap = await adminDb().collection(RECAP).doc(niche).get();
  return snap.exists ? (snap.data() as NicheRecap) : null;
}

// List the archived week keys available for a niche (newest first).
export async function listWeeks(niche: NicheId): Promise<string[]> {
  const snap = await adminDb()
    .collection(HISTORY)
    .where("niche", "==", niche)
    .get();
  const weeks = snap.docs.map((d) => (d.data() as NicheRecap).weekKey).filter(Boolean);
  return [...new Set(weeks)].sort().reverse();
}

// Get a specific week's archived recap for a niche.
export async function getRecapForWeek(niche: NicheId, weekKey: string): Promise<NicheRecap | null> {
  const snap = await adminDb().collection(HISTORY).doc(`${niche}_${weekKey}`).get();
  return snap.exists ? (snap.data() as NicheRecap) : null;
}

const WEEK_MS = 7 * 86400000;
export async function refreshAllIfDue(): Promise<{ refreshed: boolean }> {
  // Check the freshest recap; if any is >7 days old (or missing), refresh all.
  const first = await getRecap(NICHES[0].id);
  if (first && Date.now() - first.updatedAt < WEEK_MS) return { refreshed: false };
  for (const n of NICHES) {
    try { await refreshNiche(n.id); } catch (e) { console.warn(`[niche-research] refresh ${n.id} failed:`, (e as Error).message); }
  }
  return { refreshed: true };
}
