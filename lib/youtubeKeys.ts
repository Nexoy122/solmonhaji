import "server-only";

// ── YouTube API key rotation / failover ──────────────────────────────────────
// Supply multiple keys (each from a SEPARATE Google Cloud project so they have
// independent quotas) via YOUTUBE_API_KEYS="key1,key2,key3". Falls back to the
// single YOUTUBE_API_KEY if that's all that's set.
//
// When a key returns a quota error, we mark it exhausted until the next daily
// reset (~midnight Pacific) and move to the next key automatically.

function loadKeys(): string[] {
  const multi = process.env.YOUTUBE_API_KEYS?.split(",").map((k) => k.trim()).filter(Boolean) ?? [];
  const single = process.env.YOUTUBE_API_KEY?.trim();
  const all = multi.length ? multi : single ? [single] : [];
  // de-dupe while preserving order
  return [...new Set(all)];
}

// Track keys we've seen hit quota, with the timestamp — cleared at the next
// Pacific midnight. Module-level (per server instance).
const exhausted = new Map<string, number>();

// Returns the ms timestamp of the next YouTube quota reset (midnight Pacific).
function nextResetTs(): number {
  const now = new Date();
  // Pacific is UTC-7 (PDT) or UTC-8 (PST); use -8 as a safe conservative bound
  // so we never reuse a key too early. Resets are at 00:00 PT.
  const ptOffsetHours = 8;
  const ptNow = new Date(now.getTime() - ptOffsetHours * 3600_000);
  const ptMidnight = new Date(Date.UTC(ptNow.getUTCFullYear(), ptNow.getUTCMonth(), ptNow.getUTCDate() + 1, 0, 0, 0));
  return ptMidnight.getTime() + ptOffsetHours * 3600_000;
}

function isExhausted(key: string): boolean {
  const ts = exhausted.get(key);
  if (!ts) return false;
  if (Date.now() >= ts) {
    exhausted.delete(key); // reset window passed
    return false;
  }
  return true;
}

export function markExhausted(key: string): void {
  exhausted.set(key, nextResetTs());
  console.warn(`[youtube] key ...${key.slice(-6)} marked exhausted until reset`);
}

/** Keys still usable right now, in priority order. */
export function availableKeys(): string[] {
  return loadKeys().filter((k) => !isExhausted(k));
}

export function hasAnyKey(): boolean {
  return loadKeys().length > 0;
}

const QUOTA_REASONS = new Set(["quotaExceeded", "rateLimitExceeded", "dailyLimitExceeded"]);

/**
 * Run a YouTube request with automatic key rotation.
 * `build(key)` returns the full request URL for a given API key.
 * Tries each available key in order; on a quota error, marks that key exhausted
 * and tries the next. Throws if all keys are exhausted/failing.
 */
export async function youtubeFetch(build: (key: string) => string): Promise<unknown> {
  const keys = availableKeys();
  if (keys.length === 0) throw new Error("No YouTube API keys available (all exhausted or none configured).");

  let lastErr = "";
  for (const key of keys) {
    const res = await fetch(build(key));
    if (res.ok) return res.json();

    const text = await res.text().catch(() => "");
    let reason = "";
    try {
      reason = JSON.parse(text)?.error?.errors?.[0]?.reason ?? "";
    } catch { /* non-json */ }

    // YouTube signals quota via 403 OR 429, and the reason or message mentions quota.
    const looksLikeQuota =
      res.status === 403 || res.status === 429 ||
      QUOTA_REASONS.has(reason) ||
      /quota/i.test(text);

    if (looksLikeQuota) {
      markExhausted(key);
      lastErr = `quota (${reason || res.status})`;
      continue; // try next key
    }
    // Non-quota error (bad request, etc.) — fail fast, rotating won't help.
    throw new Error(`YouTube request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  throw new Error(`All YouTube API keys exhausted. Last: ${lastErr}`);
}
