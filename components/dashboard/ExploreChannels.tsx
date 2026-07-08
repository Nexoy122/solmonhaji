"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { nicheColor } from "@/lib/nicheColors";
import BorderGlow from "@/components/dashboard/BorderGlow";

// Consistent per-niche colored badge, used across the app.
function NicheBadge({ niche, label, className = "" }: { niche: string; label: string; className?: string }) {
  const col = nicheColor(niche);
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${className}`}
      style={{ color: col.c, background: col.bg, border: `1px solid ${col.border}` }}
    >
      {label}
    </span>
  );
}

interface NicheDef { id: string; label: string }
interface DiscoveryShort { id: string; title: string; views: number; publishedAt: string }
interface Channel {
  channelId: string; title: string; handle: string | null; thumbnailUrl: string | null; bannerUrl?: string | null; url: string;
  subscriberCount: number; viewCount: number; shortsCount: number; totalVideos?: number; avgShortsViews: number;
  views48h: number; views7d: number; country: string | null;
  aiNiche: string | null; nicheLabel: string | null; format: string | null; faceless: boolean;
  primaryLanguage: string | null; description?: string | null; aiTopics?: string[];
  recentVideos: DiscoveryShort[];
  seedNiche: string; seedNicheLabel: string; // the niche the USER assigned (source of truth for seeds)
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const ALL: NicheDef = { id: "all", label: "All Niches" };

const FORMAT_LABELS: Record<string, string> = {
  "reddit-story": "Reddit Story", "ai-voice-facts": "AI Voice / Facts", "edits-montage": "Edits & Montage",
  "captions-only": "Captions Only", "compilation": "Compilation", "animation": "Animation",
  "reaction-brainrot": "Reaction / Brainrot", "listicle-ranking": "Listicle / Ranking", "asmr": "ASMR",
  "slideshow-quotes": "Slideshow / Quotes", "tutorial": "Tutorial", "clip-repost": "Clip Repost",
  "talking-head": "Talking Head", "commentary": "Commentary",
};
const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", pt: "Portuguese", hi: "Hindi", ar: "Arabic", id: "Indonesian",
  fr: "French", de: "German", ru: "Russian", ja: "Japanese", ko: "Korean", tr: "Turkish",
  it: "Italian", vi: "Vietnamese", th: "Thai", tl: "Tagalog", ur: "Urdu", bn: "Bengali",
};

// ── Filter option arrays ──
type SortKey = "avg" | "subs" | "views" | "shorts";
const SORT_OPTS: [SortKey, string][] = [
  ["avg", "Avg views (High to Low)"],
  ["subs", "Subscribers (High to Low)"],
  ["views", "Total views (High to Low)"],
  ["shorts", "Most shorts"],
];
interface Opt { label: string; test: (c: Channel) => boolean }
const SUB_OPTS: Opt[] = [
  { label: "Any subscribers", test: () => true },
  { label: "Under 100K", test: (c) => c.subscriberCount < 100_000 },
  { label: "100K – 1M", test: (c) => c.subscriberCount >= 100_000 && c.subscriberCount < 1_000_000 },
  { label: "1M – 5M", test: (c) => c.subscriberCount >= 1_000_000 && c.subscriberCount < 5_000_000 },
  { label: "5M+", test: (c) => c.subscriberCount >= 5_000_000 },
];
const AVG_OPTS: Opt[] = [
  { label: "Any avg views", test: () => true },
  { label: "100K+ avg", test: (c) => c.avgShortsViews >= 100_000 },
  { label: "500K+ avg", test: (c) => c.avgShortsViews >= 500_000 },
  { label: "1M+ avg", test: (c) => c.avgShortsViews >= 1_000_000 },
  { label: "5M+ avg", test: (c) => c.avgShortsViews >= 5_000_000 },
];
const SHORTS_OPTS: Opt[] = [
  { label: "Any # shorts", test: () => true },
  { label: "Under 50", test: (c) => (c.totalVideos ?? c.shortsCount) < 50 },
  { label: "50 – 200", test: (c) => { const v = c.totalVideos ?? c.shortsCount; return v >= 50 && v < 200; } },
  { label: "200+", test: (c) => (c.totalVideos ?? c.shortsCount) >= 200 },
];

// Generic labeled dropdown.
function Dropdown({ title, options, value, onChange }: { title: string; options: string[]; value: number; onChange: (i: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  const i = value < 0 ? 0 : value;
  return (
    <div className="relative" ref={ref}>
      <p className="mb-2 text-[13.5px] font-semibold text-on-surface">{title}</p>
      <button onClick={() => setOpen((o) => !o)} className={`inline-flex w-full items-center justify-between gap-2 rounded-none border px-4 py-3 text-[14px] font-medium transition-colors ${value > 0 ? "border-primary bg-primary-container text-on-primary-container" : "border-white/10 bg-black/25 text-on-surface hover:bg-black/40"}`}>
        <span className="truncate">{options[i]}</span>
        <Icon d="m6 9 6 6 6-6" size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 max-h-[280px] w-full overflow-auto rounded-none border border-white/12 bg-[#0c0c0f] py-1">
          {options.map((o, idx) => (
            <button key={o} onClick={() => { onChange(idx); setOpen(false); }} className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] transition-colors hover:bg-white/[0.06] ${idx === i ? "font-semibold text-primary" : "text-on-surface"}`}>
              {idx === i ? <Icon d="M20 6 9 17l-5-5" size={13} /> : <span className="w-[13px]" />}
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Channel detail modal (portaled). Mirrors the Discover modal.
function ChannelModal({ c, onClose }: { c: Channel; onClose: () => void }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 10);
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.removeEventListener("keydown", onEsc); document.body.style.overflow = ""; };
  }, [onClose]);
  const shorts = (c.recentVideos ?? []).filter((v) => v?.id);
  const lang = c.primaryLanguage ? (LANG_NAMES[c.primaryLanguage] ?? c.primaryLanguage.toUpperCase()) : null;
  const topics = (c.aiTopics ?? []).slice(0, 8);
  return createPortal(
    <div className="dashboard-dark fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`relative flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden border border-white/10 bg-[#0F0F14] transition-all duration-200 ${show ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}>
        <div className="flex items-start gap-3 border-b border-white/[0.07] p-5">
          <div className="size-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
            {c.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.thumbnailUrl} alt="" className="size-full object-cover" />
            ) : <div className="flex size-full items-center justify-center text-[18px] font-bold text-on-surface-variant">{c.title?.charAt(0).toUpperCase() ?? "?"}</div>}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[18px] font-bold text-white">{c.title}</p>
            {c.handle && <p className="truncate text-[13px] text-on-surface-variant">{c.handle}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-on-surface-variant">
              <span><span className="font-medium text-white">{fmt(c.subscriberCount)}</span> subs</span>
              <span><span className="font-medium text-white">{fmt(c.avgShortsViews)}</span> avg/short</span>
              <span><span className="font-medium text-white">{c.shortsCount}</span> shorts</span>
              {c.country && <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[11px]">{c.country}</span>}
            </div>
          </div>
          <button onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-white/[0.06] hover:text-white"><Icon d="M18 6 6 18M6 6l12 12" size={16} /></button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {c.faceless && <span className="rounded-md bg-[#10b981]/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#34d399]">Faceless</span>}
            <NicheBadge niche={c.seedNiche} label={c.seedNicheLabel} />
            {c.format && <span className="rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">{FORMAT_LABELS[c.format] ?? c.format}</span>}
            {lang && <span className="rounded-md border border-white/12 bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">{lang}</span>}
          </div>
          {topics.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {topics.map((t) => <span key={t} className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">#{t}</span>)}
            </div>
          )}
          {c.description && <p className="mb-5 whitespace-pre-line text-[13px] leading-relaxed text-on-surface-variant">{c.description}</p>}
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
          ) : <p className="text-[13px] text-on-surface-variant">No Shorts pulled for this channel yet.</p>}
        </div>
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

function ChannelCard({ c, onView }: { c: Channel; onView: () => void }) {
  // Prefer the real channel banner; fall back to a recent Short thumbnail.
  const shortId = (c.recentVideos ?? []).find((v) => v?.id)?.id;
  const bannerSrc = c.bannerUrl || (shortId ? thumb(shortId) : null);
  return (
    <div className="flex flex-col overflow-hidden border border-white/[0.08] bg-[#0c0c0f] transition-colors hover:border-white/25">
      {/* Channel banner */}
      <button onClick={onView} className="relative block h-[120px] overflow-hidden bg-black">
        {bannerSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bannerSrc} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0f] to-transparent" />
        <span className="absolute right-2 top-2"><NicheBadge niche={c.seedNiche} label={c.seedNicheLabel} className="uppercase tracking-wide" /></span>
      </button>

      {/* Header */}
      <div className="-mt-6 flex items-start gap-3 px-4">
        <button onClick={onView} className="size-12 shrink-0 overflow-hidden rounded-full border-2 border-[#0c0c0f] bg-white/[0.05] transition-transform hover:scale-105">
          {c.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
          ) : <div className="flex size-full items-center justify-center text-[15px] font-bold text-on-surface-variant">{c.title?.charAt(0).toUpperCase() ?? "?"}</div>}
        </button>
        <button onClick={onView} className="mt-6 min-w-0 flex-1 text-left">
          <p className="truncate text-[14px] font-semibold text-on-surface transition-colors hover:text-primary">{c.title}</p>
          {c.handle && <p className="truncate text-[12px] text-on-surface-variant">{c.handle}</p>}
        </button>
      </div>

      {/* Stats */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 text-[11.5px] text-on-surface-variant">
        <span className="inline-flex items-center gap-1"><Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" size={11} /><span className="font-medium text-on-surface">{fmt(c.subscriberCount)}</span> subs</span>
        <span className="inline-flex items-center gap-1"><Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" size={11} /><span className="font-medium text-on-surface">{fmt(c.avgShortsViews)}</span> avg</span>
        <span className="inline-flex items-center gap-1"><Icon d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" size={11} /><span className="font-medium text-on-surface">{c.totalVideos ?? c.shortsCount}</span> shorts</span>
      </div>

      {/* Description */}
      {c.description && <p className="mt-2.5 line-clamp-2 px-4 text-[12px] leading-relaxed text-on-surface-variant">{c.description}</p>}

      {/* Actions */}
      <div className="mt-auto flex gap-2 p-4 pt-3">
        <a href={c.url} target="_blank" rel="noreferrer" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-white/12 bg-white/[0.02] text-[12.5px] font-semibold text-on-surface-variant transition-all hover:border-white/25 hover:bg-white/[0.06] hover:text-on-surface">
          <Icon d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" size={13} /> Open
        </a>
        <button onClick={onView} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-[12.5px] font-semibold text-on-primary transition-all hover:brightness-110">
          <Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" size={13} /> View details
        </button>
      </div>
    </div>
  );
}

export function ExploreChannels({ search = "", onSearch = () => {} }: { search?: string; onSearch?: (v: string) => void }) {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [niches, setNiches] = useState<NicheDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Channel | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(24);
  // Filters
  const [sort, setSort] = useState<SortKey>("avg");
  const [niche, setNiche] = useState("all");
  const [fSubs, setFSubs] = useState(0);
  const [fAvg, setFAvg] = useState(0);
  const [fShorts, setFShorts] = useState(0);

  useEffect(() => { setMounted(true); }, []);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch("/api/explore/channels", { headers: await authHeader() });
        const data = await res.json();
        if (!res.ok) setError(data.error || "Couldn't load channels.");
        else { setChannels(data.channels ?? []); setNiches(data.niches ?? []); }
      } catch { setError("Network error."); }
      setLoading(false);
    })();
  }, [user, authHeader]);

  const nicheOpts = [ALL, ...niches];
  const anyFilter = fSubs > 0 || fAvg > 0 || fShorts > 0 || niche !== "all";
  const q = search.trim().toLowerCase();

  const filtered = channels
    .filter((c) =>
      (niche === "all" || c.seedNiche === niche) &&
      SUB_OPTS[fSubs].test(c) && AVG_OPTS[fAvg].test(c) && SHORTS_OPTS[fShorts].test(c) &&
      (!q || [c.title, c.handle ?? "", c.seedNicheLabel, ...(c.aiTopics ?? [])].join(" ").toLowerCase().includes(q)))
    .sort((a, b) =>
      sort === "subs" ? b.subscriberCount - a.subscriberCount :
      sort === "views" ? b.viewCount - a.viewCount :
      sort === "shorts" ? (b.totalVideos ?? b.shortsCount) - (a.totalVideos ?? a.shortsCount) :
      b.avgShortsViews - a.avgShortsViews);
  const shown = filtered.slice(0, visible);
  useEffect(() => { setVisible(24); }, [sort, niche, fSubs, fAvg, fShorts, search]);

  const railPanel = (
    <aside className="dashboard-dark fixed z-20 hidden w-[272px] flex-col overflow-y-auto border border-white/[0.08] bg-[#08080a] p-5 lg:flex" style={{ left: "calc(16rem + 15px)", top: "15px", height: "calc(100vh - 30px)" }}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">Filters</p>
        {anyFilter && <button onClick={() => { setNiche("all"); setFSubs(0); setFAvg(0); setFShorts(0); }} className="text-[12.5px] font-semibold text-primary hover:underline">Clear</button>}
      </div>
      <div className="flex flex-col gap-5">
        <Dropdown title="Sort by" options={SORT_OPTS.map((s) => s[1])} value={SORT_OPTS.findIndex((s) => s[0] === sort)} onChange={(i) => setSort(SORT_OPTS[i][0])} />
        <Dropdown title="Niche" options={nicheOpts.map((o) => o.label)} value={nicheOpts.findIndex((o) => o.id === niche)} onChange={(i) => setNiche(nicheOpts[i].id)} />
        <Dropdown title="Subscribers" options={SUB_OPTS.map((o) => o.label)} value={fSubs} onChange={setFSubs} />
        <Dropdown title="Avg Views" options={AVG_OPTS.map((o) => o.label)} value={fAvg} onChange={setFAvg} />
        <Dropdown title="Number of Shorts" options={SHORTS_OPTS.map((o) => o.label)} value={fShorts} onChange={setFShorts} />
      </div>
    </aside>
  );

  return (
    <>
      {mounted && createPortal(railPanel, document.body)}
      {modal && <ChannelModal c={modal} onClose={() => setModal(null)} />}

      {/* Count badge (left) + search (right corner), same line */}
      {!loading && !error && (
        <div className="mb-4 flex items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0c0c0f] py-1.5 pl-1.5 pr-3.5">
            <span className="inline-flex min-w-[30px] items-center justify-center rounded-md bg-primary px-2.5 py-1 text-[13px] font-bold tabular-nums text-on-primary">{fmt(filtered.length)}</span>
            <span className="text-[13px] font-medium text-on-surface-variant">channels match your filters</span>
          </div>
          <BorderGlow borderRadius={8} glowRadius={16} glowColor="0 0 100" glowIntensity={0.5} className="ml-auto w-full max-w-[260px]">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" size={15} />
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search channels…"
                className="h-9 w-full bg-transparent pl-9 pr-8 text-[13px] text-white outline-none placeholder:text-white/35"
              />
              {search && (
                <button onClick={() => onSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white" aria-label="Clear">
                  <Icon d="M18 6 6 18M6 6l12 12" size={14} />
                </button>
              )}
            </div>
          </BorderGlow>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />{error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border border-white/[0.08] bg-[#0c0c0f]">
              <div className="h-[120px] animate-pulse bg-white/[0.05]" />
              <div className="space-y-2 p-4"><div className="h-3.5 w-2/3 animate-pulse rounded bg-white/[0.06]" /><div className="h-3 w-1/2 animate-pulse rounded bg-white/[0.06]" /></div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-white/12 py-16 text-center">
          <p className="text-[15px] font-semibold text-on-surface">No channels match your filters</p>
          <p className="mt-1 text-[14px] text-on-surface-variant">Try loosening a filter.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => <ChannelCard key={c.channelId} c={c} onView={() => setModal(c)} />)}
          </div>
          {visible < filtered.length && (
            <div className="mt-8 flex justify-center">
              <button onClick={() => setVisible((n) => n + 24)} className="border border-white/12 bg-white/[0.03] px-5 py-2.5 text-[13.5px] font-semibold text-on-surface transition-colors hover:bg-white/[0.06]">
                Load more ({fmt(filtered.length - visible)} left)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
