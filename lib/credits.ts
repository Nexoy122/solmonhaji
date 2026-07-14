import "server-only";
import { db, query, dbConfigured } from "@/lib/db";

// ── Credits & ledger (Postgres) ──────────────────────────────────────────────
// Source of truth for a user's credit balance. Every change is recorded in a
// ledger row; balance changes are race-safe (row locks). Credits are only ever
// GRANTED by the webhook (purchases/renewals) or the weekly free refresh, and
// only ever SPENT server-side via spendCredits(). The frontend never mutates
// balances — it only reads them.
//
// Keyed by Firebase UID (the app's user id), so no separate users table needed.

export type LedgerType = "signup" | "weekly_free" | "purchase" | "subscription_renewal" | "usage" | "refund" | "bonus";

const FREE_WEEKLY_CREDITS = 100;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let schemaReady = false;

// Create the tables once (idempotent). Called lazily before any credit op.
async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_credits (
      uid TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0,
      plan TEXT NOT NULL DEFAULT 'free',
      last_free_refresh TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id BIGSERIAL PRIMARY KEY,
      uid TEXT NOT NULL,
      amount INTEGER NOT NULL,          -- positive = credited, negative = spent
      type TEXT NOT NULL,
      reference_id TEXT,
      balance_after INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_credit_tx_uid ON credit_transactions (uid, created_at DESC);`);
  await query(`
    CREATE TABLE IF NOT EXISTS processed_webhook_events (
      event_id TEXT PRIMARY KEY,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  schemaReady = true;
}

export function creditsConfigured(): boolean {
  return dbConfigured();
}

interface CreditRow { balance: number; plan: string; last_free_refresh: string | null }

// Ensure a user row exists; grant the one-time signup credits the first time.
async function ensureUser(uid: string): Promise<void> {
  await ensureSchema();
  const rows = await query<CreditRow>(`SELECT balance FROM user_credits WHERE uid = $1`, [uid]);
  if (rows.length === 0) {
    // New user → create with the free weekly allotment as the starting balance.
    const client = await db().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO user_credits (uid, balance, plan, last_free_refresh)
         VALUES ($1, $2, 'free', now()) ON CONFLICT (uid) DO NOTHING`,
        [uid, FREE_WEEKLY_CREDITS]
      );
      await client.query(
        `INSERT INTO credit_transactions (uid, amount, type, balance_after)
         VALUES ($1, $2, 'signup', $2)`,
        [uid, FREE_WEEKLY_CREDITS]
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}

// Weekly free refresh: FREE plan users get topped up to FREE_WEEKLY_CREDITS once
// per 7 days (only if their balance is below that — never reduce a paid balance).
async function maybeWeeklyRefresh(uid: string): Promise<void> {
  const rows = await query<CreditRow>(
    `SELECT balance, plan, last_free_refresh FROM user_credits WHERE uid = $1`,
    [uid]
  );
  const row = rows[0];
  if (!row || row.plan !== "free") return;
  const last = row.last_free_refresh ? new Date(row.last_free_refresh).getTime() : 0;
  if (Date.now() - last < WEEK_MS) return;

  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<CreditRow>(
      `SELECT balance, plan, last_free_refresh FROM user_credits WHERE uid = $1 FOR UPDATE`,
      [uid]
    );
    const r = locked.rows[0];
    if (r && r.plan === "free") {
      const lastMs = r.last_free_refresh ? new Date(r.last_free_refresh).getTime() : 0;
      if (Date.now() - lastMs >= WEEK_MS && r.balance < FREE_WEEKLY_CREDITS) {
        const topUp = FREE_WEEKLY_CREDITS - r.balance;
        await client.query(
          `UPDATE user_credits SET balance = $2, last_free_refresh = now(), updated_at = now() WHERE uid = $1`,
          [uid, FREE_WEEKLY_CREDITS]
        );
        await client.query(
          `INSERT INTO credit_transactions (uid, amount, type, balance_after) VALUES ($1, $2, 'weekly_free', $3)`,
          [uid, topUp, FREE_WEEKLY_CREDITS]
        );
      } else if (Date.now() - lastMs >= WEEK_MS) {
        // due for refresh but already at/above the cap → just stamp the date
        await client.query(`UPDATE user_credits SET last_free_refresh = now() WHERE uid = $1`, [uid]);
      }
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export interface Balance { balance: number; plan: string }

// Read the current balance (ensures the user exists + applies weekly refresh).
export async function getBalance(uid: string): Promise<Balance> {
  await ensureUser(uid);
  await maybeWeeklyRefresh(uid);
  const rows = await query<CreditRow>(`SELECT balance, plan FROM user_credits WHERE uid = $1`, [uid]);
  const r = rows[0];
  return { balance: r?.balance ?? 0, plan: r?.plan ?? "free" };
}

// Grant credits (purchases/renewals/bonus). Idempotent per reference_id when
// provided (skip if a tx with the same reference already exists).
export async function grantCredits(
  uid: string,
  amount: number,
  type: LedgerType,
  referenceId?: string
): Promise<void> {
  if (amount <= 0) return;
  await ensureUser(uid);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    if (referenceId) {
      const dup = await client.query(
        `SELECT 1 FROM credit_transactions WHERE reference_id = $1 AND type = $2 LIMIT 1`,
        [referenceId, type]
      );
      if (dup.rowCount) { await client.query("ROLLBACK"); return; }
    }
    const upd = await client.query<{ balance: number }>(
      `UPDATE user_credits SET balance = balance + $2, updated_at = now() WHERE uid = $1 RETURNING balance`,
      [uid, amount]
    );
    const balanceAfter = upd.rows[0]?.balance ?? amount;
    await client.query(
      `INSERT INTO credit_transactions (uid, amount, type, reference_id, balance_after) VALUES ($1, $2, $3, $4, $5)`,
      [uid, amount, type, referenceId ?? null, balanceAfter]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Set the plan + reset the monthly allotment (called by the webhook on
// subscription active/renewal). Sets balance to the plan's credits (fresh each
// cycle) and records the grant. plan="free" just switches the plan.
export async function setPlanAndCredits(uid: string, plan: string, monthlyCredits: number, referenceId?: string): Promise<void> {
  await ensureUser(uid);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    if (referenceId) {
      const dup = await client.query(
        `SELECT 1 FROM credit_transactions WHERE reference_id = $1 AND type = 'subscription_renewal' LIMIT 1`,
        [referenceId]
      );
      if (dup.rowCount) { await client.query("ROLLBACK"); return; }
    }
    if (plan === "free") {
      await client.query(`UPDATE user_credits SET plan = 'free', updated_at = now() WHERE uid = $1`, [uid]);
    } else {
      await client.query(
        `UPDATE user_credits SET plan = $2, balance = $3, updated_at = now() WHERE uid = $1`,
        [uid, plan, monthlyCredits]
      );
      await client.query(
        `INSERT INTO credit_transactions (uid, amount, type, reference_id, balance_after) VALUES ($1, $2, 'subscription_renewal', $3, $2)`,
        [uid, monthlyCredits, referenceId ?? null]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Idempotency guard for webhook deliveries. Returns true if this event was
// already processed (caller should skip).
export async function webhookAlreadyProcessed(eventId: string): Promise<boolean> {
  await ensureSchema();
  const rows = await query(`SELECT 1 FROM processed_webhook_events WHERE event_id = $1`, [eventId]);
  return rows.length > 0;
}
export async function markWebhookProcessed(eventId: string): Promise<void> {
  await ensureSchema();
  await query(`INSERT INTO processed_webhook_events (event_id) VALUES ($1) ON CONFLICT DO NOTHING`, [eventId]);
}

export class InsufficientCreditsError extends Error {
  constructor(public needed: number, public have: number) {
    super(`Insufficient credits: need ${needed}, have ${have}`);
    this.name = "InsufficientCreditsError";
  }
}

// Spend credits — RACE-SAFE. Locks the user's row, checks the balance, and
// deducts atomically so two concurrent requests can't push the balance negative.
// Throws InsufficientCreditsError if the user can't afford it. Returns the new
// balance. Call this SERVER-SIDE right before running a paid action.
export async function spendCredits(uid: string, amount: number, referenceId: string): Promise<number> {
  if (amount <= 0) { const b = await getBalance(uid); return b.balance; }
  await ensureUser(uid);
  await maybeWeeklyRefresh(uid);
  const client = await db().connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query<{ balance: number }>(
      `SELECT balance FROM user_credits WHERE uid = $1 FOR UPDATE`,
      [uid]
    );
    const have = locked.rows[0]?.balance ?? 0;
    if (have < amount) {
      await client.query("ROLLBACK");
      throw new InsufficientCreditsError(amount, have);
    }
    const upd = await client.query<{ balance: number }>(
      `UPDATE user_credits SET balance = balance - $2, updated_at = now() WHERE uid = $1 RETURNING balance`,
      [uid, amount]
    );
    const balanceAfter = upd.rows[0].balance;
    await client.query(
      `INSERT INTO credit_transactions (uid, amount, type, reference_id, balance_after) VALUES ($1, $2, 'usage', $3, $4)`,
      [uid, -amount, referenceId, balanceAfter]
    );
    await client.query("COMMIT");
    return balanceAfter;
  } catch (e) {
    if (!(e instanceof InsufficientCreditsError)) await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// Recent ledger entries for the account/billing UI.
export async function recentTransactions(uid: string, limit = 20) {
  await ensureSchema();
  return query<{ amount: number; type: string; reference_id: string | null; balance_after: number; created_at: string }>(
    `SELECT amount, type, reference_id, balance_after, created_at FROM credit_transactions WHERE uid = $1 ORDER BY created_at DESC LIMIT $2`,
    [uid, limit]
  );
}
