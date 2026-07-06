-- ── Explore video index (Postgres) ───────────────────────────────────────────
-- Run once to create the tables. Safe to re-run (IF NOT EXISTS).

-- Seed creators we track. Mirrors the enriched channel data.
CREATE TABLE IF NOT EXISTS explore_channels (
  channel_id      TEXT PRIMARY KEY,
  title           TEXT NOT NULL DEFAULT '',
  handle          TEXT,
  thumbnail_url   TEXT,
  url             TEXT,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  view_count      BIGINT NOT NULL DEFAULT 0,
  avg_views       BIGINT NOT NULL DEFAULT 0,     -- total views / video count (outlier baseline)
  total_videos    INTEGER NOT NULL DEFAULT 0,
  seed_niche      TEXT,                          -- the niche the USER assigned (source of truth)
  seed_niche_label TEXT,
  ai_niche        TEXT,
  niche_label     TEXT,
  updated_at      BIGINT NOT NULL DEFAULT 0
);

-- Every Short from every seed creator. Unlimited rows — this is the whole point.
CREATE TABLE IF NOT EXISTS explore_videos (
  video_id        TEXT PRIMARY KEY,
  channel_id      TEXT NOT NULL REFERENCES explore_channels(channel_id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  thumbnail       TEXT,
  views           BIGINT NOT NULL DEFAULT 0,
  duration_sec    INTEGER NOT NULL DEFAULT 0,
  published_at    TIMESTAMPTZ,
  outlier_x       REAL NOT NULL DEFAULT 0,        -- views / channel avg
  velocity        REAL NOT NULL DEFAULT 0,        -- views per day since publish
  updated_at      BIGINT NOT NULL DEFAULT 0
);

-- Indexes for the Explore feed's sorts + filters (so paginated reads are fast).
CREATE INDEX IF NOT EXISTS idx_videos_channel     ON explore_videos (channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_views       ON explore_videos (views DESC);
CREATE INDEX IF NOT EXISTS idx_videos_outlier     ON explore_videos (outlier_x DESC);
CREATE INDEX IF NOT EXISTS idx_videos_velocity    ON explore_videos (velocity DESC);
CREATE INDEX IF NOT EXISTS idx_videos_published   ON explore_videos (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_duration    ON explore_videos (duration_sec);

-- Refresh bookkeeping (drives the weekly countdown + staleness check).
CREATE TABLE IF NOT EXISTS explore_meta (
  key   TEXT PRIMARY KEY,
  value BIGINT NOT NULL DEFAULT 0
);
