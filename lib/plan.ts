// ── Plan / feature gating ─────────────────────────────────────────────────────
// Central place that decides what a user can access. Today everything is
// UNLOCKED (PAYWALL_ENABLED = false). When we add a payment/credits system,
// flip PAYWALL_ENABLED to true and wire real tiers — the UI + APIs already
// consult these helpers, so gating becomes a one-line switch, not a rewrite.

export type Tier = "free" | "creator" | "pro";

// MASTER SWITCH. While false, every feature is unlocked for everyone (no paywall
// shown, no limits). Turn on once billing exists.
export const PAYWALL_ENABLED = false;

// What each gated capability requires. Add capabilities here as we gate more.
export type Capability =
  | "explore_full_library"   // see the whole library vs a capped preview
  | "performance_sorting"    // sort by best-performing (all-time views / velocity)
  | "channel_search"         // search within the Channels tab
  | "best_videos"            // surface all-time best videos, not just recent
  | "advanced_filters";      // Discover advanced filters (niche, subs, faceless, language)

// Minimum tier for each capability. "free" = available to everyone.
const REQUIRED_TIER: Record<Capability, Tier> = {
  explore_full_library: "creator",
  performance_sorting: "creator",
  channel_search: "creator",
  best_videos: "creator",
  advanced_filters: "creator",
};

// Free-tier preview limit for the library (how many videos a free user sees).
export const FREE_PREVIEW_LIMIT = 60;

const TIER_RANK: Record<Tier, number> = { free: 0, creator: 1, pro: 2 };

// Does a user's tier unlock a capability? When the paywall is OFF, always yes.
export function canUse(tier: Tier | undefined, cap: Capability): boolean {
  if (!PAYWALL_ENABLED) return true;
  const t = tier ?? "free";
  return TIER_RANK[t] >= TIER_RANK[REQUIRED_TIER[cap]];
}

// A user's effective library cap for Explore (Infinity when unlocked).
export function libraryLimit(tier: Tier | undefined): number {
  return canUse(tier, "explore_full_library") ? Infinity : FREE_PREVIEW_LIMIT;
}
