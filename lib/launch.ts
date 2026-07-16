// ── Launch countdown ─────────────────────────────────────────────────────────
// Until LAUNCH_AT, the public site is a countdown and nothing else.
//
// Stored as a fixed UTC instant so it means the same moment everywhere and can
// never drift with a server's local timezone.
//
//   2026-07-16T19:00:00Z
//     = 21:00 Berlin/Paris (CEST, 9 PM)
//     = 00:00 Pakistan (17 July, midnight)
//     = 20:00 London (BST)
//
// Override with LAUNCH_AT (any ISO-8601 with an offset, e.g. 2026-07-16T19:00:00Z).
// Set LAUNCH_AT=off to disable the gate entirely.

const DEFAULT_LAUNCH = "2026-07-16T19:00:00Z";

const raw = (process.env.NEXT_PUBLIC_LAUNCH_AT ?? process.env.LAUNCH_AT ?? DEFAULT_LAUNCH).trim();

export const LAUNCH_DISABLED = raw.toLowerCase() === "off";

export const LAUNCH_AT_MS = (() => {
  if (LAUNCH_DISABLED) return 0;
  const t = Date.parse(raw);
  // A malformed value must not accidentally lock the site forever, nor open it
  // early: fall back to the known-good default.
  return Number.isNaN(t) ? Date.parse(DEFAULT_LAUNCH) : t;
})();

export function hasLaunched(now: number = Date.now()): boolean {
  return LAUNCH_DISABLED || now >= LAUNCH_AT_MS;
}

export function msUntilLaunch(now: number = Date.now()): number {
  return Math.max(0, LAUNCH_AT_MS - now);
}
