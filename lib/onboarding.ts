import "server-only";
import { query, dbConfigured } from "@/lib/db";
import { NICHES, type NicheId } from "@/lib/nicheResearch";

// ── Onboarding state (Postgres) ──────────────────────────────────────────────
// Tracks where a user is in the welcome flow and what they told us, so they can
// leave mid-flow and resume exactly where they left off. Keyed by Firebase UID,
// matching lib/credits.ts (no separate users table).
//
// Everything here is server-authoritative: the client can only submit ANSWERS,
// never mark itself complete for a step it didn't do.

export type OnboardingStep = "welcome" | "source" | "niches" | "discord" | "plans" | "done";

// The order the flow walks. `done` is terminal.
export const STEP_ORDER: OnboardingStep[] = ["welcome", "source", "niches", "discord", "plans", "done"];

// Where users heard about us. Kept as a fixed set so the data stays analysable;
// "other" carries a free-text note.
export const SOURCES = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "discord", label: "Discord" },
  { id: "friend", label: "Friend or colleague" },
  { id: "google", label: "Google search" },
  { id: "twitter", label: "X / Twitter" },
  { id: "reddit", label: "Reddit" },
  { id: "other", label: "Somewhere else" },
] as const;
export type SourceId = (typeof SOURCES)[number]["id"];

export interface OnboardingState {
  step: OnboardingStep;
  niches: NicheId[];
  source: string | null;
  sourceNote: string | null;
  joinedDiscord: boolean;
  completedAt: string | null;
}

const EMPTY: OnboardingState = {
  step: "welcome",
  niches: [],
  source: null,
  sourceNote: null,
  joinedDiscord: false,
  completedAt: null,
};

let schemaReady = false;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS user_onboarding (
      uid TEXT PRIMARY KEY,
      step TEXT NOT NULL DEFAULT 'welcome',
      niches TEXT[] NOT NULL DEFAULT '{}',
      source TEXT,
      source_note TEXT,
      joined_discord BOOLEAN NOT NULL DEFAULT false,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  schemaReady = true;
}

interface Row {
  step: string;
  niches: string[] | null;
  source: string | null;
  source_note: string | null;
  joined_discord: boolean;
  completed_at: Date | null;
}

function toState(r: Row): OnboardingState {
  return {
    step: (STEP_ORDER as string[]).includes(r.step) ? (r.step as OnboardingStep) : "welcome",
    niches: (r.niches ?? []).filter(isNiche),
    source: r.source,
    sourceNote: r.source_note,
    joinedDiscord: r.joined_discord,
    completedAt: r.completed_at ? r.completed_at.toISOString() : null,
  };
}

function isNiche(id: string): id is NicheId {
  return NICHES.some((n) => n.id === id);
}

export function onboardingConfigured(): boolean {
  return dbConfigured();
}

// Read a user's onboarding state, creating the row on first look.
export async function getOnboarding(uid: string): Promise<OnboardingState> {
  if (!dbConfigured()) return { ...EMPTY, step: "done" }; // no DB: never block the app
  await ensureSchema();
  const rows = await query<Row>(
    `INSERT INTO user_onboarding (uid) VALUES ($1)
     ON CONFLICT (uid) DO UPDATE SET uid = EXCLUDED.uid
     RETURNING step, niches, source, source_note, joined_discord, completed_at`,
    [uid]
  );
  return rows[0] ? toState(rows[0]) : EMPTY;
}

// Persist answers for a step and advance. Only known fields are written, and the
// step is validated against STEP_ORDER, so a client can't invent one.
export async function saveOnboarding(
  uid: string,
  patch: {
    step?: OnboardingStep;
    niches?: string[];
    source?: string | null;
    sourceNote?: string | null;
    joinedDiscord?: boolean;
  }
): Promise<OnboardingState> {
  if (!dbConfigured()) return { ...EMPTY, step: "done" };
  await ensureSchema();
  // Make sure the row exists so the UPDATE below always matches.
  await getOnboarding(uid);

  const step = patch.step && STEP_ORDER.includes(patch.step) ? patch.step : undefined;
  const niches = patch.niches?.filter(isNiche);
  const done = step === "done";

  const rows = await query<Row>(
    `UPDATE user_onboarding SET
       step           = COALESCE($2, step),
       niches         = COALESCE($3, niches),
       source         = COALESCE($4, source),
       source_note    = COALESCE($5, source_note),
       joined_discord = COALESCE($6, joined_discord),
       completed_at   = CASE WHEN $7 THEN COALESCE(completed_at, now()) ELSE completed_at END,
       updated_at     = now()
     WHERE uid = $1
     RETURNING step, niches, source, source_note, joined_discord, completed_at`,
    [
      uid,
      step ?? null,
      niches ?? null,
      patch.source ?? null,
      patch.sourceNote ?? null,
      patch.joinedDiscord ?? null,
      done,
    ]
  );
  return rows[0] ? toState(rows[0]) : { ...EMPTY, ...(step ? { step } : {}) };
}

// The niches a user picked, for personalizing Discover. Empty = show everything.
export async function getUserNiches(uid: string): Promise<NicheId[]> {
  if (!dbConfigured()) return [];
  try {
    const state = await getOnboarding(uid);
    return state.niches;
  } catch {
    return [];
  }
}
