// ── Niche colors ──────────────────────────────────────────────────────────────
// One consistent color per niche, used everywhere (badges, chips, tabs) so a
// niche always reads the same across the whole app. Keyed by niche id AND label
// (case-insensitive) so it works whether we have the id or the display label.

export interface NicheColor {
  /* text/border accent */ c: string;
  /* translucent fill    */ bg: string;
  /* translucent border  */ border: string;
}

// Distinct, legible-on-dark hues — one per niche.
const BY_ID: Record<string, NicheColor> = {
  commentary:     { c: "#60a5fa", bg: "rgba(96,165,250,0.14)",  border: "rgba(96,165,250,0.35)" },  // blue
  ranking:        { c: "#fbbf24", bg: "rgba(251,191,36,0.14)",  border: "rgba(251,191,36,0.35)" },  // amber
  animation:      { c: "#c084fc", bg: "rgba(192,132,252,0.14)", border: "rgba(192,132,252,0.35)" }, // purple
  gaming:         { c: "#34d399", bg: "rgba(52,211,153,0.14)",  border: "rgba(52,211,153,0.35)" },  // green
  captions_only:  { c: "#f472b6", bg: "rgba(244,114,182,0.14)", border: "rgba(244,114,182,0.35)" }, // pink
  edits_montages: { c: "#22d3ee", bg: "rgba(34,211,238,0.14)",  border: "rgba(34,211,238,0.35)" },  // cyan
  memes:          { c: "#fb923c", bg: "rgba(251,146,60,0.14)",  border: "rgba(251,146,60,0.35)" },  // orange
};

// Label → id (so we can look up by display label too).
const LABEL_TO_ID: Record<string, string> = {
  "commentary": "commentary",
  "ranking": "ranking",
  "animation": "animation",
  "gaming": "gaming",
  "captions only": "captions_only",
  "edits/montages": "edits_montages",
  "memes": "memes",
};

const FALLBACK: NicheColor = { c: "#9ca3af", bg: "rgba(156,163,175,0.12)", border: "rgba(156,163,175,0.3)" };

// Resolve a niche color from an id OR a display label (case-insensitive).
export function nicheColor(key: string | null | undefined): NicheColor {
  if (!key) return FALLBACK;
  const k = key.trim().toLowerCase();
  const id = BY_ID[k] ? k : LABEL_TO_ID[k];
  return (id && BY_ID[id]) || FALLBACK;
}
