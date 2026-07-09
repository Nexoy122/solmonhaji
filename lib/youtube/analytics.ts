export interface YouTubeAnalyticsData {
  // Core
  views: number;
  estimatedMinutesWatched: number;
  avgViewDuration: number;       // seconds
  avgViewPercentage: number;     // 0-100
  // Engagement rates (per 100 views)
  likeRate: number;
  dislikeRate: number;
  shareRate: number;
  commentRate: number;
  likeToDislikeRatio: number;    // 0-100 (likes / (likes+dislikes) * 100)
  hasDislikeData: boolean;       // did the API return any like/dislike counts?
  // Subscribers
  subscribersGained: number;
  subscribersLost: number;
  netSubscribers: number;
  subsPerThousandViews: number;  // subscriber conversion strength
  // Reach / loyalty
  uniqueViewers: number;
  viewsPerUniqueViewer: number;  // returning-audience signal
  // Momentum (recent 28d vs prior 28d)
  viewsMomentum: number;         // % change, -100..+inf
  watchTimeMomentum: number;     // % change
  subsMomentum: number;          // % change
  // Misc
  sessionTimeImpact: number;

  // ── NEW real signals (channel-level Analytics) ──
  savesRate: number;             // videosAddedToPlaylists / views * 100 (Satura "saves")
  savesPerVideo: number;         // raw saves per analyzed video count (filled by bridge)
  // Traffic-source mix (% of views)
  browsePct: number;             // SUBSCRIBER + YT_CHANNEL home/browse feed share
  suggestedPct: number;          // RELATED_VIDEO (suggested) share — algorithmic push
  searchPct: number;             // YT_SEARCH share
  externalPct: number;           // EXT_URL + EXTERNAL_APP share (off-platform reach)
  shortsFeedPct: number;         // SHORTS feed share
  // Audience loyalty (subscribed vs not)
  subscriberViewPct: number;     // % of views from subscribed viewers (loyalty)
  subscriberWatchPct: number;    // % of watch time from subscribers
}

interface ReportRow {
  headers: string[];
  rows: any[][];
}

export type ContentType = "SHORTS" | "VIDEO_ON_DEMAND" | "ALL";

async function fetchReport(
  accessToken: string,
  channelId: string,
  startDate: string,
  endDate: string,
  metrics: string,
  extra?: { dimensions?: string; sort?: string; maxResults?: number; contentType?: ContentType }
): Promise<ReportRow | null> {
  let url =
    `https://youtubeanalytics.googleapis.com/v2/reports` +
    `?ids=channel==${channelId}` +
    `&startDate=${startDate}&endDate=${endDate}` +
    `&metrics=${encodeURIComponent(metrics)}`;
  if (extra?.dimensions) url += `&dimensions=${encodeURIComponent(extra.dimensions)}`;
  if (extra?.sort) url += `&sort=${encodeURIComponent(extra.sort)}`;
  if (extra?.maxResults) url += `&maxResults=${extra.maxResults}`;
  // Separate Shorts from long-form so their very different metrics aren't mixed.
  if (extra?.contentType && extra.contentType !== "ALL") {
    url += `&filters=${encodeURIComponent(`creatorContentType==${extra.contentType}`)}`;
  }

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

  if (!res.ok) {
    // Don't throw — some metric groups / filters aren't available for every channel.
    // Log and return null so callers can degrade gracefully.
    const errText = await res.text().catch(() => "");
    console.warn(`[analytics] report failed (${metrics}):`, errText.slice(0, 300));
    return null;
  }

  const data = await res.json();
  return {
    headers: (data.columnHeaders ?? []).map((h: any) => h.name),
    rows: data.rows ?? [],
  };
}

function fmtDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function firstValue(report: ReportRow | null, metric: string): number {
  if (!report || report.rows.length === 0) return 0;
  const idx = report.headers.indexOf(metric);
  if (idx < 0) return 0;
  return parseFloat(report.rows[0][idx] ?? "0") || 0;
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function fetchYouTubeAnalytics(
  accessToken: string,
  channelId: string,
  contentType: ContentType = "ALL",
  windowDays = 90
): Promise<YouTubeAnalyticsData> {
  const now = new Date();
  // Main analysis window (user-selectable: 7 / 28 / 90 days).
  const start90 = new Date(now.getTime() - windowDays * 86400000);
  // Momentum is always "recent vs prior" of half the window, so it adapts too.
  const momWindow = Math.max(7, Math.round(windowDays / 2));
  const start28 = new Date(now.getTime() - momWindow * 86400000);
  const start56 = new Date(now.getTime() - momWindow * 2 * 86400000);

  // ── 1. Core 90-day aggregate (only universally-valid metrics) ──────────────
  const core = await fetchReport(
    accessToken,
    channelId,
    fmtDate(start90),
    fmtDate(now),
    [
      "views",
      "estimatedMinutesWatched",
      "averageViewDuration",
      "averageViewPercentage",
      "likes",
      "dislikes",
      "comments",
      "shares",
      "subscribersGained",
      "subscribersLost",
    ].join(","),
    { contentType }
  );

  const views = firstValue(core, "views");
  const estimatedMinutesWatched = firstValue(core, "estimatedMinutesWatched");
  const avgViewDuration = firstValue(core, "averageViewDuration");
  const avgViewPercentage = firstValue(core, "averageViewPercentage");
  const likes = firstValue(core, "likes");
  const dislikes = firstValue(core, "dislikes");
  const comments = firstValue(core, "comments");
  const shares = firstValue(core, "shares");
  const subscribersGained = firstValue(core, "subscribersGained");
  const subscribersLost = firstValue(core, "subscribersLost");

  // ── 2. Unique viewers / loyalty (separate call — not on every channel) ─────
  // "uniques" is a valid metric but unavailable for some channels; degrade gracefully.
  const uniquesReport = await fetchReport(
    accessToken, channelId, fmtDate(start90), fmtDate(now), "uniques", { contentType }
  );
  const uniqueViewers = firstValue(uniquesReport, "uniques");

  // ── 3. Momentum: recent 28d vs the prior 28d ───────────────────────────────
  const recent = await fetchReport(
    accessToken, channelId, fmtDate(start28), fmtDate(now),
    ["views", "estimatedMinutesWatched", "subscribersGained"].join(","),
    { contentType }
  );
  const prior = await fetchReport(
    accessToken, channelId, fmtDate(start56), fmtDate(start28),
    ["views", "estimatedMinutesWatched", "subscribersGained"].join(","),
    { contentType }
  );

  const recentViews = firstValue(recent, "views");
  const priorViews = firstValue(prior, "views");
  const recentWatch = firstValue(recent, "estimatedMinutesWatched");
  const priorWatch = firstValue(prior, "estimatedMinutesWatched");
  const recentSubs = firstValue(recent, "subscribersGained");
  const priorSubs = firstValue(prior, "subscribersGained");

  // ── Derive rates ───────────────────────────────────────────────────────────
  const likeRate = views > 0 ? (likes / views) * 100 : 0;
  const dislikeRate = views > 0 ? (dislikes / views) * 100 : 0;
  const shareRate = views > 0 ? (shares / views) * 100 : 0;
  const commentRate = views > 0 ? (comments / views) * 100 : 0;
  // Sentiment (like-to-dislike). When there's NO like/dislike data at all, don't
  // fabricate a perfect 100% — flag it so the engine scores sentiment as neutral
  // (unknown) instead of inflating the score.
  const hasDislikeData = likes + dislikes > 0;
  const likeToDislikeRatio =
    hasDislikeData ? (likes / (likes + dislikes)) * 100 : 0;

  const netSubscribers = subscribersGained - subscribersLost;
  const subsPerThousandViews = views > 0 ? (netSubscribers / views) * 1000 : 0;

  const viewsPerUniqueViewer = uniqueViewers > 0 ? views / uniqueViewers : 0;

  const viewsMomentum = pctChange(recentViews, priorViews);
  const watchTimeMomentum = pctChange(recentWatch, priorWatch);
  const subsMomentum = pctChange(recentSubs, priorSubs);

  const sessionTimeImpact = views > 0 ? (estimatedMinutesWatched / views) * 10 : 0;

  // ── 4. Saves / playlist adds (channel-level, real metric) ───────────────────
  const savesReport = await fetchReport(
    accessToken, channelId, fmtDate(start90), fmtDate(now), "videosAddedToPlaylists", { contentType }
  );
  const saves = firstValue(savesReport, "videosAddedToPlaylists");
  const savesRate = views > 0 ? (saves / views) * 100 : 0;

  // ── 5. Traffic-source mix (insightTrafficSourceType dimension) ──────────────
  const trafficReport = await fetchReport(
    accessToken, channelId, fmtDate(start90), fmtDate(now), "views",
    { dimensions: "insightTrafficSourceType", sort: "-views", contentType }
  );
  let browseViews = 0, suggestedViews = 0, searchViews = 0, externalViews = 0, shortsFeedViews = 0, trafficTotal = 0;
  if (trafficReport && trafficReport.rows.length) {
    const srcIdx = trafficReport.headers.indexOf("insightTrafficSourceType");
    const vIdx = trafficReport.headers.indexOf("views");
    for (const row of trafficReport.rows) {
      const src = String(row[srcIdx] ?? "");
      const v = parseFloat(row[vIdx] ?? "0") || 0;
      trafficTotal += v;
      if (src === "RELATED_VIDEO") suggestedViews += v;
      else if (src === "YT_SEARCH") searchViews += v;
      else if (src === "SUBSCRIBER" || src === "YT_CHANNEL") browseViews += v;
      else if (src === "EXT_URL" || src === "EXTERNAL_APP" || src === "NO_LINK_OTHER") externalViews += v;
      else if (src === "SHORTS") shortsFeedViews += v;
    }
  }
  const pct = (n: number) => (trafficTotal > 0 ? (n / trafficTotal) * 100 : 0);
  const browsePct = pct(browseViews);
  const suggestedPct = pct(suggestedViews);
  const searchPct = pct(searchViews);
  const externalPct = pct(externalViews);
  const shortsFeedPct = pct(shortsFeedViews);

  // ── 6. Subscriber loyalty (subscribedStatus dimension) ──────────────────────
  const loyaltyReport = await fetchReport(
    accessToken, channelId, fmtDate(start90), fmtDate(now),
    ["views", "estimatedMinutesWatched"].join(","),
    { dimensions: "subscribedStatus", contentType }
  );
  let subViews = 0, subWatch = 0, totViews = 0, totWatch = 0;
  if (loyaltyReport && loyaltyReport.rows.length) {
    const sIdx = loyaltyReport.headers.indexOf("subscribedStatus");
    const vIdx = loyaltyReport.headers.indexOf("views");
    const wIdx = loyaltyReport.headers.indexOf("estimatedMinutesWatched");
    for (const row of loyaltyReport.rows) {
      const v = parseFloat(row[vIdx] ?? "0") || 0;
      const w = parseFloat(row[wIdx] ?? "0") || 0;
      totViews += v; totWatch += w;
      if (String(row[sIdx]) === "SUBSCRIBED") { subViews += v; subWatch += w; }
    }
  }
  const subscriberViewPct = totViews > 0 ? (subViews / totViews) * 100 : 0;
  const subscriberWatchPct = totWatch > 0 ? (subWatch / totWatch) * 100 : 0;

  // NOTE: CTR / impressions / swipe rate are intentionally omitted. The Shorts
  // feed has no thumbnail-CTR equivalent and the Analytics API doesn't expose
  // reliable Shorts impression data, so we don't fabricate them.

  return {
    views,
    estimatedMinutesWatched,
    avgViewDuration,
    avgViewPercentage,
    likeRate,
    dislikeRate,
    shareRate,
    commentRate,
    likeToDislikeRatio,
    hasDislikeData,
    subscribersGained,
    subscribersLost,
    netSubscribers,
    subsPerThousandViews,
    uniqueViewers,
    viewsPerUniqueViewer,
    viewsMomentum,
    watchTimeMomentum,
    subsMomentum,
    sessionTimeImpact,
    // new signals
    savesRate,
    savesPerVideo: 0, // filled by the bridge using analyzed video count
    browsePct,
    suggestedPct,
    searchPct,
    externalPct,
    shortsFeedPct,
    subscriberViewPct,
    subscriberWatchPct,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  if (!data.access_token) return null;
  return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
}
