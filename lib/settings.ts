import "server-only";
import { query, dbConfigured } from "@/lib/db";

// ── User settings (Postgres) ─────────────────────────────────────────────────
// Notification preferences and soft-delete state. Auth-owned data (email,
// password, providers) lives in Firebase and is never duplicated here.
//
// Keyed by Firebase UID, matching lib/credits.ts and lib/onboarding.ts.

// Allowlist. Client-supplied keys are filtered against this, so arbitrary JSON
// can never be written (spec section 6).
export const NOTIFICATION_KEYS = [
  "email_product_updates",
  "email_marketing",
  "email_weekly_digest",
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];
export type NotificationPrefs = Record<NotificationKey, boolean>;

// Billing and security alerts are deliberately NOT toggleable: a user must
// always be told when their card fails or their password changes.
export const DEFAULT_PREFS: NotificationPrefs = {
  email_product_updates: true,
  email_marketing: true,
  email_weekly_digest: true,
};

export interface UserSettings {
  prefs: NotificationPrefs;
  deletedAt: string | null;
}

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      uid TEXT PRIMARY KEY,
      notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb,
      deleted_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  schemaReady = true;
}

interface Row {
  notification_prefs: Partial<Record<string, boolean>> | null;
  deleted_at: Date | null;
}

function toSettings(r: Row): UserSettings {
  const stored = r.notification_prefs ?? {};
  const prefs = { ...DEFAULT_PREFS };
  for (const k of NOTIFICATION_KEYS) {
    if (typeof stored[k] === "boolean") prefs[k] = stored[k] as boolean;
  }
  return { prefs, deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null };
}

export async function getSettings(uid: string): Promise<UserSettings> {
  if (!dbConfigured()) return { prefs: { ...DEFAULT_PREFS }, deletedAt: null };
  await ensureSchema();
  const rows = await query<Row>(
    `INSERT INTO user_settings (uid) VALUES ($1)
     ON CONFLICT (uid) DO UPDATE SET uid = EXCLUDED.uid
     RETURNING notification_prefs, deleted_at`,
    [uid]
  );
  return rows[0] ? toSettings(rows[0]) : { prefs: { ...DEFAULT_PREFS }, deletedAt: null };
}

// Save notification prefs. Unknown keys are dropped, never persisted.
export async function saveNotificationPrefs(
  uid: string,
  input: Record<string, unknown>
): Promise<UserSettings> {
  if (!dbConfigured()) return { prefs: { ...DEFAULT_PREFS }, deletedAt: null };
  await ensureSchema();

  // Also ensures the row exists so the UPDATE below matches.
  const current = await getSettings(uid);
  const clean: Record<string, boolean> = { ...current.prefs };
  for (const k of NOTIFICATION_KEYS) {
    if (typeof input[k] === "boolean") clean[k] = input[k] as boolean;
  }

  const rows = await query<Row>(
    `UPDATE user_settings
     SET notification_prefs = $2::jsonb, updated_at = now()
     WHERE uid = $1
     RETURNING notification_prefs, deleted_at`,
    [uid, JSON.stringify(clean)]
  );
  return rows[0] ? toSettings(rows[0]) : { prefs: clean as NotificationPrefs, deletedAt: null };
}

// Soft-delete: marks the account for deletion with a grace period. The Firebase
// user is disabled separately so they can't sign back in.
export async function markAccountDeleted(uid: string): Promise<void> {
  if (!dbConfigured()) return;
  await ensureSchema();
  await getSettings(uid);
  await query(
    `UPDATE user_settings SET deleted_at = COALESCE(deleted_at, now()), updated_at = now() WHERE uid = $1`,
    [uid]
  );
}
