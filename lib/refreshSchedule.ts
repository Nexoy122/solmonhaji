// ── Unified weekly refresh schedule ───────────────────────────────────────────
// ALL data pages (Explore videos, Discover channels, Niche Research recaps)
// refresh together, once a week, at the SAME fixed time: Monday 04:00 UTC.
// This module is the single source of truth for that schedule. It's pure date
// math (no server-only imports) so both the client countdown and the server
// refresh logic import it.

// The weekly slot: Monday = day 1, at 04:00 UTC.
export const REFRESH_DAY_UTC = 1;   // 0=Sun, 1=Mon
export const REFRESH_HOUR_UTC = 4;  // 04:00 UTC

// Next Monday 04:00 UTC strictly after `from` (ms). If `from` is exactly a slot,
// returns the following week's slot.
export function nextRefreshAt(from: number = Date.now()): number {
  const d = new Date(from);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), REFRESH_HOUR_UTC, 0, 0, 0));
  // Advance to the target weekday (Monday).
  const dayDiff = (REFRESH_DAY_UTC - next.getUTCDay() + 7) % 7;
  next.setUTCDate(next.getUTCDate() + dayDiff);
  // If that instant is already past (same-day but time passed, or dayDiff 0 and
  // we're past 04:00), jump a full week forward.
  if (next.getTime() <= from) next.setUTCDate(next.getUTCDate() + 7);
  return next.getTime();
}

// The most recent Monday 04:00 UTC at or before `from`, the "current" slot.
export function currentRefreshSlot(from: number = Date.now()): number {
  return nextRefreshAt(from) - 7 * 86_400_000;
}

// Has the weekly slot rolled over since the last successful refresh? True when a
// new Monday-04:00 slot has begun that the last run didn't cover.
export function isWeeklyRefreshDue(lastRefresh: number, now: number = Date.now()): boolean {
  if (!lastRefresh) return true;
  return lastRefresh < currentRefreshSlot(now);
}

// "5d 9h 41m" style label for the time remaining until the next refresh.
export function refreshCountdownLabel(now: number = Date.now()): string {
  const ms = nextRefreshAt(now) - now;
  if (ms <= 0) return "soon";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
