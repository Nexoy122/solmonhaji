import "server-only";
import { randomBytes, createHash } from "crypto";
import { query, dbConfigured } from "@/lib/db";

// ── Team roles + email invites ───────────────────────────────────────────────
// Roles can now be granted by inviting an email address, instead of editing
// .env and restarting. Env vars remain the ROOT of trust:
//
//   env  -> unfalsifiable, survives a database compromise, seeds the first
//           super_admin (no chicken-and-egg)
//   db   -> everything granted by invite, revocable from the UI
//
// resolveRole() takes the HIGHER of the two, so a DB row can never demote an
// env admin, and losing the DB can never lock the owner out.

export type PlatformRole = "user" | "tester" | "staff" | "admin" | "super_admin";

export const ROLE_RANK: Record<PlatformRole, number> = {
  user: 0,
  tester: 1,      // beta testers: full product access to hunt bugs, no admin
  staff: 2,       // view users/billing, approve/reject waitlist
  admin: 3,       // + ban, manual activate
  super_admin: 4, // + grant/revoke team roles
};

// What each role is for, shown in the admin UI and the invite email.
export const ROLE_INFO: Record<Exclude<PlatformRole, "user">, { label: string; blurb: string }> = {
  tester: { label: "Beta Tester", blurb: "Full access to every tool to test and report bugs. No admin panel." },
  staff: { label: "Staff", blurb: "Can view users and billing, and approve or reject waitlist requests." },
  admin: { label: "Admin", blurb: "Everything Staff can do, plus banning users and manual activation." },
  super_admin: { label: "Super Admin", blurb: "Full control, including inviting and removing team members." },
};

export const ASSIGNABLE_ROLES: PlatformRole[] = ["tester", "staff", "admin", "super_admin"];

const INVITE_TTL_DAYS = 14;

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  // Granted roles, keyed by uid once accepted.
  await query(`
    CREATE TABLE IF NOT EXISTS team_roles (
      uid TEXT PRIMARY KEY,
      email TEXT,
      role TEXT NOT NULL,
      granted_by TEXT,
      granted_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Pending invites, keyed by email until accepted.
  await query(`
    CREATE TABLE IF NOT EXISTS team_invites (
      id BIGSERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'team',   -- 'team' | 'early_access'
      token_hash TEXT NOT NULL,
      invited_by TEXT,
      note TEXT,
      expires_at TIMESTAMPTZ NOT NULL,
      accepted_at TIMESTAMPTZ,
      accepted_uid TEXT,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_invite_token ON team_invites (token_hash);`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_open
               ON team_invites (lower(email), kind)
               WHERE accepted_at IS NULL AND revoked_at IS NULL;`);
  schemaReady = true;
}

function envUids(name: string): string[] {
  return (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

// Role from env only. Empty env grants nobody (fails closed).
export function envRole(uid: string): PlatformRole {
  if (envUids("SUPER_ADMIN_UIDS").includes(uid)) return "super_admin";
  if (envUids("ADMIN_UIDS").includes(uid)) return "admin";
  if (envUids("STAFF_UIDS").includes(uid)) return "staff";
  return "user";
}

// Role from the database (invite-granted).
export async function dbRole(uid: string): Promise<PlatformRole> {
  if (!dbConfigured()) return "user";
  try {
    await ensureSchema();
    const rows = await query<{ role: string }>(`SELECT role FROM team_roles WHERE uid = $1`, [uid]);
    const r = rows[0]?.role as PlatformRole | undefined;
    return r && r in ROLE_RANK ? r : "user";
  } catch {
    return "user";
  }
}

// The effective role: whichever source grants more. Env can't be overridden by
// the DB, and a DB outage can't strip the owner's access.
export async function resolveRole(uid: string): Promise<PlatformRole> {
  const fromEnv = envRole(uid);
  const fromDb = await dbRole(uid);
  return ROLE_RANK[fromDb] > ROLE_RANK[fromEnv] ? fromDb : fromEnv;
}

export async function hasRoleAsync(uid: string, min: PlatformRole): Promise<boolean> {
  return ROLE_RANK[await resolveRole(uid)] >= ROLE_RANK[min];
}

export interface InviteRow {
  id: string;
  email: string;
  role: string;
  kind: string;
  note: string | null;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// Create an invite. Returns the RAW token, which is emailed once and never
// stored in the clear (only its sha256 is kept).
export async function createInvite(opts: {
  email: string;
  role: PlatformRole;
  kind?: "team" | "early_access";
  invitedBy: string;
  note?: string | null;
}): Promise<{ token: string } | { error: string }> {
  if (!dbConfigured()) return { error: "Database isn't configured." };
  await ensureSchema();

  const email = opts.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That doesn't look like a valid email." };

  const kind = opts.kind ?? "team";
  const raw = randomBytes(24).toString("base64url");
  const hash = createHash("sha256").update(raw).digest("hex");

  try {
    // Supersede any open invite for this email+kind so re-inviting just works.
    await query(
      `UPDATE team_invites SET revoked_at = now()
       WHERE lower(email) = $1 AND kind = $2 AND accepted_at IS NULL AND revoked_at IS NULL`,
      [email, kind]
    );
    await query(
      `INSERT INTO team_invites (email, role, kind, token_hash, invited_by, note, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, now() + ($7 || ' days')::interval)`,
      [email, opts.role, kind, hash, opts.invitedBy, opts.note ?? null, String(INVITE_TTL_DAYS)]
    );
    return { token: raw };
  } catch (err) {
    console.error("[roles] createInvite failed:", err);
    return { error: "Couldn't create the invite." };
  }
}

// Look at an invite without consuming it (for the accept page preview).
export async function peekInvite(token: string): Promise<{ email: string; role: string; kind: string } | null> {
  if (!dbConfigured()) return null;
  await ensureSchema();
  const hash = createHash("sha256").update(token).digest("hex");
  const rows = await query<{ email: string; role: string; kind: string }>(
    `SELECT email, role, kind FROM team_invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
    [hash]
  );
  return rows[0] ?? null;
}

// Redeem an invite for a signed-in user. Single-use.
//
// The invite is bound to the email it was sent to: accepting with a different
// account is refused, so a forwarded link can't hand someone else admin.
export async function acceptInvite(
  token: string,
  uid: string,
  userEmail: string | null
): Promise<{ ok: true; role: PlatformRole; kind: string } | { ok: false; error: string }> {
  if (!dbConfigured()) return { ok: false, error: "Database isn't configured." };
  await ensureSchema();
  const hash = createHash("sha256").update(token).digest("hex");

  const rows = await query<{ id: string; email: string; role: string; kind: string }>(
    `SELECT id::text, email, role, kind FROM team_invites
     WHERE token_hash = $1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
    [hash]
  );
  const inv = rows[0];
  if (!inv) return { ok: false, error: "This invite is invalid, already used, or expired." };

  if (!userEmail || userEmail.toLowerCase() !== inv.email.toLowerCase()) {
    return { ok: false, error: `This invite was sent to ${inv.email}. Sign in with that account to accept it.` };
  }

  try {
    await query(
      `UPDATE team_invites SET accepted_at = now(), accepted_uid = $2 WHERE id = $1::bigint`,
      [inv.id, uid]
    );
    // early_access invites don't grant a team role, they just let the user in.
    if (inv.kind === "team") {
      await query(
        `INSERT INTO team_roles (uid, email, role, granted_by)
         VALUES ($1, $2, $3, 'invite')
         ON CONFLICT (uid) DO UPDATE SET role = EXCLUDED.role, email = EXCLUDED.email, granted_at = now()`,
        [uid, inv.email, inv.role]
      );
    }
    return { ok: true, role: inv.role as PlatformRole, kind: inv.kind };
  } catch (err) {
    console.error("[roles] acceptInvite failed:", err);
    return { ok: false, error: "Couldn't accept the invite." };
  }
}

export async function listInvites(kind?: string): Promise<InviteRow[]> {
  if (!dbConfigured()) return [];
  await ensureSchema();
  if (kind) {
    return query<InviteRow>(
      `SELECT id::text, email, role, kind, note, invited_by, expires_at, accepted_at, revoked_at, created_at
       FROM team_invites WHERE kind = $1 ORDER BY created_at DESC LIMIT 200`,
      [kind]
    );
  }
  return query<InviteRow>(
    `SELECT id::text, email, role, kind, note, invited_by, expires_at, accepted_at, revoked_at, created_at
     FROM team_invites ORDER BY created_at DESC LIMIT 200`
  );
}

export async function listTeam(): Promise<{ uid: string; email: string | null; role: string; granted_at: string }[]> {
  if (!dbConfigured()) return [];
  await ensureSchema();
  return query(`SELECT uid, email, role, granted_at FROM team_roles ORDER BY granted_at DESC`);
}

export async function revokeInvite(id: string): Promise<boolean> {
  if (!dbConfigured()) return false;
  await ensureSchema();
  const rows = await query<{ id: string }>(
    `UPDATE team_invites SET revoked_at = now()
     WHERE id = $1::bigint AND accepted_at IS NULL RETURNING id::text`,
    [id]
  );
  return rows.length > 0;
}

// Remove a granted role. Env-granted roles are unaffected by design: the owner
// can't be locked out of their own product by a database write.
export async function removeTeamMember(uid: string): Promise<boolean> {
  if (!dbConfigured()) return false;
  await ensureSchema();
  const rows = await query<{ uid: string }>(`DELETE FROM team_roles WHERE uid = $1 RETURNING uid`, [uid]);
  return rows.length > 0;
}
