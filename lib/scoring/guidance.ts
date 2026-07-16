/**
 * Expert YouTube guidance, distilled from a creator with 8+ years / 26B+ views
 * who runs 35+ automation channels and teaches "trust scores", "view jail",
 * retention, hooks, and swipe ratio directly.
 *
 * The Trust Score engine pulls these to make recommendations specific and
 * actionable (grounded in real creator strategy, not generic tips).
 *
 * Core idea this creator teaches: a high "trust score" = YouTube pushing your
 * videos to the algorithm. It's earned through RETENTION, HOOKS (swipe ratio),
 * consistency, and authentic/compliant content. "View jail" = YouTube isn't
 * satisfied with your output, so it limits distribution.
 */

export interface ExpertTip {
  // which scored metric this guidance maps to
  metricKey: string;
  // short, punchy action grounded in the creator's framework
  tip: string;
  // optional target the creator cites
  target?: string;
}

export const EXPERT_GUIDANCE: Record<string, ExpertTip> = {
  // ── Retention (the #1 lever the creator stresses) ──
  avg_view_percentage: {
    metricKey: "avg_view_percentage",
    tip: "Retention is the #1 Shorts trust signal. Because Shorts loop, aim for 75%+ (and 90-100%+ is viral territory, people re-watch). Hook hard in the first 1-2 seconds, cut every dead beat, and loop the last frame back into the first so it replays seamlessly.",
    target: "Shorts: 75%+ (viral 90-100%+)",
  },
  completion_rate: {
    metricKey: "completion_rate",
    tip: "This is how much of each Short people actually finish. Keep clips tight (15-35s converts best), front-load the payoff, and don't 'warm up', viewers decide in the first second. A clean loop pushes this past 100%.",
    target: "85%+ watched",
  },
  audience_loyalty: {
    metricKey: "audience_loyalty",
    tip: "You want a loyal returning base AND new-audience reach. If almost all views are from subscribers, your packaging isn't pulling new viewers from browse/suggested, sharpen titles and thumbnails.",
  },

  // ── Hooks / engagement (swipe ratio is the creator's hook metric) ──
  like_rate: {
    metricKey: "like_rate",
    tip: "Earn the like with value, don't beg for it. Ask once, naturally, right after your strongest moment, early engagement is weighted heavily by the algorithm.",
  },
  comment_rate: {
    metricKey: "comment_rate",
    tip: "Comments are a top social signal. End on an open question or a mild 'debate' prompt, and reply fast in the first 2 hours to spike activity YouTube notices.",
  },
  share_rate: {
    metricKey: "share_rate",
    tip: "Shares are one of the strongest signals. Build a 'send this to someone' moment, a surprising stat, a relatable callout, or a payoff worth sharing.",
  },
  saves_rate: {
    metricKey: "saves_rate",
    tip: "Saves signal high value. Make reference-worthy content (lists, tutorials, step-by-steps) people want to come back to, that intent boosts your trust with the algorithm.",
  },

  // ── Velocity / discovery (trust = algorithm pushing you) ──
  algo_discovery: {
    metricKey: "algo_discovery",
    tip: "Low browse/suggested % is the clearest sign of 'view jail', YouTube isn't confident enough to push you. The fix is upstream: better hooks + retention so the algorithm tests you on bigger audiences. Don't rely on search/external traffic alone.",
    target: "50%+ of views from browse + suggested",
  },
  views_momentum: {
    metricKey: "views_momentum",
    tip: "Declining momentum means recent uploads underperformed. Double down on the exact topics/formats that already hit, don't reinvent. Refresh thumbnails on recent videos that stalled.",
  },
  sub_growth_rate: {
    metricKey: "sub_growth_rate",
    tip: "Growth follows views, and views follow retention. Fix retention first; subscriber growth is a lagging result of content YouTube trusts enough to push.",
  },

  // ── Upload consistency / authenticity (trust is also about NOT getting flagged) ──
  upload_frequency: {
    metricKey: "upload_frequency",
    tip: "Post Shorts DAILY. The algorithm rewards creators who show up every single day and pulls back reach when you skip. Batch-film a week's worth at once and schedule one per day so you never miss.",
    target: "~30 Shorts/month (one every day)",
  },
  upload_recency: {
    metricKey: "upload_recency",
    tip: "Never skip a day. Each missed day costs distribution, YouTube penalizes gaps and favors daily uploaders. If you've fallen off, restart the daily streak immediately, even with a simple Short, to rebuild momentum.",
    target: "post every day",
  },
  upload_consistency: {
    metricKey: "upload_consistency",
    tip: "A daily streak is everything for Shorts. A dropping pace signals decline to the algorithm. Use a content calendar and protect your daily upload even in slow weeks, consistency beats perfection.",
  },
};

/** Returns the expert tip for a metric, or null. */
export function expertTipFor(metricKey: string): ExpertTip | null {
  return EXPERT_GUIDANCE[metricKey] ?? null;
}

/**
 * A short "what trust score means" explainer, in the creator's framing, keyed by tier.
 */
export const TRUST_EXPLAINER: Record<"high" | "medium" | "low", string> = {
  high: "Your channel has earned the algorithm's trust, YouTube actively pushes your videos to new audiences. Keep retention and consistency high to stay here.",
  medium: "You're in the testing zone, YouTube shows your videos to small audiences and watches the response. Stronger hooks and retention will tip the algorithm into pushing you wider.",
  low: "This is 'view jail', YouTube isn't confident enough to distribute your content. It's almost always a retention + hook problem. Fix the first 3 seconds and the drop-off points before anything else.",
};
