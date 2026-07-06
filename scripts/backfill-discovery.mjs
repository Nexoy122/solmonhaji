// One-time backfill: copy the existing Discover index from Firestore into
// Postgres (discovery_channels + discovery_blocked). Safe to re-run — every
// row is an upsert. After this, discovery.ts reads/writes Postgres only.
//
// Run on the server (needs DATABASE_URL + Firebase Admin creds in .env):
//   node scripts/backfill-discovery.mjs
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";
import admin from "firebase-admin";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Load .env (DATABASE_URL + Firebase Admin) ──
function loadEnv() {
  try {
    const env = readFileSync(join(root, ".env"), "utf8");
    for (const line of env.split("\n")) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch { /* ignore */ }
}
loadEnv();

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL not set."); process.exit(1); }

// ── Firebase Admin ──
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const fs = admin.firestore();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const num = (v) => (v == null ? 0 : Number(v)) || 0;

async function backfillChannels() {
  const snap = await fs.collection("discovery_channels").get();
  console.log(`Found ${snap.size} channels in Firestore. Upserting into Postgres…`);
  let done = 0;
  for (const doc of snap.docs) {
    const c = doc.data();
    await pool.query(
      `INSERT INTO discovery_channels (
         channel_id, title, handle, thumbnail_url, url, subscriber_count, view_count,
         shorts_count, total_videos, avg_shorts_views, views_48h, views_7d, country,
         ai_niche, niche_label, format, faceless, primary_language, description,
         ai_topics, recent_videos, source_keyword, updated_at, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
         $20::jsonb,$21::jsonb,$22,$23,$24)
       ON CONFLICT (channel_id) DO UPDATE SET
         title=EXCLUDED.title, handle=EXCLUDED.handle, thumbnail_url=EXCLUDED.thumbnail_url,
         url=EXCLUDED.url, subscriber_count=EXCLUDED.subscriber_count, view_count=EXCLUDED.view_count,
         shorts_count=EXCLUDED.shorts_count, total_videos=EXCLUDED.total_videos,
         avg_shorts_views=EXCLUDED.avg_shorts_views, views_48h=EXCLUDED.views_48h,
         views_7d=EXCLUDED.views_7d, country=EXCLUDED.country, ai_niche=EXCLUDED.ai_niche,
         niche_label=EXCLUDED.niche_label, format=EXCLUDED.format, faceless=EXCLUDED.faceless,
         primary_language=EXCLUDED.primary_language, description=EXCLUDED.description,
         ai_topics=EXCLUDED.ai_topics, recent_videos=EXCLUDED.recent_videos,
         source_keyword=EXCLUDED.source_keyword, updated_at=EXCLUDED.updated_at`,
      [
        c.channelId ?? doc.id, c.title ?? "", c.handle ?? null, c.thumbnailUrl ?? null,
        c.url ?? null, num(c.subscriberCount), num(c.viewCount), num(c.shortsCount),
        num(c.totalVideos), num(c.avgShortsViews), num(c.views48h), num(c.views7d),
        c.country ?? null, c.aiNiche ?? null, c.nicheLabel ?? null, c.format ?? null,
        c.faceless === true, c.primaryLanguage ?? null, c.description ?? null,
        JSON.stringify(c.aiTopics ?? []), JSON.stringify(c.recentVideos ?? []),
        c.sourceKeyword ?? null, num(c.updatedAt) || Date.now(), num(c.createdAt) || Date.now(),
      ]
    );
    if (++done % 100 === 0) console.log(`  …${done}/${snap.size}`);
  }
  console.log(`✓ Channels backfilled: ${done}`);
}

async function backfillBlocked() {
  const snap = await fs.collection("discovery_blocked").get();
  for (const doc of snap.docs) {
    await pool.query(
      `INSERT INTO discovery_blocked (channel_id, at) VALUES ($1, $2)
       ON CONFLICT (channel_id) DO UPDATE SET at = EXCLUDED.at`,
      [doc.id, num(doc.data().at) || Date.now()]
    );
  }
  console.log(`✓ Blocklist backfilled: ${snap.size}`);
}

try {
  await backfillChannels();
  await backfillBlocked();
  console.log("Done. Discover now reads from Postgres.");
} catch (e) {
  console.error("Backfill failed:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
process.exit(0);
