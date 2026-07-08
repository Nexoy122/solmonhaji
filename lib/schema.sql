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

-- ── Discover channel index (Postgres) ────────────────────────────────────────
-- The auto-growing index of faceless Shorts channels shown on the Discover page.
-- Moved off Firestore: unlimited rows (no 3,000 cap), no daily read quota, and
-- filtering/sorting happens in SQL instead of loading every doc into memory.
-- One row per channel. recent_videos is stored as JSONB (the channel's OWN Shorts).
CREATE TABLE IF NOT EXISTS discovery_channels (
  channel_id       TEXT PRIMARY KEY,
  title            TEXT NOT NULL DEFAULT '',
  handle           TEXT,
  thumbnail_url    TEXT,
  banner_url       TEXT,
  url              TEXT,
  subscriber_count BIGINT NOT NULL DEFAULT 0,
  view_count       BIGINT NOT NULL DEFAULT 0,
  shorts_count     INTEGER NOT NULL DEFAULT 0,
  total_videos     INTEGER NOT NULL DEFAULT 0,
  avg_shorts_views BIGINT NOT NULL DEFAULT 0,
  views_48h        BIGINT NOT NULL DEFAULT 0,
  views_7d         BIGINT NOT NULL DEFAULT 0,
  country          TEXT,
  ai_niche         TEXT,
  niche_label      TEXT,
  format           TEXT,
  faceless         BOOLEAN NOT NULL DEFAULT FALSE,
  primary_language TEXT,
  description      TEXT,
  ai_topics        JSONB NOT NULL DEFAULT '[]'::jsonb,
  recent_videos    JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_keyword   TEXT,
  updated_at       BIGINT NOT NULL DEFAULT 0,
  created_at       BIGINT NOT NULL DEFAULT 0
);

-- Migration: add banner_url to an existing table (safe if already present).
ALTER TABLE discovery_channels ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Indexes for the Discover feed's sorts + filters.
CREATE INDEX IF NOT EXISTS idx_disc_niche      ON discovery_channels (ai_niche);
CREATE INDEX IF NOT EXISTS idx_disc_subs        ON discovery_channels (subscriber_count DESC);
CREATE INDEX IF NOT EXISTS idx_disc_views       ON discovery_channels (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_disc_48h         ON discovery_channels (views_48h DESC);
CREATE INDEX IF NOT EXISTS idx_disc_updated     ON discovery_channels (updated_at);
CREATE INDEX IF NOT EXISTS idx_disc_faceless    ON discovery_channels (faceless);

-- Manually-deleted channels the crawler must never re-add.
CREATE TABLE IF NOT EXISTS discovery_blocked (
  channel_id TEXT PRIMARY KEY,
  at         BIGINT NOT NULL DEFAULT 0
);
