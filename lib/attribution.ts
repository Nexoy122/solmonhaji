// ── Traffic-source attribution ────────────────────────────────────────────────
// Figures out where a visitor came from, so each waitlist signup can be tagged.
//
// Accuracy priority (most → least reliable):
//   1. UTM tag, ?utm_source=instagram          (you control it; 100% accurate)
//   2. Platform click-id, fbclid / igshid / ttclid…   (auto-added by the platform)
//   3. ref= / source= shorthand params                 (common in shared links)
//   4. Referrer hostname auto-detect                   (best-effort; social apps often hide it)
//   5. "direct"                                        (no signal, typed URL, in-app browser, etc.)
//
// FIRST-TOUCH: the very first source we see is stored in localStorage and kept,
// even if the visitor leaves and returns later to sign up. That's the most
// meaningful attribution for "where did this lead originally come from".

export interface Attribution {
  source: string;        // "instagram", "tiktok", "youtube", "direct", …
  medium: string;        // "campaign" | "referral" | "none"
  campaign: string;      // utm_campaign
  content: string;       // utm_content
  referrer: string;      // raw document.referrer at first touch
  landingPath: string;   // first page hit
}

const KEY = "ns_attribution"; // localStorage → first-touch, persists across visits

// Map referrer hostnames → friendly platform names.
const REFERRER_MAP: { match: RegExp; source: string }[] = [
  { match: /instagram\.com|l\.instagram\.com|ig\./i, source: "instagram" },
  { match: /tiktok\.com|vm\.tiktok/i, source: "tiktok" },
  { match: /youtube\.com|youtu\.be/i, source: "youtube" },
  { match: /(twitter\.com|x\.com|t\.co)/i, source: "twitter" },
  { match: /reddit\.com|out\.reddit/i, source: "reddit" },
  { match: /facebook\.com|fb\.me|lm\.facebook/i, source: "facebook" },
  { match: /discord\.com|discord\.gg/i, source: "discord" },
  { match: /linkedin\.com|lnkd\.in/i, source: "linkedin" },
  { match: /t\.me|telegram/i, source: "telegram" },
  { match: /whatsapp|wa\.me/i, source: "whatsapp" },
  { match: /google\./i, source: "google" },
  { match: /bing\.com/i, source: "bing" },
];

// Platform click-IDs the apps append automatically, a strong signal even when
// the referrer is stripped (e.g. Instagram/TikTok in-app browsers).
function detectFromClickId(params: URLSearchParams): string | null {
  if (params.has("igshid")) return "instagram";
  if (params.has("fbclid")) return "facebook";
  if (params.has("ttclid")) return "tiktok";
  if (params.has("twclid")) return "twitter";
  if (params.has("gclid") || params.has("gad_source")) return "google";
  if (params.has("li_fat_id")) return "linkedin";
  return null;
}

function detectFromReferrer(ref: string): string {
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname;
    if (typeof window !== "undefined" && host === window.location.hostname) return "direct";
    for (const { match, source } of REFERRER_MAP) {
      if (match.test(host)) return source;
    }
    return host.replace(/^www\./, ""); // unknown external site → its domain
  } catch {
    return "direct";
  }
}

function emptyAttribution(): Attribution {
  return { source: "direct", medium: "none", campaign: "", content: "", referrer: "", landingPath: "/" };
}

/**
 * Resolve attribution once and store it as FIRST-TOUCH. Call early on load.
 * If a first-touch value already exists, it is kept (we don't overwrite the
 * original source with a later visit).
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return emptyAttribution();

  // First-touch already recorded? Keep it.
  try {
    const cached = localStorage.getItem(KEY);
    if (cached) return JSON.parse(cached) as Attribution;
  } catch {
    /* fall through and recompute */
  }

  const params = new URLSearchParams(window.location.search);

  // accept utm_source, or shorthand ref= / source=
  const utmSource = params.get("utm_source") || params.get("ref") || params.get("source");
  const utmMedium = params.get("utm_medium");
  const utmCampaign = params.get("utm_campaign") || params.get("campaign") || "";
  const utmContent = params.get("utm_content") || "";
  const ref = document.referrer || "";

  const clickId = detectFromClickId(params);

  // Priority chain.
  const source = (utmSource || clickId || detectFromReferrer(ref) || "direct").toLowerCase();

  let medium: string;
  if (utmMedium) medium = utmMedium;
  else if (utmSource || clickId) medium = "campaign";
  else if (source !== "direct") medium = "referral";
  else medium = "none";

  const attribution: Attribution = {
    source,
    medium,
    campaign: utmCampaign,
    content: utmContent,
    referrer: ref,
    landingPath: window.location.pathname,
  };

  try { localStorage.setItem(KEY, JSON.stringify(attribution)); } catch { /* ignore */ }
  return attribution;
}

/** Read the cached (first-touch) attribution, computing it if not yet stored. */
export function getAttribution(): Attribution {
  return captureAttribution();
}
