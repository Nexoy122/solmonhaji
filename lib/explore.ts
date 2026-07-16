import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";
import { youtubeFetch } from "@/lib/youtubeKeys";
import { NICHES, NicheId, getNicheChannels } from "@/lib/nicheResearch";

// ── Explore ───────────────────────────────────────────────────────────────────
// Shows EVERY recent video from EVERY seed channel in a niche (not just viral
// ones), sorted by outlier score. Users pick a niche (or All Niches) and browse
// the full feed. Feeds are cached in Firestore per niche with a TTL so we don't
// re-hit the YouTube API on every page load.

const FEED = "explore_feeds_v3"; // doc per niche → { videos: ExploreVideo[], updatedAt } (v3 = deeper pull for all-time best)
const TTL_MS = 12 * 60 * 60 * 1000; // refresh a niche's feed at most every 12h
const PER_CHANNEL = 150;            // uploads to scan per channel (deeper → surfaces all-time hits, not just recent)
const SHORTS_MAX_SEC = 180;         // Shorts-only: exclude anything over 3 minutes
const TOP_PER_CHANNEL = 20;         // keep each channel's top-N by views (its "best")

export interface ExploreVideo {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  channelAvatar: string | null;
  thumbnail: string;
  views: number;
  subs: number;          // channel subscriber count
  publishedAt: string;
  durationSec: number;
  outlierX: number;      // views ÷ channel average views
  url: string;
}

export interface ExploreFeed {
  niche: NicheId | "all";
  videos: ExploreVideo[];
  channelCount: number;
  updatedAt: number;
}

interface ChannelInfo {
  id: string;
  name: string;
  avatar: string | null;
  subs: number;
  avgViews: number;      // total views ÷ video count (for outlier baseline)
  uploadsPlaylist: string;
}

// Parse ISO-8601 duration (PT#M#S) → seconds.
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || "0") * 3600) + (parseInt(m[2] || "0") * 60) + parseInt(m[3] || "0");
}

// Fetch snippet/stats/uploads-playlist for a batch of channels.
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
          avgViews: vids > 0 ? views / vids : 0,
          uploadsPlaylist: ch.contentDetails?.relatedPlaylists?.uploads ?? "",
        });
      }
    } catch (err) {
      console.warn("[explore] channel batch failed:", (err as Error).message);
    }
  }
  return out;
}

// Pull the most-recent uploads for one channel (video ids from its playlist,
// then a batched videos.list for stats + duration + snippet).
async function fetchChannelVideos(ch: ChannelInfo): Promise<ExploreVideo[]> {
  if (!ch.uploadsPlaylist) return [];
  const ids: string[] = [];
  let pageToken = "";
  try {
    while (ids.length < PER_CHANNEL) {
      const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
      const pl = (await youtubeFetch(
        (key) => `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${ch.uploadsPlaylist}&maxResults=50${pageParam}&key=${key}`
      )) as { items?: { contentDetails?: { videoId?: string } }[]; nextPageToken?: string };
      for (const it of pl.items ?? []) {
        const id = it.contentDetails?.videoId;
        if (id) ids.push(id);
      }
      if (!pl.nextPageToken || ids.length >= PER_CHANNEL) break;
      pageToken = pl.nextPageToken;
    }
  } catch {
    return [];
  }
  const wanted = ids.slice(0, PER_CHANNEL);
  if (wanted.length === 0) return [];

  const videos: ExploreVideo[] = [];
  for (let i = 0; i < wanted.length; i += 50) {
    const batch = wanted.slice(i, i + 50);
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
        // Shorts-only tool: skip long-form uploads.
        if (durationSec === 0 || durationSec > SHORTS_MAX_SEC) continue;
        const views = parseInt(v.statistics?.viewCount ?? "0") || 0;
        videos.push({
          id: v.id,
          title: v.snippet?.title ?? "",
          channelId: ch.id,
          channelName: ch.name,
          channelAvatar: ch.avatar,
          thumbnail: v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.medium?.url ?? "",
          views,
          subs: ch.subs,
          publishedAt: v.snippet?.publishedAt ?? "",
          durationSec,
          outlierX: ch.avgViews > 0 ? views / ch.avgViews : 0,
          url: `https://www.youtube.com/watch?v=${v.id}`,
        });
      }
    } catch { /* skip batch */ }
  }
  // Keep this channel's TOP videos by views (its all-time best), so the feed
  // surfaces proven hits, not just whatever it happened to post recently.
  videos.sort((a, b) => b.views - a.views);
  return videos.slice(0, TOP_PER_CHANNEL);
}

// Build (and cache) the full feed for one niche.
export async function buildNicheFeed(niche: NicheId): Promise<ExploreFeed> {
  const channelIds = await getNicheChannels(niche);
  const channels = await fetchChannels(channelIds);

  const all: ExploreVideo[] = [];
  for (const ch of channels) {
    all.push(...(await fetchChannelVideos(ch)));
  }
  // Default order = all-time views (best-performing first). The UI re-sorts by
  // outlier / recent / velocity on demand.
  all.sort((a, b) => b.views - a.views);

  const feed: ExploreFeed = {
    niche,
    videos: all.slice(0, 800), // cap for Firestore doc size (deeper pull → more hits)
    channelCount: channels.length,
    updatedAt: Date.now(),
  };
  await adminDb().collection(FEED).doc(niche).set(feed);
  return feed;
}

// Read the cached feed for a niche; rebuild if missing or stale (>TTL).
export async function getNicheFeed(niche: NicheId): Promise<ExploreFeed> {
  const snap = await adminDb().collection(FEED).doc(niche).get();
  const cached = snap.exists ? (snap.data() as ExploreFeed) : null;
  if (cached && Date.now() - cached.updatedAt < TTL_MS) return cached;
  return buildNicheFeed(niche);
}

// "All Niches", merge every niche's cached feed (build any that are missing/stale).
export async function getAllFeed(): Promise<ExploreFeed> {
  const feeds = await Promise.all(NICHES.map((n) => getNicheFeed(n.id)));
  const merged: ExploreVideo[] = [];
  const seen = new Set<string>();
  let channelCount = 0;
  let updatedAt = 0;
  for (const f of feeds) {
    channelCount += f.channelCount;
    updatedAt = Math.max(updatedAt, f.updatedAt);
    for (const v of f.videos) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      merged.push(v);
    }
  }
  merged.sort((a, b) => b.views - a.views);
  return { niche: "all", videos: merged.slice(0, 1000), channelCount, updatedAt };
}
