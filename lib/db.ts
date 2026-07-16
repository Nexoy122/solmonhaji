import "server-only";
import { Pool } from "pg";

// ── Postgres connection pool ──────────────────────────────────────────────────
// The Explore video index lives in Postgres (on the same server as the app) so
// it can hold unlimited videos with no read caps, unlike Firestore's free tier.
// Set DATABASE_URL in .env, e.g.:
//   DATABASE_URL="postgres://nichespy_user:PASSWORD@localhost:5432/nichespy"
//
// Auth + other low-traffic data stay on Firebase; only the heavy video/channel
// index moved here.

let pool: Pool | null = null;

export function db(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env (postgres://user:pass@localhost:5432/nichespy).");
  }
  pool = new Pool({
    connectionString,
    max: 10,                       // pool size
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Local socket needs no SSL; a remote managed DB usually does. Toggle via env.
    ssl: process.env.DATABASE_SSL === "1" ? { rejectUnauthorized: false } : undefined,
  });
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  return pool;
}

// True when a Postgres connection string is configured (routes can 503 cleanly).
export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

// Small typed query helper.
export async function query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]> {
  const res = await db().query(text, params);
  return res.rows as T[];
}
