// Central credit-cost config — how many credits each paid action costs.
// Priced ~1 credit ≈ 1¢ of real API cost, so plans keep ~85%+ margin.
// Browsing (Discover/Explore) is cached and free.

export const CREDIT_COST = {
  script: 2,          // generate / improve a script (Groq Llama)
  scriptFromVideo: 8, // from an uploaded video (Whisper + vision)
  niche: 3,           // niche research per niche (Groq + YouTube quota)
  transcript: 3,      // Shorts transcript (Supadata)
  trustScore: 5,      // Trust Score analysis (Analytics + scoring)
  channelAudit: 40,   // deep video-ML audit (most expensive)
  aiChat: 1,          // Trust Score AI chat message
} as const;

export type CreditAction = keyof typeof CREDIT_COST;

// Plan → monthly credits (kept in sync with lib/polar.ts + the Plans UI).
export const PLAN_MONTHLY_CREDITS: Record<string, number> = {
  free: 100,      // refreshed weekly
  starter: 1000,
  creator: 3000,
  plus: 8000,     // "Pro" tier
};
