import "server-only";
import { NextResponse } from "next/server";
import { query, dbConfigured } from "@/lib/db";

// ── Admin roles + audit log ──────────────────────────────────────────────────
// Role source of truth is the ADMIN_UIDS / SUPER_ADMIN_UIDS env vars, so a
// compromised database row can never grant admin access, and so the very first
// admin exists without a chicken-and-egg problem.
//
// SECURITY: every admin route must call requireAdmin() server-side. Hiding a nav
// link is not access control (admin-panel spec, section 3).

// Roles now live in lib/roles.ts (env is the root of trust, the DB adds
// invite-granted roles on top). Re-exported here so existing imports keep working.
export { ROLE_RANK, envRole, resolveRole, type PlatformRole } from "@/lib/roles";
import { ROLE_RANK, envRole, resolveRole, type PlatformRole } from "@/lib/roles";

// Synchronous, env-only check. Use this where a DB round-trip isn't wanted
// (e.g. cheap guards on non-admin routes). It cannot see invited roles.
export function hasRole(uid: string, min: PlatformRole): boolean {
  return ROLE_RANK[envRole(uid)] >= ROLE_RANK[min];
}

// Guard for admin API routes. Returns the caller's effective role, or a 403.
// Async because invited roles are stored in the database.
export async function requireAdmin(
  uid: string | null,
  min: PlatformRole = "staff"
): Promise<{ ok: true; role: PlatformRole } | { ok: false; response: NextResponse }> {
  if (!uid) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = await resolveRole(uid);
  if (ROLE_RANK[role] < ROLE_RANK[min]) {
    // Deliberately identical to a missing route: don't confirm /admin exists.
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, role };
}

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id BIGSERIAL PRIMARY KEY,
      admin_uid TEXT NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log (created_at DESC);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_log (admin_uid, created_at DESC);`);
  schemaReady = true;
}

// Append-only. There is intentionally no update or delete helper: the audit log
// protects users AND staff, so nobody gets to rewrite it (spec section 9).
export async function logAdminAction(
  adminUid: string,
  action: string,
  targetType: string | null,
  targetId: string | null,
  details: Record<string, unknown> = {},
  ip: string | null = null
): Promise<void> {
  if (!dbConfigured()) return;
  try {
    await ensureSchema();
    await query(
      `INSERT INTO admin_audit_log (admin_uid, action, target_type, target_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [adminUid, action, targetType, targetId, JSON.stringify(details), ip]
    );
  } catch (err) {
    // Never let an audit failure swallow the action itself, but make it loud.
    console.error("[admin] AUDIT LOG FAILED:", action, err);
  }
}

export interface AuditRow {
  id: string;
  admin_uid: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export async function recentAuditLog(limit = 100): Promise<AuditRow[]> {
  if (!dbConfigured()) return [];
  await ensureSchema();
  return query<AuditRow>(
    `SELECT id::text, admin_uid, action, target_type, target_id, details, created_at
     FROM admin_audit_log ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
}

// Client IP, honouring the proxy header the VPS's nginx sets.
export function clientIp(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip");
}
