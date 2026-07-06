// One-time Postgres setup: creates the Explore tables from lib/schema.sql.
// Run on the server (where DATABASE_URL points at your Postgres):
//   node scripts/setup-postgres.mjs
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

// Load DATABASE_URL from .env if not already in the environment.
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!process.env.DATABASE_URL) {
  try {
    const env = readFileSync(join(root, ".env"), "utf8");
    const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
    if (m) process.env.DATABASE_URL = m[1];
  } catch { /* ignore */ }
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env).");
  process.exit(1);
}

const schema = readFileSync(join(root, "lib", "schema.sql"), "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query(schema);
  console.log("✓ Explore tables created (explore_channels, explore_videos, explore_meta).");
} catch (e) {
  console.error("Schema setup failed:", e.message);
  process.exit(1);
} finally {
  await pool.end();
}
process.exit(0);
