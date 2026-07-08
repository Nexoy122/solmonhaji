"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { canUse } from "@/lib/plan";

// Niche filter options (mirrors lib/nicheResearch NICHES — client-safe copy).
const NICHE_OPTS: [string, string][] = [
  ["commentary", "Commentary"], ["ranking", "Ranking"], ["animation", "Animation"],
  ["gaming", "Gaming"], ["captions_only", "Captions Only"], ["edits_montages", "Edits/Montages"],
  ["memes", "Memes"],
];
// Subscriber tiers for the advanced filter (min subs).
const SUB_OPTS: [number, string][] = [
  [0, "Any size"], [1_000, "1K+"], [10_000, "10K+"], [100_000, "100K+"],
  [500_000, "500K+"], [1_000_000, "1M+"],
];
// Languages users can filter by (value = ISO code the AI stored).
const LANG_OPTS: [string, string][] = [
  ["en", "English"], ["es", "Spanish"], ["pt", "Portuguese"], ["hi", "Hindi"],
  ["ar", "Arabic"], ["fr", "French"], ["de", "German"], ["id", "Indonesian"],
];

interface DiscoveryShort { id: string; title: string; views: number; publishedAt: string }
interface DiscoveryChannel {
  channelId: string; title: string; handle: string | null; thumbnailUrl: string | null; url: string;
  subscriberCount: number; viewCount: number; shortsCount: number; totalVideos?: number; avgShortsViews: number;
  views48h: number; views7d: number; country: string | null;
  aiNiche: string | null; nicheLabel: string | null; format: string | null; faceless: boolean;
  primaryLanguage: string | null;
  description?: string | null;
  aiTopics?: string[];
  recentVideos: DiscoveryShort[];
}
interface Meta { lastCrawl: number | null; discovered: number; enriched: number }

type Sort = "blowing_up" | "relevance" | "subscribers" | "views" | "recent";
const SORTS: [Sort, string][] = [
  ["blowing_up", "Blowing up"],
  ["relevance", "Best match"],
  ["recent", "New & rising"],
  ["subscribers", "Subscribers"],
  ["views", "Total views"],
];

const FORMAT_LABELS: Record<string, string> = {
  "reddit-story": "Reddit Story", "ai-voice-facts": "AI Voice / Facts", "edits-montage": "Edits & Montage",
  "captions-only": "Captions Only", "compilation": "Compilation", "animation": "Animation",
  "reaction-brainrot": "Reaction / Brainrot", "listicle-ranking": "Listicle / Ranking", "asmr": "ASMR",
  "slideshow-quotes": "Slideshow / Quotes", "tutorial": "Tutorial", "clip-repost": "Clip Repost",
  "talking-head": "Talking Head", "commentary": "Commentary",
};

function Icon({ d, size = 14 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", pt: "Portuguese", hi: "Hindi", ar: "Arabic",
  id: "Indonesian", fr: "French", de: "German", ru: "Russian", ja: "Japanese",
  ko: "Korean", tr: "Turkish", it: "Italian", vi: "Vietnamese", th: "Thai",
  tl: "Tagalog", ur: "Urdu", bn: "Bengali",
};

// Channel detail modal — opens when the avatar/name is clicked.
function ChannelModal({ c, onClose }: { c: DiscoveryChannel; onClose: () => void }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const t = setTimeout(() => setShow(true), 10);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden"; // lock scroll while open
    return () => { clearTimeout(t); document.removeEventListener("keydown", onEsc); document.body.style.overflow = ""; };
  }, [onClose]);
  const shorts = (c.recentVideos ?? []).filter((v) => v?.id);
  const lang = c.primaryLanguage ? (LANG_NAMES[c.primaryLanguage] ?? c.primaryLanguage.toUpperCase()) : null;
  const topics = (c.aiTopics ?? []).slice(0, 8);

  if (!mounted) return null;

  return createPortal(
    <div className="dashboard-dark fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-white/10 bg-[#0F0F14] shadow-[0_24px_80px_rgba(0,0,0,0.7)] transition-all duration-200 ${show ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-white/[0.07] p-5">
          <div className="size-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
            {c.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center text-[18px] font-bold text-on-surface-variant">{c.title?.charAt(0).toUpperCase() ?? "?"}</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold text-white">{c.title}</p>
            {c.handle && <p className="truncate text-[13px] text-on-surface-variant">{c.handle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-on-surface-variant">
              <span className="flex items-center gap-1"><Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={13} /><span className="font-medium text-white">{fmt(c.subscriberCount)}</span> subs</span>
              <span className="flex items-center gap-1"><Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" size={13} /><span className="font-medium text-white">{fmt(c.avgShortsViews)}</span> avg/short</span>
              <span className="flex items-center gap-1"><Icon d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" size={13} /><span className="font-medium text-white">{c.shortsCount}</span> shorts</span>
              {c.country && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px]">{c.country}</span>}
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/[0.06] hover:text-white" aria-label="Close">
            <Icon d="M18 6 6 18M6 6l12 12" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {/* Tags */}
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {c.faceless && <span className="rounded-md bg-[#10b981]/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#34d399]">Faceless</span>}
            {c.nicheLabel && <span className="rounded-md bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">{c.nicheLabel}</span>}
            {c.format && <span className="rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">{FORMAT_LABELS[c.format] ?? c.format}</span>}
            {lang && <span className="rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">{lang}</span>}
          </div>

          {/* Topics (hashtags) */}
          {topics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {topics.map((t) => (
                <span key={t} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">#{t}</span>
              ))}
            </div>
          )}

          {/* 48h velocity */}
          {c.views48h >= 10_000 && (
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-md bg-[#f59e0b]/15 px-2.5 py-1 text-[12.5px] font-semibold text-[#d97706]">
              <Icon d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" size={13} /> +{fmt(c.views48h)} views in the last 48h
            </div>
          )}

          {/* Description */}
          {c.description && (
            <p className="mb-5 whitespace-pre-line text-[13px] leading-relaxed text-on-surface-variant">{c.description}</p>
          )}

          {/* Recent Shorts */}
          {shorts.length > 0 ? (
            <>
              <p className="mb-2.5 text-[13px] font-semibold text-white">Recent Shorts</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {shorts.map((v) => (
                  <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="min-w-0">
                    <div className="relative overflow-hidden border border-white/10">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(v.id)} alt="" loading="lazy" className="aspect-[9/16] w-full object-cover" />
                      <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">{fmt(v.views)}</span>
                    </div>
                    {v.title && <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-on-surface-variant">{v.title}</p>}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="text-[13px] text-on-surface-variant">No Shorts pulled for this channel yet.</p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/[0.07] p-4">
          <a href={c.url} target="_blank" rel="noreferrer" className="flex h-10 w-full items-center justify-center gap-1.5 bg-primary text-[13.5px] font-semibold text-on-primary transition-colors hover:brightness-110">
            <Icon d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" size={15} /> Open channel on YouTube
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Centered discovery loader — pulsing search ring + cycling status text.
const LOADER_STEPS = [
  "Understanding your search…",
  "Scanning channels across every niche…",
  "Matching by niche & format…",
  "Ranking by relevance…",
];
function DiscoverLoader() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADER_STEPS.length - 1)), 1300);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      {/* Rocket "speeder" loader */}
      <div className="rocket-loader">
        <div className="loader">
          <span><span></span><span></span><span></span><span></span></span>
          <div className="base">
            <span></span>
            <div className="face"></div>
          </div>
        </div>
        <div className="longfazers">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
      <p className="mt-3 text-[15px] font-semibold text-white">Finding the best channels</p>
      <p key={step} className="mt-1.5 text-[13px] text-on-surface-variant [animation:dash-fade-up_0.4s_ease-out]">{LOADER_STEPS[step]}</p>
    </div>
  );
}

// Graceful "temporarily unavailable" state — shown when the tool hits a
// capacity/quota issue instead of a raw error.
function ToolUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-none border border-white/[0.07] bg-white/[0.02] py-20 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-on-surface-variant">
        <Icon d="M12 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM19 11V8a7 7 0 0 0-14 0v3M5 11h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" size={26} />
      </div>
      <p className="text-[16px] font-semibold text-white">Currently not available</p>
      <p className="mt-1.5 max-w-[420px] text-[13.5px] leading-relaxed text-on-surface-variant">
        This tool is temporarily unavailable due to high demand. It&apos;ll be back shortly — please try again in a little while.
      </p>
      <button onClick={onRetry} className="mt-5 inline-flex items-center gap-1.5 rounded-none border border-white/12 bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/[0.06]">
        <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" size={14} /> Try again
      </button>
    </div>
  );
}

function ChannelCard({ c }: { c: DiscoveryChannel }) {
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const shorts = (c.recentVideos ?? []).filter((v) => v?.id).slice(0, 3);
  const copy = async () => {
    try { await navigator.clipboard.writeText(c.url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div className="group/card flex flex-col overflow-hidden border border-white/[0.07] bg-white/[0.02] transition-colors duration-200 hover:border-white/25">
      {showModal && <ChannelModal c={c} onClose={() => setShowModal(false)} />}
      {/* Header: avatar + name (click → detail modal) + niche badge */}
      <div className="flex items-start gap-3 px-4 pt-4">
        <button onClick={() => setShowModal(true)} className="size-11 shrink-0 overflow-hidden rounded-full border border-outline-variant bg-surface-container-high transition-transform hover:scale-105" aria-label={`View ${c.title}`}>
          {c.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-[14px] font-bold text-on-surface-variant">{c.title?.charAt(0).toUpperCase() ?? "?"}</div>
          )}
        </button>
        <button onClick={() => setShowModal(true)} className="min-w-0 flex-1 text-left">
          <p className="truncate text-[14px] font-semibold text-on-surface transition-colors hover:text-primary">{c.title}</p>
          {c.handle && <p className="truncate text-[12px] text-on-surface-variant">{c.handle}</p>}
        </button>
        <div className="flex shrink-0 items-center gap-1.5">
          {c.nicheLabel && (
            <span className="rounded-md bg-primary-container px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-on-primary-container">{c.nicheLabel}</span>
          )}
        </div>
      </div>

      {/* Tags */}
      {(c.faceless || c.format) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 px-4">
          {c.faceless && <span className="rounded-md bg-[#10b981]/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#059669]">Faceless</span>}
          {c.format && <span className="rounded-md border border-outline-variant bg-surface-container-low px-1.5 py-0.5 text-[10px] font-medium text-on-surface-variant">{FORMAT_LABELS[c.format] ?? c.format}</span>}
        </div>
      )}

      {/* Stats */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 text-[11px] text-on-surface-variant">
        {c.views48h >= 10_000 && (
          <span className="flex items-center gap-1 rounded-md bg-[#f59e0b]/15 px-1.5 py-0.5 font-semibold text-[#d97706]">
            <Icon d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" size={11} />+{fmt(c.views48h)} / 48h
          </span>
        )}
        <span className="flex items-center gap-1"><Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={11} /><span className="font-medium text-on-surface">{fmt(c.subscriberCount)}</span> subs</span>
        <span className="flex items-center gap-1"><Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" size={11} /><span className="font-medium text-on-surface">{fmt(c.avgShortsViews)}</span> avg/short</span>
        <span className="flex items-center gap-1"><Icon d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" size={11} /><span className="font-medium text-on-surface">{c.shortsCount}</span> shorts</span>
      </div>

      {/* The channel's OWN recent Shorts (never mixed with others) */}
      <div className="mt-3 grid grid-cols-3 gap-2 px-4">
        {shorts.length > 0 ? shorts.map((v) => (
          <a key={v.id} href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer" className="min-w-0">
            <div className="relative overflow-hidden rounded-none border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(v.id)} alt="" loading="lazy" className="aspect-[9/16] w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-white">{fmt(v.views)}</span>
            </div>
            {v.title && <p className="mt-1 line-clamp-1 text-[10px] leading-tight text-on-surface-variant">{v.title}</p>}
          </a>
        )) : [0, 1, 2].map((i) => (
          <div key={i} className="flex aspect-[9/16] items-center justify-center rounded-none border border-white/10 bg-white/[0.03] text-on-surface-variant/40">
            <Icon d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" size={18} />
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-auto flex gap-2 px-4 pb-4 pt-3">
        <a href={c.url} target="_blank" rel="noreferrer" className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-none border border-white/12 text-[11.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
          <Icon d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" size={12} /> Open channel
        </a>
        <button onClick={copy} className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-none border border-white/12 text-[11.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
          <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"} size={12} />
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}

export function Discover() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");   // what the user is typing
  const [query, setQuery] = useState("");     // debounced value sent to the API
  const [sort, setSort] = useState<Sort>("blowing_up");
  const [sortTouched, setSortTouched] = useState(false); // user explicitly picked a sort
  const [channels, setChannels] = useState<DiscoveryChannel[]>([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailable, setUnavailable] = useState(false); // tool temporarily down (quota/capacity)
  const [expanding, setExpanding] = useState(false); // background discovery running for this search
  const [sortMenu, setSortMenu] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // ── Advanced filters (premium later — gated via canUse('advanced_filters')) ──
  const [showFilters, setShowFilters] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false); // shown when locked + clicked
  const [fNiche, setFNiche] = useState("all");        // niche id or "all"
  const [fMinSubs, setFMinSubs] = useState(0);        // minimum subscribers
  const [fFaceless, setFFaceless] = useState(false);  // faceless only
  const [fLang, setFLang] = useState("");             // ISO language code or ""
  const filtersUnlocked = canUse(undefined, "advanced_filters");
  const activeFilterCount = (fNiche !== "all" ? 1 : 0) + (fMinSubs > 0 ? 1 : 0) + (fFaceless ? 1 : 0) + (fLang ? 1 : 0);
  const clearFilters = () => { setFNiche("all"); setFMinSubs(0); setFFaceless(false); setFLang(""); };

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Debounce the search box → query (400ms after the user stops typing).
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Searching defaults to Best match until the user explicitly picks a sort.
  const effectiveSort: Sort = query && !sortTouched ? "relevance" : sort;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError(""); setUnavailable(false);
    try {
      const params = new URLSearchParams({ niche: fNiche, sort: effectiveSort, limit: "90" });
      if (query) params.set("q", query);
      // Advanced filters (only sent when unlocked — free tier ignores them).
      if (filtersUnlocked) {
        if (fMinSubs > 0) params.set("minSubs", String(fMinSubs));
        if (fFaceless) params.set("faceless", "1");
        if (fLang) params.set("language", fLang);
      }
      const res = await fetch(`/api/discovery?${params}`, { headers: await authHeader() });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503 || data.unavailable) setUnavailable(true);
        else setError(data.error || "Couldn't load channels.");
      } else {
        setChannels(data.channels ?? []); setTotal(data.total ?? 0); setMeta(data.meta ?? null);
        if (data.expanding) setExpanding(true); // only set true here; the timer below clears it
      }
    } catch { setError("Network error."); }
    setLoading(false);
  }, [user, authHeader, query, effectiveSort, fNiche, fMinSubs, fFaceless, fLang, filtersUnlocked]);

  useEffect(() => { load(); }, [load]);

  // While a background expansion runs, refetch so new channels appear, then stop.
  const loadRef = useRef(load);
  loadRef.current = load;
  useEffect(() => {
    if (!expanding) return;
    const t1 = setTimeout(() => loadRef.current(), 35_000);
    const t2 = setTimeout(() => { loadRef.current(); setExpanding(false); }, 90_000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [expanding]);

  // "Discover more channels" — force a deeper background expansion for this search.
  const discoverMore = useCallback(async () => {
    if (!user || !query) return;
    setExpanding(true);
    try {
      const params = new URLSearchParams({ niche: "all", sort: effectiveSort, limit: "90", q: query, expand: "1" });
      await fetch(`/api/discovery?${params}`, { headers: await authHeader() });
    } catch { /* background — errors surface on the next reload */ }
  }, [user, query, effectiveSort, authHeader]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const sortLabel = SORTS.find((s) => s[0] === effectiveSort)?.[1] ?? "Blowing up";

  // Tool temporarily unavailable (quota/capacity) — show a clean locked state.
  if (unavailable) {
    return (
      <div className="dash-fade-up w-full">
        <p className="mb-5 text-[14px] text-on-surface-variant">Channels blowing up across every niche — auto-discovered and updated daily.</p>
        <ToolUnavailable onRetry={() => load()} />
      </div>
    );
  }

  return (
    <div className="dash-fade-up w-full">
      {/* Subtitle */}
      <p className="mb-4 text-[14px] text-on-surface-variant">Channels blowing up across every niche — auto-discovered and updated daily. Each card shows that channel&apos;s own Shorts.</p>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {/* Search — animated glow border on focus */}
        <div className="glow-search w-full max-w-[440px]">
          <div className="relative flex items-center">
            <span className="pointer-events-none absolute left-3.5 text-white/40">
              <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" size={16} />
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vibe — funny football, ranking, minecraft…"
              className="h-11 w-full rounded-none bg-transparent pl-11 pr-10 text-[14px] text-white outline-none placeholder:text-white/35"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 text-white/40 transition-colors hover:text-white" aria-label="Clear search">
                <Icon d="M18 6 6 18M6 6l12 12" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div className="relative" ref={sortRef}>
          <button onClick={() => setSortMenu((o) => !o)} className="inline-flex items-center gap-2 rounded-none border border-white/12 bg-white/[0.03] px-4 py-2 text-[13.5px] font-medium text-on-surface transition-colors hover:bg-surface-container-high">
            <span className="text-on-surface-variant">Sort:</span> {sortLabel}
            <Icon d="m6 9 6 6 6-6" size={14} />
          </button>
          {sortMenu && (
            <div className="absolute left-0 z-30 mt-2 w-[170px] overflow-hidden rounded-none border border-white/12 bg-[#1a1a20] py-1 shadow-[0_12px_40px_rgba(23,28,31,0.18)]">
              {SORTS.map(([val, lbl]) => (
                <button key={val} onClick={() => { setSort(val); setSortTouched(true); setSortMenu(false); }} className={`flex w-full items-center px-4 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-container-high ${effectiveSort === val ? "font-semibold text-primary" : "text-on-surface"}`}>{lbl}</button>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Filters (premium later — locked shows a padlock + upsell) */}
        <button
          onClick={() => filtersUnlocked ? setShowFilters((o) => !o) : setShowUpsell(true)}
          title={filtersUnlocked ? "Filter by niche, size, language & style" : "Advanced filters are a premium feature"}
          className={`inline-flex items-center gap-2 rounded-none border px-4 py-2 text-[13.5px] font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-white/12 bg-white/[0.03] text-on-surface hover:bg-surface-container-high"
          }`}
        >
          {/* Filter (funnel) icon */}
          <Icon d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" size={13} />
          Advanced Filters
          {filtersUnlocked && activeFilterCount > 0 && (
            <span className="ml-0.5 inline-flex size-[18px] items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">{activeFilterCount}</span>
          )}
          {filtersUnlocked && <Icon d={showFilters ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} size={13} />}
        </button>

        {/* Clear (only when a filter is active) */}
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="inline-flex items-center gap-1.5 rounded-none border border-white/12 bg-white/[0.03] px-3.5 py-2 text-[13.5px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
            <Icon d="M18 6 6 18M6 6l12 12" size={13} /> Clear
          </button>
        )}
      </div>

      {/* Advanced filter panel (only when unlocked) */}
      {showFilters && filtersUnlocked && (
        <div className="mb-4 grid grid-cols-1 gap-4 rounded-none border border-white/12 bg-white/[0.02] p-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Niche */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Niche</label>
            <div className="flex flex-wrap gap-1.5">
              {[["all", "All"], ...NICHE_OPTS].map(([val, lbl]) => (
                <button key={val} onClick={() => setFNiche(val)} className={`rounded-none border px-2.5 py-1 text-[12px] font-medium transition-colors ${fNiche === val ? "border-primary bg-primary/15 text-primary" : "border-white/12 text-on-surface-variant hover:bg-surface-container-high"}`}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* Min subscribers */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Min subscribers</label>
            <div className="flex flex-wrap gap-1.5">
              {SUB_OPTS.map(([val, lbl]) => (
                <button key={val} onClick={() => setFMinSubs(val)} className={`rounded-none border px-2.5 py-1 text-[12px] font-medium transition-colors ${fMinSubs === val ? "border-primary bg-primary/15 text-primary" : "border-white/12 text-on-surface-variant hover:bg-surface-container-high"}`}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* Language */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Language</label>
            <div className="flex flex-wrap gap-1.5">
              {[["", "Any"], ...LANG_OPTS].map(([val, lbl]) => (
                <button key={val || "any"} onClick={() => setFLang(val)} className={`rounded-none border px-2.5 py-1 text-[12px] font-medium transition-colors ${fLang === val ? "border-primary bg-primary/15 text-primary" : "border-white/12 text-on-surface-variant hover:bg-surface-container-high"}`}>{lbl}</button>
              ))}
            </div>
          </div>
          {/* Faceless */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">Style</label>
            <button onClick={() => setFFaceless((v) => !v)} className={`inline-flex items-center gap-2 rounded-none border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${fFaceless ? "border-[#10b981]/60 bg-[#10b981]/15 text-[#34d399]" : "border-white/12 text-on-surface-variant hover:bg-surface-container-high"}`}>
              <span className={`flex size-4 items-center justify-center rounded-none border ${fFaceless ? "border-[#10b981] bg-[#10b981] text-black" : "border-white/30"}`}>
                {fFaceless && <Icon d="M20 6 9 17l-5-5" size={11} />}
              </span>
              Faceless only
            </button>
          </div>
        </div>
      )}

      {/* Discover-more (only while searching) */}
      {!expanding && query && !loading && (
        <div className="mb-3.5">
          <button onClick={discoverMore} className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3.5 py-1.5 text-[12.5px] font-semibold text-primary transition-colors hover:bg-primary/10">
            <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2zM19 3v4M21 5h-4" size={13} />
            Discover more channels
          </button>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-none border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />{error}
        </div>
      )}

      {/* Show the centered loader while expanding a search with no results yet. */}
      {expanding && channels.length === 0 ? (
        <DiscoverLoader />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-none border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3"><div className="size-11 animate-pulse rounded-full bg-surface-container-high" /><div className="flex-1 space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-surface-container-high" /><div className="h-2.5 w-1/3 animate-pulse rounded bg-surface-container-high" /></div></div>
              <div className="mt-3 grid grid-cols-3 gap-2">{[0, 1, 2].map((j) => <div key={j} className="aspect-[9/16] animate-pulse rounded-none bg-white/[0.05]" />)}</div>
            </div>
          ))}
        </div>
      ) : channels.length === 0 ? (
        <div className="rounded-none border border-dashed border-white/12 py-16 text-center">
          <p className="text-[15px] font-semibold text-on-surface">{query ? "No channels found" : "No channels yet"}</p>
          <p className="mt-1 text-[14px] text-on-surface-variant">
            {query ? "Try a different search or clear your filters." : meta?.lastCrawl ? "Turn off a filter to see more." : "The discovery crawler hasn't run yet. Channels will appear here after the first crawl."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {channels.map((c) => <ChannelCard key={c.channelId} c={c} />)}
          </div>
          {/* Subtle indicator when expanding on top of existing results */}
          {expanding && (
            <div className="mt-6 flex items-center justify-center gap-2.5 text-[13px] text-on-surface-variant">
              <span className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Discovering more channels for this search…
            </div>
          )}
        </>
      )}

      {/* Premium upsell — shown only when advanced filters are locked + clicked */}
      {showUpsell && <FiltersUpsell onClose={() => setShowUpsell(false)} />}
    </div>
  );
}

// Locked-feature upsell for Advanced Filters (appears only when the paywall is on).
function FiltersUpsell({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-[420px] rounded-none border border-white/12 bg-[#16151a] p-6 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Icon d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" size={22} />
        </div>
        <h3 className="text-[17px] font-bold text-on-surface">Advanced Filters is a premium feature</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-on-surface-variant">
          Filter the entire discovery index by niche, subscriber size, language, and faceless style — pinpoint exactly the channels you want to model.
        </p>
        <button onClick={onClose} className="mt-5 w-full rounded-none border border-white/12 bg-white/[0.03] py-2.5 text-[13.5px] font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
