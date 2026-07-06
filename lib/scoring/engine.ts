/**
 * Eggar Trust Score Engine
 *
 * Industry-standard YouTube channel health scoring.
 * All benchmarks sourced from YouTube Creator Academy, Social Blade data,
 * and published YouTube algorithm research.
 *
 * Score ranges:
 *   90-100  Exceptional  (top 5% of channels)
 *   75-89   Strong       (top 20%)
 *   60-74   Good         (top 40%)
 *   45-59   Average      (mid 50%)
 *   30-44   Below avg    (bottom 30%)
 *   0-29    Poor
 */

import { expertTipFor, TRUST_EXPLAINER } from "./guidance";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface MetricInput {
  // Engagement (from Analytics API)
  avgViewsPerVideo: number;      // average views per video
  subscriberCount: number;        // total subscribers
  avgLikes: number;               // average likes per video
  avgComments: number;            // average comments per video
  avgShares: number;              // average shares per video
  likeRate: number;               // likes / views * 100 (from analytics)
  commentRate: number;            // comments / views * 100 (from analytics)
  shareRate: number;              // shares / views * 100 (from analytics)
  likeToDislikeRatio: number;     // likes / (likes+dislikes) * 100 (sentiment)

  // Retention (from Analytics API)
  avgViewDuration: number;        // seconds
  avgVideoDuration: number;       // seconds (from video data)
  avgViewPercentage: number;      // 0-100 (from analytics, most accurate)
  avgCtr: number;                 // impressions CTR % (0 — not available via public API)

  // Upload consistency (from video list)
  uploadsLast7Days: number;
  uploadsLast30Days: number;
  uploadsLast90Days: number;
  daysSinceLastUpload: number;
  isShorts: boolean;              // channel's primary content is Shorts

  // Authority (channel-level)
  totalViews: number;
  channelAgeInDays: number;
  videoCount: number;

  // Velocity (from Analytics API)
  subscribersGained: number;      // last 90 days
  subscribersLost: number;        // last 90 days
  viewsLast90Days: number;        // from analytics
  estimatedMinutesWatched: number;// last 90 days
  subsPerThousandViews: number;   // subscriber conversion strength
  viewsMomentum: number;          // % change recent 28d vs prior 28d
  watchTimeMomentum: number;      // % change recent 28d vs prior 28d
  subsMomentum: number;           // % change recent 28d vs prior 28d
  viewsPerUniqueViewer: number;   // returning-audience loyalty signal

  // Trust signals
  impressions: number;            // last 90 days (0 — not available via public API)
  swipeRatio: number;             // views/impressions * 100 (0 — not available)

  // ── NEW real signals ──
  savesRate: number;              // playlist adds / views * 100
  browsePct: number;              // % views from browse/home + subscriber feed
  suggestedPct: number;           // % views from suggested (RELATED_VIDEO) — algorithm push
  searchPct: number;              // % views from YouTube search
  externalPct: number;            // % views from off-platform
  subscriberViewPct: number;      // % views from subscribed viewers (loyalty)

  // Context for niche/size-aware benchmarks
  niche?: string;                 // optional niche/category hint
}

export interface MetricResult {
  key: string;
  name: string;
  value: number;
  score: number;           // 0-100
  weight: number;          // contribution weight in category
  unit: string;
  benchmark: number;       // industry target
  benchmarkLabel: string;  // human label for benchmark
  percentile: string;      // "Top 5%", "Top 20%", etc.
  hasIssue: boolean;
  issueLevel: "critical" | "warning" | "info" | null;
  recommendation: string | null;
  trend: "up" | "down" | "neutral" | null;
}

export interface CategoryScore {
  score: number;           // 0-100
  grade: string;           // A+, A, B+, B, C+, C, D
  label: string;           // Exceptional, Strong, Good, etc.
  weight: number;          // contribution to overall
  metrics: MetricResult[];
  summary: string;         // 1-sentence summary
}

export interface Recommendation {
  category: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  impact: number;          // estimated score gain
  action: string;          // specific action to take
}

export interface ScoreResult {
  overall: number;
  grade: string;
  label: string;
  percentile: string;
  trustBadge: "poor" | "fair" | "good" | "strong" | "exceptional";
  trustTier: "high" | "medium" | "low";
  trustMeaning: string;
  engagement: CategoryScore;
  retention: CategoryScore;
  upload: CategoryScore;
  authority: CategoryScore;
  velocity: CategoryScore;
  recommendations: Recommendation[];
  insights: string[];      // 3 key takeaways
  analyzedAt: string;
}

// ─── Utility helpers ─────────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

function scoreGrade(score: number): string {
  if (score >= 92) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 62) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D+";
  return "D";
}

function scoreLabel(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 45) return "Average";
  if (score >= 30) return "Below Average";
  return "Poor";
}

function scorePercentile(score: number): string {
  if (score >= 90) return "Top 5%";
  if (score >= 80) return "Top 15%";
  if (score >= 70) return "Top 30%";
  if (score >= 60) return "Top 45%";
  if (score >= 45) return "Top 60%";
  if (score >= 30) return "Bottom 40%";
  return "Bottom 20%";
}

function trustBadge(score: number): ScoreResult["trustBadge"] {
  if (score >= 80) return "exceptional";
  if (score >= 65) return "strong";
  if (score >= 50) return "good";
  if (score >= 35) return "fair";
  return "poor";
}

/**
 * Satura-style trust tier — what the score means for algorithmic distribution.
 *   75+   High trust    → "Algorithm actively promotes your content"
 *   50-74 Medium trust  → "Content gets tested but not pushed"
 *   <50   Low trust     → "Limited distribution, small test audiences"
 */
function trustTier(score: number): { tier: "high" | "medium" | "low"; meaning: string } {
  const tier = score >= 75 ? "high" : score >= 50 ? "medium" : "low";
  return { tier, meaning: TRUST_EXPLAINER[tier] };
}

// ─── Size & niche-aware benchmarks ───────────────────────────────────────────
/**
 * Engagement rates vary HUGELY by channel size. Small channels see 4-6% like
 * rates; mega channels often sit under 1%. Benchmarking everyone against one
 * fixed number is the #1 cause of inaccurate scores. These multipliers scale the
 * base benchmark by the channel's subscriber tier so a 5M-sub channel isn't
 * unfairly punished for a "low" like rate that's actually normal at its size.
 */
function sizeTier(subs: number): "nano" | "micro" | "small" | "mid" | "large" | "mega" {
  if (subs < 1_000) return "nano";
  if (subs < 10_000) return "micro";
  if (subs < 100_000) return "small";
  if (subs < 1_000_000) return "mid";
  if (subs < 10_000_000) return "large";
  return "mega";
}

// Benchmark multipliers per size tier (relative to the "small" baseline = 1.0).
// Engagement DROPS as channels grow → lower benchmark for bigger channels.
const SIZE_ENGAGEMENT_MULT: Record<string, number> = {
  nano: 1.6, micro: 1.3, small: 1.0, mid: 0.78, large: 0.6, mega: 0.45,
};
// View/sub ratio also drops with size (mega channels reach far beyond their subs
// in absolute terms but a smaller % of their massive sub base per video).
const SIZE_VSR_MULT: Record<string, number> = {
  nano: 1.4, micro: 1.2, small: 1.0, mid: 0.85, large: 0.7, mega: 0.55,
};

/**
 * Optional per-niche tweak. Some niches (gaming, entertainment) get high
 * engagement; others (finance, education, news) get lower but more valuable
 * engagement. Defaults to 1.0 when the niche is unknown.
 */
const NICHE_ENGAGEMENT_MULT: Record<string, number> = {
  gaming: 1.15, entertainment: 1.1, comedy: 1.15, music: 0.85,
  education: 0.85, finance: 0.8, news: 0.75, tech: 0.95, howto: 0.9,
  vlog: 1.05, fitness: 1.0, beauty: 1.05,
};

function engagementBenchmark(base: number, subs: number, niche?: string): number {
  const sizeMult = SIZE_ENGAGEMENT_MULT[sizeTier(subs)] ?? 1;
  const nicheMult = niche ? (NICHE_ENGAGEMENT_MULT[niche.toLowerCase()] ?? 1) : 1;
  return base * sizeMult * nicheMult;
}

function vsrBenchmarkFor(base: number, subs: number): number {
  return base * (SIZE_VSR_MULT[sizeTier(subs)] ?? 1);
}

/**
 * Sigmoid-style scoring. Maps a ratio to 0-100.
 * ratio = actual / benchmark
 * At ratio=1 (hitting benchmark) → ~65 score
 * At ratio=2 (2x benchmark) → ~85 score
 * At ratio=0.5 (half benchmark) → ~40 score
 */
function sigmoidScore(ratio: number): number {
  if (ratio <= 0) return 0;
  // Logistic curve: score = 100 / (1 + e^(-k*(ratio - 1)))
  // k=2.5 gives good spread around benchmark
  const k = 2.5;
  return clamp(100 / (1 + Math.exp(-k * (ratio - 1))));
}

/**
 * Stepped score for upload frequency.
 * Returns score based on industry-standard posting cadence expectations.
 */
function uploadFreqScore(uploadsPerMonth: number, isShorts = false): number {
  if (uploadsPerMonth === 0) return 0;
  if (isShorts) {
    // Shorts reward DAILY posting. YouTube favors creators who post every day and
    // penalizes skipped days, so the target is ~30/month (daily) and anything less
    // than near-daily is treated as below par.
    if (uploadsPerMonth >= 30) return 100; // daily — ideal
    if (uploadsPerMonth >= 26) return 92;  // ~6 days/week
    if (uploadsPerMonth >= 22) return 82;  // ~5 days/week
    if (uploadsPerMonth >= 17) return 68;  // ~4 days/week
    if (uploadsPerMonth >= 12) return 52;  // ~3 days/week
    if (uploadsPerMonth >= 8)  return 38;
    if (uploadsPerMonth >= 4)  return 24;
    return 12;
  }
  // Long-form cadence expectations.
  if (uploadsPerMonth >= 12) return 100;  // daily-ish
  if (uploadsPerMonth >= 8)  return 92;
  if (uploadsPerMonth >= 6)  return 85;
  if (uploadsPerMonth >= 4)  return 75;
  if (uploadsPerMonth >= 3)  return 62;
  if (uploadsPerMonth >= 2)  return 48;
  if (uploadsPerMonth >= 1)  return 32;
  return 15;
}

// ─── Category: Engagement ────────────────────────────────────────────────────
/**
 * Measures how actively viewers interact with your content.
 * Industry benchmarks (YouTube Creator Academy + Social Blade research):
 *   - CTR: 2-10% (strong = 6%+)
 *   - Like rate: 1-4% (strong = 3%+)
 *   - Comment rate: 0.05-0.5% (strong = 0.3%+)
 *   - Share rate: 0.02-0.2% (strong = 0.1%+)
 *   - View/sub ratio per video: 5-15% (strong = 10%+)
 */
export function calculateEngagement(input: MetricInput): CategoryScore {
  const metrics: MetricResult[] = [];

  // 1. Like rate (weight 26%) — primary engagement signal
  const likeRate = input.likeRate > 0
    ? input.likeRate
    : input.avgViewsPerVideo > 0 ? (input.avgLikes / input.avgViewsPerVideo) * 100 : 0;
  // Size + niche-aware benchmark (2.5% base, scaled for channel size/niche).
  const likeBenchmark = engagementBenchmark(2.5, input.subscriberCount, input.niche);
  const likeRatio = likeRate / likeBenchmark;
  const likeScore = clamp(sigmoidScore(likeRatio));
  metrics.push({
    key: "like_rate",
    name: "Like Rate",
    value: parseFloat(likeRate.toFixed(3)),
    score: likeScore,
    weight: 0.24,
    unit: "%",
    benchmark: parseFloat(likeBenchmark.toFixed(2)),
    benchmarkLabel: `${likeBenchmark.toFixed(1)}% (size-adjusted)`,
    percentile: likeScore >= 80 ? "Top 20%" : likeScore >= 60 ? "Top 45%" : "Bottom 40%",
    hasIssue: likeScore < 45,
    issueLevel: likeScore < 25 ? "critical" : likeScore < 45 ? "warning" : null,
    recommendation: likeScore < 45
      ? "Low like rate. Ask viewers to like within the first 30 seconds — early engagement is weighted heavily by the algorithm."
      : null,
    trend: null,
  });

  // 2. Comment rate (weight 18%) — strongest social signal
  const commentRate = input.commentRate > 0
    ? input.commentRate
    : input.avgViewsPerVideo > 0 ? (input.avgComments / input.avgViewsPerVideo) * 100 : 0;
  const commentBenchmark = engagementBenchmark(0.25, input.subscriberCount, input.niche);
  const commentRatio = commentRate / commentBenchmark;
  const commentScore = clamp(sigmoidScore(commentRatio));
  metrics.push({
    key: "comment_rate",
    name: "Comment Rate",
    value: parseFloat(commentRate.toFixed(4)),
    score: commentScore,
    weight: 0.18,
    unit: "%",
    benchmark: parseFloat(commentBenchmark.toFixed(3)),
    benchmarkLabel: `${commentBenchmark.toFixed(2)}% (size-adjusted)`,
    percentile: commentScore >= 80 ? "Top 20%" : commentScore >= 55 ? "Top 45%" : "Below average",
    hasIssue: commentScore < 40,
    issueLevel: commentScore < 20 ? "warning" : null,
    recommendation: commentScore < 40
      ? "End every video with an open question. Respond to all comments in the first 2 hours — this signals activity to the algorithm."
      : null,
    trend: null,
  });

  // 3. Audience sentiment — like-to-dislike ratio (weight 18%)
  // Real, valid Analytics metric. 90%+ is healthy; below 80% signals content issues.
  const sentimentBenchmark = 92;
  const sentiment = input.likeToDislikeRatio;
  // Scale: 92%+ → strong, linear penalty below
  const sentimentScore = clamp(
    sentiment >= 95 ? 100 :
    sentiment >= 90 ? 85 :
    sentiment >= 85 ? 70 :
    sentiment >= 80 ? 55 :
    sentiment >= 70 ? 38 :
    sentiment >= 50 ? 20 : 8
  );
  metrics.push({
    key: "sentiment",
    name: "Audience Sentiment",
    value: parseFloat(sentiment.toFixed(1)),
    score: sentimentScore,
    weight: 0.12,
    unit: "%",
    benchmark: sentimentBenchmark,
    benchmarkLabel: "92% positive (like ratio)",
    percentile: sentimentScore >= 85 ? "Top 20%" : sentimentScore >= 55 ? "Average" : "Below average",
    hasIssue: sentimentScore < 55,
    issueLevel: sentimentScore < 38 ? "critical" : sentimentScore < 55 ? "warning" : null,
    recommendation: sentimentScore < 55
      ? "Your like-to-dislike ratio is low. Review which videos draw dislikes — misleading titles/thumbnails or controversial framing often cause this."
      : null,
    trend: null,
  });

  // 4. View / Subscriber ratio per video (weight 18%)
  const vsrBenchmark = vsrBenchmarkFor(8, input.subscriberCount); // 8% base, size-scaled
  const vsr = input.subscriberCount > 0
    ? (input.avgViewsPerVideo / input.subscriberCount) * 100
    : 0;
  const vsrRatio = vsr / vsrBenchmark;
  const vsrScore = clamp(sigmoidScore(vsrRatio));
  metrics.push({
    key: "view_sub_ratio",
    name: "Views per Subscriber",
    value: parseFloat(vsr.toFixed(2)),
    score: vsrScore,
    weight: 0.18,
    unit: "%",
    benchmark: parseFloat(vsrBenchmark.toFixed(1)),
    benchmarkLabel: `${vsrBenchmark.toFixed(0)}% per video (size-adjusted)`,
    percentile: vsrScore >= 75 ? "Top 25%" : vsrScore >= 50 ? "Average" : "Below average",
    hasIssue: vsrScore < 35,
    issueLevel: vsrScore < 20 ? "critical" : vsrScore < 35 ? "warning" : null,
    recommendation: vsrScore < 35
      ? "Fewer than 8% of your subscribers watch each video. Focus on better titles/thumbnails and publish when your audience is most active."
      : null,
    trend: null,
  });

  // 5. Share rate (weight 16%) — per Satura, the strongest engagement signal
  const shareBenchmark = engagementBenchmark(0.08, input.subscriberCount, input.niche);
  const shareRate = input.shareRate > 0
    ? input.shareRate
    : input.avgViewsPerVideo > 0 ? (input.avgShares / input.avgViewsPerVideo) * 100 : 0;
  const shareRatio = shareRate / shareBenchmark;
  const shareScore = clamp(sigmoidScore(shareRatio));
  metrics.push({
    key: "share_rate",
    name: "Share Rate",
    value: parseFloat(shareRate.toFixed(4)),
    score: shareScore,
    weight: 0.16,
    unit: "%",
    benchmark: parseFloat(shareBenchmark.toFixed(3)),
    benchmarkLabel: `${shareBenchmark.toFixed(2)}% (viral > 0.2%)`,
    percentile: shareScore >= 75 ? "Top 25%" : "Average",
    hasIssue: shareScore < 30,
    issueLevel: null,
    recommendation: shareScore < 30
      ? "Low shares. Shares are the single strongest engagement signal — create 'share-worthy' moments (surprising stats, emotional hooks, listicles)."
      : null,
    trend: null,
  });

  // 6. Saves / playlist-add rate (weight 12%) — strong intent signal (Satura "saves")
  const savesBenchmark = engagementBenchmark(0.4, input.subscriberCount, input.niche);
  const savesRate = input.savesRate;
  // 0 = data unavailable (public path) → neutral, don't penalise.
  const savesScore = savesRate > 0 ? clamp(sigmoidScore(savesRate / savesBenchmark)) : 50;
  metrics.push({
    key: "saves_rate",
    name: "Saves / Playlist Adds",
    value: parseFloat(savesRate.toFixed(3)),
    score: savesScore,
    weight: 0.12,
    unit: "%",
    benchmark: parseFloat(savesBenchmark.toFixed(2)),
    benchmarkLabel: `${savesBenchmark.toFixed(2)}% saved`,
    percentile: savesScore >= 75 ? "Top 25%" : savesScore >= 50 ? "Average" : "Below average",
    hasIssue: savesScore < 35,
    issueLevel: null,
    recommendation: savesScore < 35
      ? "Few viewers save your videos. Saves signal high value — create reference-worthy content (tutorials, lists, guides) people want to revisit."
      : null,
    trend: null,
  });

  const score = clamp(metrics.reduce((acc, m) => acc + m.score * m.weight, 0));

  return {
    score,
    grade: scoreGrade(score),
    label: scoreLabel(score),
    weight: 0.28,
    metrics,
    summary: score >= 70
      ? "Your audience engages actively with your content."
      : score >= 45
      ? "Engagement is average — prompt likes, comments, and shares more directly."
      : "Low engagement is limiting your algorithmic reach.",
  };
}

// ─── Category: Retention ─────────────────────────────────────────────────────
/**
 * Measures how long viewers watch your videos.
 * YouTube's #1 ranking factor for suggested video placement.
 *
 * Industry benchmarks:
 *   - Avg view percentage: 40-60% (strong = 50%+)
 *   - Optimal video length: 7-20 min for most niches
 *   - Swipe ratio (views/impressions): 5-15%
 */
export function calculateRetention(input: MetricInput): CategoryScore {
  const metrics: MetricResult[] = [];

  // 1. Average View Percentage (weight 55%) — the gold standard metric
  const avpBenchmark = 45; // 45% is solid. 50%+ is strong.
  const avp = input.avgViewPercentage;
  const avpRatio = avp / avpBenchmark;
  const avpScore = clamp(sigmoidScore(avpRatio));
  metrics.push({
    key: "avg_view_percentage",
    name: "Average View Retention",
    value: parseFloat(avp.toFixed(1)),
    score: avpScore,
    weight: 0.48,
    unit: "%",
    benchmark: avpBenchmark,
    benchmarkLabel: "45% industry standard",
    percentile: avp >= 55 ? "Top 10%" : avp >= 45 ? "Top 30%" : avp >= 35 ? "Average" : "Below average",
    hasIssue: avpScore < 50,
    issueLevel: avpScore < 30 ? "critical" : avpScore < 50 ? "warning" : null,
    recommendation: avpScore < 50
      ? "Retention below 40% means viewers are leaving early. Hook them in the first 30 seconds with your best content. Use pattern interrupts (cuts, text, music changes) every 90 seconds."
      : null,
    trend: null,
  });

  // 2. Avg watch duration absolute (weight 25%)
  // Longer absolute watch time = more ad revenue signal to YouTube
  const watchDurBenchmark = input.avgVideoDuration * 0.45; // 45% of video length
  const watchDurScore = watchDurBenchmark > 0
    ? clamp(sigmoidScore(input.avgViewDuration / watchDurBenchmark))
    : 50;
  const watchMinutes = input.avgViewDuration / 60;
  metrics.push({
    key: "avg_watch_duration",
    name: "Avg Watch Duration",
    value: parseFloat(watchMinutes.toFixed(1)),
    score: watchDurScore,
    weight: 0.22,
    unit: "min",
    benchmark: parseFloat((watchDurBenchmark / 60).toFixed(1)),
    benchmarkLabel: `${(watchDurBenchmark / 60).toFixed(1)} min target`,
    percentile: watchDurScore >= 75 ? "Strong" : watchDurScore >= 50 ? "Average" : "Below average",
    hasIssue: watchDurScore < 40,
    issueLevel: watchDurScore < 25 ? "critical" : watchDurScore < 40 ? "warning" : null,
    recommendation: watchDurScore < 40
      ? "Viewers are watching less than 40% of your videos. Front-load value and tease what's coming to keep them watching."
      : null,
    trend: null,
  });

  // 3. Video length optimization (weight 20%)
  // Sweet spots by YouTube's own creator data:
  // 8-15 min = best for ads + retention balance
  // <3 min = Shorts territory (different algorithm)
  // >30 min = only works for established channels
  const durationMins = input.avgVideoDuration / 60;
  let lengthScore: number;
  let lengthNote: string;
  if (durationMins < 1) {
    lengthScore = 20; lengthNote = "under 1 min";
  } else if (durationMins < 3) {
    lengthScore = 45; lengthNote = "1-3 min (consider Shorts strategy)";
  } else if (durationMins < 6) {
    lengthScore = 65; lengthNote = "3-6 min";
  } else if (durationMins < 10) {
    lengthScore = 88; lengthNote = "6-10 min (optimal)";
  } else if (durationMins < 20) {
    lengthScore = 95; lengthNote = "10-20 min (optimal)";
  } else if (durationMins < 35) {
    lengthScore = 75; lengthNote = "20-35 min";
  } else {
    lengthScore = 55; lengthNote = "35+ min (high drop-off risk)";
  }
  metrics.push({
    key: "video_length",
    name: "Video Length Optimization",
    value: parseFloat(durationMins.toFixed(1)),
    score: lengthScore,
    weight: 0.15,
    unit: "min avg",
    benchmark: 12,
    benchmarkLabel: "8-20 min sweet spot",
    percentile: lengthScore >= 85 ? "Optimal range" : "Suboptimal",
    hasIssue: lengthScore < 55,
    issueLevel: lengthScore < 40 ? "warning" : null,
    recommendation: lengthScore < 55
      ? `Your average video length (${durationMins.toFixed(1)} min) is ${lengthNote}. Videos between 8-20 minutes earn more ad revenue and perform better in recommendations.`
      : null,
    trend: null,
  });

  // 4. Audience loyalty — share of views from subscribed viewers (weight 15%)
  // A healthy mix: enough subscriber loyalty (a returning base) without being
  // 100% subscriber-dependent (which means no new-audience reach). Sweet spot
  // is moderate — both extremes are penalised slightly.
  const subPct = input.subscriberViewPct;
  let loyaltyScore: number;
  if (subPct <= 0) loyaltyScore = 50;          // data unavailable → neutral
  else if (subPct < 10) loyaltyScore = 55;      // almost no returning base
  else if (subPct < 25) loyaltyScore = 78;      // healthy: strong new reach + some loyalty
  else if (subPct < 45) loyaltyScore = 90;      // ideal balance
  else if (subPct < 65) loyaltyScore = 75;      // loyal but limited new reach
  else loyaltyScore = 55;                        // over-reliant on subscribers
  metrics.push({
    key: "audience_loyalty",
    name: "Audience Loyalty",
    value: parseFloat(subPct.toFixed(1)),
    score: loyaltyScore,
    weight: 0.15,
    unit: "% subscriber views",
    benchmark: 35,
    benchmarkLabel: "~25-45% from subscribers",
    percentile: loyaltyScore >= 85 ? "Ideal balance" : loyaltyScore >= 70 ? "Healthy" : "Imbalanced",
    hasIssue: subPct > 0 && loyaltyScore < 60,
    issueLevel: null,
    recommendation: subPct >= 65
      ? "Most of your views come from existing subscribers — great loyalty, but your content isn't reaching new audiences. Optimize packaging for browse/suggested to expand reach."
      : (subPct > 0 && subPct < 10)
      ? "Very few views come from subscribers — viewers aren't sticking around. Strengthen your channel identity and give people a clear reason to subscribe."
      : null,
    trend: null,
  });

  const score = clamp(metrics.reduce((acc, m) => acc + m.score * m.weight, 0));

  return {
    score,
    grade: scoreGrade(score),
    label: scoreLabel(score),
    weight: 0.27,
    metrics,
    summary: score >= 70
      ? "Viewers watch a strong percentage of your videos."
      : score >= 45
      ? "Retention is average — improving hooks will increase algorithmic reach."
      : "Low retention is the biggest blocker to growth. Focus here first.",
  };
}

// ─── Category: Upload Consistency ────────────────────────────────────────────
/**
 * Measures how consistently and recently you upload.
 * YouTube's algorithm favors consistent publishers.
 *
 * Benchmarks:
 *   - Optimal: 1-2 videos/week for most channels
 *   - Daily: only sustainable for large teams
 *   - Recency: last upload <7 days = active
 */
export function calculateUploadConsistency(input: MetricInput): CategoryScore {
  const metrics: MetricResult[] = [];

  // 1. Monthly upload frequency (weight 40%) — benchmark adapts to content type
  const uploadsPerMonth = input.uploadsLast30Days;
  const freqScore = uploadFreqScore(uploadsPerMonth, input.isShorts);
  const freqBenchmark = input.isShorts ? 30 : 4;
  const freqUnit = input.isShorts ? "Shorts/month" : "videos/month";
  metrics.push({
    key: "upload_frequency",
    name: "Upload Frequency",
    value: uploadsPerMonth,
    score: freqScore,
    weight: 0.40,
    unit: freqUnit,
    benchmark: freqBenchmark,
    benchmarkLabel: input.isShorts ? "post daily (~30/month)" : "4/month minimum",
    percentile: input.isShorts
      ? (uploadsPerMonth >= 26 ? "Top 20%" : uploadsPerMonth >= 17 ? "Average" : "Below average")
      : (uploadsPerMonth >= 8 ? "Top 20%" : uploadsPerMonth >= 4 ? "Average" : "Below average"),
    hasIssue: freqScore < 60,
    issueLevel: freqScore < 30 ? "critical" : freqScore < 60 ? "warning" : null,
    recommendation: freqScore < 60
      ? input.isShorts
        ? `You posted ${uploadsPerMonth} Short${uploadsPerMonth === 1 ? "" : "s"} last month. Post DAILY (aim ~30/month) — YouTube rewards consistent daily Shorts and pulls back distribution when you skip days. Batch-film and schedule one every day.`
        : `You uploaded ${uploadsPerMonth} video${uploadsPerMonth === 1 ? "" : "s"} last month. Aim for 4+ per month minimum. Batch-record on weekends and schedule releases throughout the week.`
      : null,
    trend: null,
  });

  // 2. Upload recency (weight 30%)
  // Days since last upload — freshness matters
  const days = input.daysSinceLastUpload;
  let recencyScore: number;
  if (input.isShorts) {
    // Shorts should be DAILY. Each skipped day costs distribution, so we drop fast.
    if (days <= 1) recencyScore = 100; // posted today/yesterday
    else if (days === 2) recencyScore = 80;
    else if (days <= 4) recencyScore = 60;
    else if (days <= 7) recencyScore = 40;
    else if (days <= 14) recencyScore = 22;
    else if (days <= 30) recencyScore = 10;
    else recencyScore = 4;
  } else {
    if (days <= 3) recencyScore = 100;
    else if (days <= 7) recencyScore = 90;
    else if (days <= 14) recencyScore = 70;
    else if (days <= 21) recencyScore = 50;
    else if (days <= 30) recencyScore = 30;
    else if (days <= 60) recencyScore = 15;
    else recencyScore = 5;
  }

  metrics.push({
    key: "upload_recency",
    name: "Upload Recency",
    value: days,
    score: recencyScore,
    weight: 0.30,
    unit: "days since last",
    benchmark: input.isShorts ? 1 : 7,
    benchmarkLabel: input.isShorts ? "post every day" : "upload within 7 days",
    percentile: input.isShorts
      ? (days <= 1 ? "Active" : days <= 4 ? "Slipping" : "Inactive")
      : (days <= 7 ? "Active" : days <= 14 ? "Recent" : "Inactive"),
    hasIssue: recencyScore < 60,
    issueLevel: recencyScore < 30 ? "critical" : recencyScore < 60 ? "warning" : null,
    recommendation: recencyScore < 60
      ? input.isShorts
        ? `Last Short was ${days} day${days === 1 ? "" : "s"} ago. Shorts need DAILY uploads — YouTube penalizes skipped days and pulls back your reach. Get back to posting every single day, even a simple Short, to rebuild momentum.`
        : `Last upload was ${days} days ago. YouTube de-prioritizes channels that go quiet. Even a short video can re-activate your channel's distribution.`
      : null,
    trend: null,
  });

  // 3. Consistency ratio: 30-day vs 90-day pace (weight 30%)
  // Are you maintaining your pace or slowing down?
  const pace90 = input.uploadsLast90Days / 3; // expected per month from 90d
  const consistencyRatio = pace90 > 0 ? input.uploadsLast30Days / pace90 : 0;
  // ratio=1 means perfectly consistent, >1 ramping up, <1 slowing down
  let consistencyScore: number;
  if (consistencyRatio >= 1.2) consistencyScore = 100;
  else if (consistencyRatio >= 0.9) consistencyScore = 85;
  else if (consistencyRatio >= 0.7) consistencyScore = 65;
  else if (consistencyRatio >= 0.5) consistencyScore = 45;
  else if (consistencyRatio >= 0.3) consistencyScore = 25;
  else consistencyScore = 10;

  metrics.push({
    key: "upload_consistency",
    name: "Pacing Consistency",
    value: Math.round(consistencyRatio * 100),
    score: consistencyScore,
    weight: 0.30,
    unit: "% of 90d pace",
    benchmark: 100,
    benchmarkLabel: "Maintaining pace",
    percentile: consistencyScore >= 80 ? "Consistent" : consistencyScore >= 55 ? "Slowing" : "Significant drop",
    hasIssue: consistencyScore < 50,
    issueLevel: consistencyScore < 30 ? "critical" : consistencyScore < 50 ? "warning" : null,
    recommendation: consistencyScore < 50
      ? "Your upload pace has dropped significantly vs your 90-day average. Inconsistency trains the algorithm and your audience to expect less. Use a content calendar."
      : null,
    trend: consistencyRatio >= 1 ? "up" : "down",
  });

  const score = clamp(metrics.reduce((acc, m) => acc + m.score * m.weight, 0));

  return {
    score,
    grade: scoreGrade(score),
    label: scoreLabel(score),
    weight: 0.20,
    metrics,
    summary: score >= 70
      ? "You're publishing consistently — the algorithm rewards this."
      : score >= 45
      ? "Upload frequency is inconsistent. Pick a schedule and stick to it."
      : "Inconsistent uploads are significantly limiting your channel's reach.",
  };
}

// ─── Category: Authority ─────────────────────────────────────────────────────
/**
 * Measures your channel's established trust and size.
 * This is the hardest to move quickly — it rewards tenure.
 *
 * Log-scale scoring because subscriber growth is logarithmic.
 */
export function calculateAuthority(input: MetricInput): CategoryScore {
  const metrics: MetricResult[] = [];

  // 1. Subscriber count (weight 25%) — log scale
  // 1K = 20, 10K = 40, 100K = 60, 1M = 80, 10M = 100
  const subScore = clamp(Math.log10(Math.max(input.subscriberCount, 1)) * 13.3);
  metrics.push({
    key: "subscriber_count",
    name: "Subscriber Base",
    value: input.subscriberCount,
    score: subScore,
    weight: 0.25,
    unit: "subs",
    benchmark: 10000,
    benchmarkLabel: "10K milestone",
    percentile: input.subscriberCount >= 1_000_000 ? "Top 1%" :
                 input.subscriberCount >= 100_000  ? "Top 5%" :
                 input.subscriberCount >= 10_000   ? "Top 15%" : "Growing",
    hasIssue: false,
    issueLevel: null,
    recommendation: null,
    trend: null,
  });

  // 2. Total views per subscriber (lifetime authority signal, weight 30%)
  // Higher ratio = content has compounding reach beyond subscribers
  const vps = input.subscriberCount > 0 ? input.totalViews / input.subscriberCount : 0;
  // Benchmark: healthy channel has 50-200x views per subscriber
  const vpsBenchmark = 80;
  const vpsScore = clamp(Math.log10(Math.max(vps, 0.1) + 1) * 30);
  metrics.push({
    key: "lifetime_views_per_sub",
    name: "Lifetime Views / Subscriber",
    value: parseFloat(vps.toFixed(1)),
    score: vpsScore,
    weight: 0.30,
    unit: "×",
    benchmark: vpsBenchmark,
    benchmarkLabel: "80× ratio target",
    percentile: vps >= 200 ? "Top 10%" : vps >= 80 ? "Strong" : vps >= 30 ? "Average" : "Growing",
    hasIssue: false,
    issueLevel: null,
    recommendation: vps < 20
      ? "Low lifetime views per subscriber usually means the channel is new or had a subscriber spike. Keep producing consistent content."
      : null,
    trend: null,
  });

  // 3. Minutes watched (session contribution, weight 25%)
  // Channels with high watch time get boosted in suggested videos
  const mwBenchmark = 5000; // 5,000 hours per 90 days = solid
  const mwHours = input.estimatedMinutesWatched / 60;
  const mwScore = clamp(Math.log10(Math.max(mwHours, 1)) / Math.log10(mwBenchmark) * 100);
  metrics.push({
    key: "watch_time",
    name: "Watch Time (90 days)",
    value: Math.round(mwHours),
    score: mwScore,
    weight: 0.25,
    unit: "hours",
    benchmark: mwBenchmark,
    benchmarkLabel: "5,000 hours target",
    percentile: mwHours >= 10000 ? "Top 10%" : mwHours >= 5000 ? "Strong" : mwHours >= 1000 ? "Average" : "Growing",
    hasIssue: false,
    issueLevel: null,
    recommendation: null,
    trend: null,
  });

  // 4. Channel age (weight 20%) — YouTube trusts older channels more
  const ageYears = input.channelAgeInDays / 365;
  const ageScore = clamp(ageYears >= 5 ? 100 : ageYears >= 3 ? 85 : ageYears >= 2 ? 70 : ageYears >= 1 ? 55 : ageYears >= 0.5 ? 35 : 15);
  metrics.push({
    key: "channel_age",
    name: "Channel Age",
    value: parseFloat(ageYears.toFixed(1)),
    score: ageScore,
    weight: 0.20,
    unit: "years",
    benchmark: 3,
    benchmarkLabel: "3+ years established",
    percentile: ageYears >= 5 ? "Veteran" : ageYears >= 2 ? "Established" : ageYears >= 1 ? "Growing" : "New",
    hasIssue: false,
    issueLevel: null,
    recommendation: null,
    trend: "up",
  });

  const score = clamp(metrics.reduce((acc, m) => acc + m.score * m.weight, 0));

  return {
    score,
    grade: scoreGrade(score),
    label: scoreLabel(score),
    weight: 0.15,
    metrics,
    summary: score >= 70
      ? "Strong authority — YouTube trusts your channel with broader distribution."
      : score >= 45
      ? "Building authority — keep consistent and it grows automatically."
      : "Early stage channel — authority builds with time and quality content.",
  };
}

// ─── Category: Velocity ──────────────────────────────────────────────────────
/**
 * Measures how fast your channel is growing.
 * Leading indicator of channel health trajectory.
 *
 * Benchmarks (90-day windows):
 *   - Sub growth rate: 5%+ strong, 2% average, <1% poor
 *   - Net subscriber retention: subs gained / (gained + lost) > 80%
 *   - Views growth: positive momentum
 */
export function calculateVelocity(input: MetricInput): CategoryScore {
  const metrics: MetricResult[] = [];

  // 1. Net subscriber growth rate (90 days, weight 30%)
  const netSubs = input.subscribersGained - input.subscribersLost;
  const growthRate = input.subscriberCount > 0
    ? (netSubs / input.subscriberCount) * 100
    : 0;
  // Score: 0% = 45 (neutral), 5% = 65, 10% = 85, 20%+ = 95, -5% = 20
  const growthScore = clamp(45 + growthRate * 4);
  metrics.push({
    key: "sub_growth_rate",
    name: "Subscriber Growth Rate",
    value: parseFloat(growthRate.toFixed(2)),
    score: growthScore,
    weight: 0.30,
    unit: "% / 90 days",
    benchmark: 5,
    benchmarkLabel: "5% per 90 days",
    percentile: growthRate >= 10 ? "Top 15%" : growthRate >= 5 ? "Strong" : growthRate >= 2 ? "Average" : growthRate > 0 ? "Slow" : "Declining",
    hasIssue: growthScore < 35,
    issueLevel: growthRate < -2 ? "critical" : growthRate < 1 ? "warning" : null,
    recommendation: growthScore < 45
      ? "Subscriber growth is stalling. Add clear CTAs at video peak moments (not just the end). Make your subscribe value proposition explicit."
      : null,
    trend: netSubs > 0 ? "up" : netSubs < 0 ? "down" : "neutral",
  });

  // 2. Subscriber retention rate (weight 22%)
  const totalMoved = input.subscribersGained + input.subscribersLost;
  const retentionRate = totalMoved > 0
    ? (input.subscribersGained / totalMoved) * 100
    : 75;
  const subRetScore = clamp(
    retentionRate >= 95 ? 100 :
    retentionRate >= 90 ? 85 :
    retentionRate >= 80 ? 70 :
    retentionRate >= 70 ? 55 :
    retentionRate >= 60 ? 40 : 20
  );
  metrics.push({
    key: "sub_retention",
    name: "Subscriber Retention Rate",
    value: parseFloat(retentionRate.toFixed(1)),
    score: subRetScore,
    weight: 0.20,
    unit: "%",
    benchmark: 90,
    benchmarkLabel: "90%+ retention target",
    percentile: retentionRate >= 95 ? "Excellent" : retentionRate >= 85 ? "Good" : "Average",
    hasIssue: subRetScore < 45,
    issueLevel: retentionRate < 65 ? "critical" : retentionRate < 80 ? "warning" : null,
    recommendation: subRetScore < 45
      ? "High unsubscribe rate means your content is attracting the wrong audience or disappointing existing subscribers. Audit your recent titles vs actual content."
      : null,
    trend: null,
  });

  // 3. Views momentum — REAL recent 28d vs prior 28d (weight 25%)
  // input.viewsMomentum is a % change: +20 means 20% more views than the prior period.
  const vm = input.viewsMomentum;
  const viewsMomScore = clamp(
    vm >= 50  ? 100 :
    vm >= 25  ? 90  :
    vm >= 10  ? 78  :
    vm >= 0   ? 65  :
    vm >= -15 ? 48  :
    vm >= -30 ? 32  : 15
  );
  metrics.push({
    key: "views_momentum",
    name: "Views Momentum (28d)",
    value: Math.round(vm),
    score: viewsMomScore,
    weight: 0.20,
    unit: "% vs prior 28d",
    benchmark: 10,
    benchmarkLabel: "+10% month-over-month",
    percentile: vm >= 25 ? "Growing fast" : vm >= 0 ? "Growing" : vm >= -15 ? "Slipping" : "Declining",
    hasIssue: viewsMomScore < 40,
    issueLevel: vm < -30 ? "critical" : vm < -10 ? "warning" : null,
    recommendation: viewsMomScore < 48
      ? "Your views are trending down month-over-month. Refresh thumbnails on recent uploads and double down on the topics that performed best."
      : null,
    trend: vm >= 0 ? "up" : "down",
  });

  // 4. Subscriber conversion — net subs per 1,000 views (weight 15%)
  // How effectively your views turn into subscribers. ~3-5 per 1k is healthy.
  const convBenchmark = 4;
  const conv = input.subsPerThousandViews;
  const convScore = clamp(sigmoidScore(conv / convBenchmark));
  metrics.push({
    key: "sub_conversion",
    name: "Subscriber Conversion",
    value: parseFloat(conv.toFixed(2)),
    score: convScore,
    weight: 0.15,
    unit: "per 1k views",
    benchmark: convBenchmark,
    benchmarkLabel: "4 subs / 1,000 views",
    percentile: convScore >= 80 ? "Top 20%" : convScore >= 55 ? "Average" : "Below average",
    hasIssue: convScore < 40,
    issueLevel: conv < 0 ? "critical" : convScore < 40 ? "warning" : null,
    recommendation: convScore < 45
      ? "Few viewers convert to subscribers. Tell viewers exactly what they'll get by subscribing, and pin a comment reinforcing your channel's value."
      : null,
    trend: null,
  });

  // 5. Algorithmic Discovery (weight 15%) — THE core "is YouTube pushing you" signal.
  // High suggested + browse share = the algorithm is actively distributing your
  // content (vs. relying only on subscribers/search). This is what "trust" means.
  const algoPct = input.suggestedPct + input.browsePct;
  // Healthy channels get 40-70%+ of views from browse/suggested.
  const algoScore = clamp(
    algoPct >= 70 ? 100 :
    algoPct >= 55 ? 90 :
    algoPct >= 40 ? 75 :
    algoPct >= 25 ? 55 :
    algoPct >= 15 ? 38 :
    algoPct > 0   ? 22 : 50 // 0 = data unavailable → neutral
  );
  metrics.push({
    key: "algo_discovery",
    name: "Algorithmic Discovery",
    value: parseFloat(algoPct.toFixed(1)),
    score: algoScore,
    weight: 0.15,
    unit: "% browse+suggested",
    benchmark: 50,
    benchmarkLabel: "50%+ from algorithm",
    percentile: algoPct >= 55 ? "Top 20%" : algoPct >= 40 ? "Strong" : algoPct >= 25 ? "Average" : "Low reach",
    hasIssue: algoPct > 0 && algoScore < 50,
    issueLevel: algoPct > 0 && algoScore < 35 ? "critical" : algoPct > 0 && algoScore < 50 ? "warning" : null,
    recommendation: algoPct > 0 && algoScore < 50
      ? `Only ${algoPct.toFixed(0)}% of your views come from browse/suggested — YouTube isn't actively pushing your content. Improve packaging (titles/thumbnails) and retention so the algorithm tests you wider.`
      : null,
    trend: null,
  });

  const score = clamp(metrics.reduce((acc, m) => acc + m.score * m.weight, 0));

  return {
    score,
    grade: scoreGrade(score),
    label: scoreLabel(score),
    weight: 0.10,
    metrics,
    summary: score >= 70
      ? "Channel is on an upward trajectory — momentum is building."
      : score >= 45
      ? "Growth is modest. Stronger consistency and engagement will accelerate velocity."
      : "Growth has stalled. Focus on engagement fundamentals to restart momentum.",
  };
}

// ─── Overall Score ────────────────────────────────────────────────────────────

export function calculateOverallScore(input: MetricInput): ScoreResult {
  const engagement = calculateEngagement(input);
  const retention  = calculateRetention(input);
  const upload     = calculateUploadConsistency(input);
  const authority  = calculateAuthority(input);
  const velocity   = calculateVelocity(input);

  // Weighted overall — weights match category.weight values
  const overall = clamp(
    engagement.score * engagement.weight +
    retention.score  * retention.weight  +
    upload.score     * upload.weight     +
    authority.score  * authority.weight  +
    velocity.score   * velocity.weight
  );

  // Collect and rank all recommendations by impact
  const allMetrics = [
    ...engagement.metrics,
    ...retention.metrics,
    ...upload.metrics,
    ...authority.metrics,
    ...velocity.metrics,
  ];

  const categoryNames: Record<string, string> = {
    like_rate: "Engagement",
    comment_rate: "Engagement",
    sentiment: "Engagement",
    view_sub_ratio: "Engagement",
    share_rate: "Engagement",
    saves_rate: "Engagement",
    avg_view_percentage: "Retention",
    avg_watch_duration: "Retention",
    video_length: "Retention",
    audience_loyalty: "Retention",
    upload_frequency: "Consistency",
    upload_recency: "Consistency",
    upload_consistency: "Consistency",
    subscriber_count: "Authority",
    lifetime_views_per_sub: "Authority",
    watch_time: "Authority",
    channel_age: "Authority",
    sub_growth_rate: "Velocity",
    sub_retention: "Velocity",
    views_momentum: "Velocity",
    sub_conversion: "Velocity",
    algo_discovery: "Velocity",
  };

  const recommendations: Recommendation[] = allMetrics
    .filter((m) => m.hasIssue && m.recommendation)
    .map((m) => {
      // Prefer expert, transcript-grounded guidance when available.
      const expert = expertTipFor(m.key);
      const description = expert ? expert.tip : m.recommendation!;
      return {
        category: categoryNames[m.key] ?? "General",
        level: m.issueLevel ?? "info",
        title: m.name,
        description,
        impact: Math.round(100 - m.score),
        action: description.split(".")[0] + ".",
      };
    })
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 8);

  // Generate 3 key insights
  const categories = [engagement, retention, upload, authority, velocity];
  const weakest = [...categories].sort((a, b) => a.score - b.score)[0];
  const strongest = [...categories].sort((a, b) => b.score - a.score)[0];

  const insights: string[] = [];

  const categoryLabelMap: Record<number, string> = {
    0: "Engagement",
    1: "Retention",
    2: "Consistency",
    3: "Authority",
    4: "Velocity",
  };
  const weakestName = [engagement, retention, upload, authority, velocity]
    .map((c, i) => ({ c, i }))
    .find((x) => x.c === weakest)!;
  const strongestName = [engagement, retention, upload, authority, velocity]
    .map((c, i) => ({ c, i }))
    .find((x) => x.c === strongest)!;

  if (overall >= 70) {
    insights.push(`Strong overall performance — your ${categoryLabelMap[strongestName.i]} is a key driver.`);
  } else {
    insights.push(`Your biggest opportunity is ${categoryLabelMap[weakestName.i]} (score: ${Math.round(weakest.score)}/100).`);
  }

  if (retention.score < 55) {
    insights.push("Retention is below average — this directly limits how YouTube distributes your videos.");
  } else if (engagement.score < 50) {
    insights.push("CTR and engagement are limiting your reach in Browse and Suggested.");
  } else if (upload.score < 50) {
    insights.push("Upload consistency is your top growth lever — consistent publishers grow 2-3× faster.");
  } else {
    insights.push(`Your retention rate of ${input.avgViewPercentage.toFixed(0)}% puts you in the ${scorePercentile(retention.score)} of creators.`);
  }

  insights.push(
    recommendations.length > 0
      ? `Top priority: ${recommendations[0].title.toLowerCase()} — estimated +${recommendations[0].impact} score points.`
      : "No critical issues detected. Focus on incremental improvement across all categories."
  );

  const tier = trustTier(overall);

  return {
    overall,
    grade: scoreGrade(overall),
    label: scoreLabel(overall),
    percentile: scorePercentile(overall),
    trustBadge: trustBadge(overall),
    trustTier: tier.tier,
    trustMeaning: tier.meaning,
    engagement,
    retention,
    upload,
    authority,
    velocity,
    recommendations,
    insights,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Bridge from Analytics API data ──────────────────────────────────────────

export function calculateScoreFromAnalytics(
  analytics: import("@/lib/youtube/analytics").YouTubeAnalyticsData,
  channel: import("@/lib/youtube/api").YouTubeChannelData,
  videoCount: number,
  videoData?: {
    uploadsLast7Days: number;
    uploadsLast30Days: number;
    uploadsLast90Days: number;
    daysSinceLastUpload: number;
    avgVideoDurationSeconds: number;
  },
  isShorts = false
): ScoreResult {
  const channelAgeInDays = Math.floor(
    (Date.now() - new Date(channel.publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Use video data if provided, otherwise estimate from total video count
  const uploadsLast30 = videoData?.uploadsLast30Days ?? Math.round(videoCount / (channelAgeInDays / 30));
  const uploadsLast90 = videoData?.uploadsLast90Days ?? Math.round(videoCount / (channelAgeInDays / 90));
  const daysSinceLast = videoData?.daysSinceLastUpload ?? 7;
  const avgVideoDur   = videoData?.avgVideoDurationSeconds ?? (analytics.avgViewDuration / Math.max(analytics.avgViewPercentage / 100, 0.1));

  const input: MetricInput = {
    // Engagement
    avgViewsPerVideo: analytics.views / Math.max(videoCount, 1),
    subscriberCount: channel.subscriberCount,
    avgLikes: (analytics.likeRate / 100) * analytics.views / Math.max(videoCount, 1),
    avgComments: (analytics.commentRate / 100) * analytics.views / Math.max(videoCount, 1),
    avgShares: (analytics.shareRate / 100) * analytics.views / Math.max(videoCount, 1),
    likeRate: analytics.likeRate,
    commentRate: analytics.commentRate,
    shareRate: analytics.shareRate,
    likeToDislikeRatio: analytics.likeToDislikeRatio,

    // Retention
    avgViewDuration: analytics.avgViewDuration,
    avgVideoDuration: avgVideoDur,
    avgViewPercentage: analytics.avgViewPercentage,
    avgCtr: analytics.ctr,

    // Upload
    uploadsLast7Days: videoData?.uploadsLast7Days ?? Math.round(uploadsLast30 / 4),
    uploadsLast30Days: uploadsLast30,
    uploadsLast90Days: uploadsLast90,
    daysSinceLastUpload: daysSinceLast,
    isShorts,

    // Authority
    totalViews: channel.viewCount,
    channelAgeInDays,
    videoCount: channel.videoCount,

    // Velocity
    subscribersGained: analytics.subscribersGained,
    subscribersLost: analytics.subscribersLost,
    viewsLast90Days: analytics.views,
    estimatedMinutesWatched: analytics.estimatedMinutesWatched,
    subsPerThousandViews: analytics.subsPerThousandViews,
    viewsMomentum: analytics.viewsMomentum,
    watchTimeMomentum: analytics.watchTimeMomentum,
    subsMomentum: analytics.subsMomentum,
    viewsPerUniqueViewer: analytics.viewsPerUniqueViewer,

    // Trust signals
    impressions: analytics.impressions,
    swipeRatio: analytics.swipeRatio,

    // New real signals
    savesRate: analytics.savesRate,
    browsePct: analytics.browsePct,
    suggestedPct: analytics.suggestedPct,
    searchPct: analytics.searchPct,
    externalPct: analytics.externalPct,
    subscriberViewPct: analytics.subscriberViewPct,
    niche: (channel as { niche?: string }).niche,
  };

  return calculateOverallScore(input);
}
