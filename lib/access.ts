import "server-only";
import { randomBytes, createHash } from "crypto";
import { query, dbConfigured } from "@/lib/db";

// ── Early access / waitlist ──────────────────────────────────────────────────
// New signups land in `pending` and wait for an admin to approve them. Approval
// issues a signed, expiring invite token which activates the account.
//
// Keyed by Firebase UID, like the other tables.

export type AccessStatus = "pending" | "invited" | "active" | "rejected" | "banned";

export const WAITLIST_ENABLED = (process.env.WAITLIST_ENABLED ?? "true").toLowerCase() !== "false";

const INVITE_TTL_HOURS = 72;

export interface AccessRow {
  uid: string;
  email: string | null;
  name: string | null;
  status: AccessStatus;
  position: number | null;
  signup_source: string | null;
  referred_by: string | null;
  notes: string | null;
  created_at: string;
  invited_at: string | null;
  activated_at: string | null;
}

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_access (
      uid TEXT PRIMARY KEY,
      email TEXT,
      name TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      seq BIGSERIAL,                       -- signup order, drives waitlist position
      signup_source TEXT DEFAULT 'organic',
      referred_by TEXT,
      notes TEXT,
      invite_token_hash TEXT,              -- sha256 of the token; raw is emailed only
      invite_expires_at TIMESTAMPTZ,
      reviewed_by TEXT,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      invited_at TIMESTAMPTZ,
      activated_at TIMESTAMPTZ
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_access_status ON user_access (status, seq);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_access_token ON user_access (invite_token_hash);`);
  schemaReady = true;
}

// Read a user's access row, creating it on first sight.
// `existingUser` = true when this uid predates the waitlist (has credits already),
// in which case they're activated rather than queued.
export async function getAccess(
  uid: string,
  meta: { email?: string | null; name?: string | null } = {}
): Promise<AccessRow & { grandfathered?: boolean; created?: boolean }> {
  if (!dbConfigured()) {
    return {
      uid, email: meta.email ?? null, name: meta.name ?? null, status: "active",
      position: null, signup_source: null, referred_by: null, notes: null,
      created_at: new Date().toISOString(), invited_at: null, activated_at: null,
    };
  }
  await ensureSchema();

  const existing = await query<AccessRow & { seq: number }>(
    `SELECT uid, email, name, status, seq, signup_source, referred_by, notes,
            created_at, invited_at, activated_at
     FROM user_access WHERE uid = $1`,
    [uid]
  );

  if (existing[0]) {
    const row = existing[0];
    return { ...row, position: await positionFor(row.status, row.seq) };
  }

  // First time we've seen this uid. If they already have credits, they signed up
  // before the gate existed: grandfather them straight to active.
  const prior = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM user_credits WHERE uid = $1`,
    [uid]
  ).catch(() => [{ n: "0" }]);
  const isExistingUser = Number(prior[0]?.n ?? 0) > 0;

  const status: AccessStatus = !WAITLIST_ENABLED || isExistingUser ? "active" : "pending";

  const inserted = await query<AccessRow & { seq: number }>(
    `INSERT INTO user_access (uid, email, name, status, activated_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $4 = 'active' THEN now() ELSE NULL END)
     ON CONFLICT (uid) DO UPDATE SET email = COALESCE(EXCLUDED.email, user_access.email)
     RETURNING uid, email, name, status, seq, signup_source, referred_by, notes,
               created_at, invited_at, activated_at`,
    [uid, meta.email ?? null, meta.name ?? null, status]
  );
  const row = inserted[0];
  return {
    ...row,
    position: await positionFor(row.status, row.seq),
    grandfathered: isExistingUser,
    created: true,
  };
}

// How many pending users are ahead of this one.
async function positionFor(status: string, seq: number): Promise<number | null> {
  if (status !== "pending") return null;
  const rows = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM user_access WHERE status = 'pending' AND seq <= $1`,
    [seq]
  );
  return Number(rows[0]?.n ?? 1);
}

// Approve a pending user: mint an invite token and mark them invited.
// Returns the RAW token (emailed once, never stored in the clear).
export async function approveUser(uid: string, adminUid: string): Promise<string | null> {
  if (!dbConfigured()) return null;
  await ensureSchema();
  const raw = `${randomBytes(24).toString("base64url")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const rows = await query<{ uid: string }>(
    `UPDATE user_access
     SET status = 'invited', invite_token_hash = $2,
         invite_expires_at = now() + ($3 || ' hours')::interval,
         invited_at = now(), reviewed_by = $4, reviewed_at = now()
     WHERE uid = $1 AND status IN ('pending', 'invited')
     RETURNING uid`,
    [uid, hash, String(INVITE_TTL_HOURS), adminUid]
  );
  return rows[0] ? raw : null;
}

export async function rejectUser(uid: string, adminUid: string, notes?: string): Promise<boolean> {
  if (!dbConfigured()) return false;
  await ensureSchema();
  const rows = await query<{ uid: string }>(
    `UPDATE user_access
     SET status = 'rejected', notes = COALESCE($3, notes), reviewed_by = $2, reviewed_at = now()
     WHERE uid = $1 RETURNING uid`,
    [uid, adminUid, notes ?? null]
  );
  return rows.length > 0;
}

// Redeem an invite token: flips the account to active. Single-use and expiring.
export async function activateWithToken(token: string): Promise<{ ok: boolean; uid?: string; reason?: string }> {
  if (!dbConfigured()) return { ok: false, reason: "unavailable" };
  await ensureSchema();
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await query<{ uid: string }>(
    `UPDATE user_access
     SET status = 'active', activated_at = now(), invite_token_hash = NULL, invite_expires_at = NULL
     WHERE invite_token_hash = $1
       AND invite_expires_at > now()
       AND status IN ('invited', 'pending')
     RETURNING uid`,
    [hash]
  );
  if (rows[0]) return { ok: true, uid: rows[0].uid };

  // Distinguish "already used" from "expired/bogus" for a useful error page.
  const spent = await query<{ status: string }>(
    `SELECT status FROM user_access WHERE invite_token_hash = $1`,
    [hash]
  );
  if (spent[0]) return { ok: false, reason: "expired" };
  return { ok: false, reason: "invalid" };
}

// Admin: set status directly (ban/unban/manual activate).
export async function setStatus(uid: string, status: AccessStatus, adminUid: string): Promise<boolean> {
  if (!dbConfigured()) return false;
  await ensureSchema();
  const rows = await query<{ uid: string }>(
    `UPDATE user_access
     SET status = $2, reviewed_by = $3, reviewed_at = now(),
         activated_at = CASE WHEN $2 = 'active' THEN COALESCE(activated_at, now()) ELSE activated_at END
     WHERE uid = $1 RETURNING uid`,
    [uid, status, adminUid]
  );
  return rows.length > 0;
}

export async function listAccess(status: string | null, limit = 100): Promise<(AccessRow & { seq: number })[]> {
  if (!dbConfigured()) return [];
  await ensureSchema();
  if (status && status !== "all") {
    return query<AccessRow & { seq: number }>(
      `SELECT uid, email, name, status, seq, signup_source, referred_by, notes,
              created_at, invited_at, activated_at
       FROM user_access WHERE status = $1 ORDER BY seq ASC LIMIT $2`,
      [status, limit]
    );
  }
  return query<AccessRow & { seq: number }>(
    `SELECT uid, email, name, status, seq, signup_source, referred_by, notes,
            created_at, invited_at, activated_at
     FROM user_access ORDER BY seq DESC LIMIT $1`,
    [limit]
  );
}

export async function accessStats(): Promise<Record<string, number>> {
  if (!dbConfigured()) return {};
  await ensureSchema();
  const rows = await query<{ status: string; n: string }>(
    `SELECT status, count(*)::text AS n FROM user_access GROUP BY status`
  );
  const out: Record<string, number> = { pending: 0, invited: 0, active: 0, rejected: 0, banned: 0 };
  for (const r of rows) out[r.status] = Number(r.n);
  const today = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM user_access WHERE created_at >= date_trunc('day', now())`
  );
  out.today = Number(today[0]?.n ?? 0);
  return out;
}
