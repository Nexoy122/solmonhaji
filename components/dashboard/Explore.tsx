"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { ExploreChannels } from "@/components/dashboard/ExploreChannels";

interface NicheDef { id: string; label: string }
interface ExploreVideo {
  id: string; title: string; channelId: string; channelName: string; channelAvatar: string | null;
  thumbnail: string; views: number; subs: number; publishedAt: string; durationSec: number;
  outlierX: number; url: string;
}
type SortKey = "views" | "outlier" | "velocity" | "recent";
// "Performance" sorts surface the best-performing videos (all-time hits, fastest
// growers) — not just the recent ones. Gated by `performance_sorting` in future.
const SORT_OPTS: [SortKey, string][] = [
  ["views", "Best Performing (Most Views)"],
  ["outlier", "Biggest Outliers"],
  ["velocity", "Fastest Growing (Views/Day)"],
  ["recent", "Newest First"],
];

// ── Filter presets ──────────────────────────────────────────────────────────
// Each option carries a predicate; "any" = no constraint.
interface FilterOpt { label: string; test: (v: ExploreVideo) => boolean }
const DAY = 86400000;
const VIEW_FILTERS: FilterOpt[] = [
  { label: "Any views", test: () => true },
  { label: "10K+", test: (v) => v.views >= 10_000 },
  { label: "100K+", test: (v) => v.views >= 100_000 },
  { label: "500K+", test: (v) => v.views >= 500_000 },
  { label: "1M+", test: (v) => v.views >= 1_000_000 },
  { label: "5M+", test: (v) => v.views >= 5_000_000 },
  { label: "10M+", test: (v) => v.views >= 10_000_000 },
];
const SUB_FILTERS: FilterOpt[] = [
  { label: "Any subscribers", test: () => true },
  { label: "Under 10K", test: (v) => v.subs < 10_000 },
  { label: "Under 100K", test: (v) => v.subs < 100_000 },
  { label: "100K – 1M", test: (v) => v.subs >= 100_000 && v.subs < 1_000_000 },
  { label: "1M+", test: (v) => v.subs >= 1_000_000 },
];
const TIME_FILTERS: FilterOpt[] = [
  { label: "Any time", test: () => true },
  { label: "Last 24 hours", test: (v) => Date.now() - new Date(v.publishedAt).getTime() <= DAY },
  { label: "Last 7 days", test: (v) => Date.now() - new Date(v.publishedAt).getTime() <= 7 * DAY },
  { label: "Last 30 days", test: (v) => Date.now() - new Date(v.publishedAt).getTime() <= 30 * DAY },
  { label: "Last 3 months", test: (v) => Date.now() - new Date(v.publishedAt).getTime() <= 90 * DAY },
  { label: "Last year", test: (v) => Date.now() - new Date(v.publishedAt).getTime() <= 365 * DAY },
];
// Shorts-only tool: duration is a draggable min–max range within 0–3 min (180s),
// the max Shorts length.
const DUR_MIN = 0;
const DUR_MAX = 180; // 3 minutes — the Shorts cap

// Server-side pagination page size, and threshold maps that turn filter indices
// into the numeric query params the API expects.
const PAGE_SIZE = 60;
const VIEW_THRESH = [0, 10_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
const SUB_RANGE: [number, number][] = [[0, 0], [0, 10_000], [0, 100_000], [100_000, 1_000_000], [1_000_000, 0]];
const TIME_MS = [0, DAY, 7 * DAY, 30 * DAY, 90 * DAY, 365 * DAY];

// Map an API row (Postgres shape) → the ExploreVideo the cards use.
interface ApiVideo {
  video_id: string; title: string; channel_id: string; channel_name: string; channel_avatar: string | null;
  thumbnail: string; views: number; subs: number; published_at: string | null; duration_sec: number; outlier_x: number;
}
function mapVideo(v: ApiVideo): ExploreVideo {
  return {
    id: v.video_id, title: v.title, channelId: v.channel_id, channelName: v.channel_name,
    channelAvatar: v.channel_avatar, thumbnail: v.thumbnail, views: v.views, subs: v.subs,
    publishedAt: v.published_at ?? "", durationSec: v.duration_sec, outlierX: v.outlier_x,
    url: `https://www.youtube.com/watch?v=${v.video_id}`,
  };
}

function Icon({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function fmt(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function timeAgo(iso: string): string {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1d ago";
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return mo < 12 ? `${mo}mo ago` : `${Math.floor(mo / 12)}y ago`;
}
function dur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
// HD thumbnail (1280×720). Falls back to the stored one if maxres doesn't exist.
function hdThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
}

const ALL: NicheDef = { id: "all", label: "All Niches" };

// A compact filter dropdown (label + preset options). Index 0 = "any".
function FilterDropdown({ title, icon, options, value, onChange }: {
  title: string; icon: string; options: FilterOpt[]; value: number; onChange: (i: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  const active = value > 0;
  return (
    <div className="relative" ref={ref}>
      <p className="mb-2 text-[13.5px] font-semibold text-on-surface">{title}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex w-full items-center justify-between gap-2 rounded-none border px-4 py-3 text-[14px] font-medium transition-colors ${active ? "border-primary bg-primary-container text-on-primary-container" : "border-white/10 bg-black/25 text-on-surface hover:bg-black/40"}`}
      >
        <span className="inline-flex items-center gap-2 truncate"><Icon d={icon} size={14} />{options[value].label}</span>
        <Icon d="m6 9 6 6 6-6" size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-full min-w-[180px] overflow-hidden rounded-none border border-white/12 bg-[#0c0c0f] py-1">
          {options.map((o, i) => (
            <button
              key={o.label}
              onClick={() => { onChange(i); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] transition-colors hover:bg-surface-container-high ${i === value ? "font-semibold text-primary" : "text-on-surface"}`}
            >
              {i === value ? <Icon d="M20 6 9 17l-5-5" size={13} /> : <span className="w-[13px]" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Generic labeled select dropdown (for Sort by / Niche) — always shows the
// current choice; no "any/active" styling.
function SelectDropdown({ title, icon, options, value, onChange }: {
  title: string; icon: string; options: string[]; value: number; onChange: (i: number) => void;
}) {
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
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-none border border-white/10 bg-black/25 px-4 py-3 text-[14px] font-medium text-on-surface transition-colors hover:bg-black/40"
      >
        <span className="inline-flex items-center gap-2 truncate"><Icon d={icon} size={14} />{options[i]}</span>
        <Icon d="m6 9 6 6 6-6" size={14} />
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 max-h-[280px] w-full min-w-[180px] overflow-auto rounded-none border border-white/12 bg-[#0c0c0f] py-1">
          {options.map((o, idx) => (
            <button
              key={o}
              onClick={() => { onChange(idx); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3.5 py-2 text-left text-[13.5px] transition-colors hover:bg-white/[0.06] ${idx === i ? "font-semibold text-primary" : "text-on-surface"}`}
            >
              {idx === i ? <Icon d="M20 6 9 17l-5-5" size={13} /> : <span className="w-[13px]" />}
              <span className="truncate">{o}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Draggable dual-handle duration range (min–max seconds). Two overlaid range
// inputs; the top one owns whichever handle is nearer the pointer.
function DurationRange({ min, max, onChange }: {
  min: number; max: number; onChange: (min: number, max: number) => void;
}) {
  const STEP = 1;
  const active = min > DUR_MIN || max < DUR_MAX;
  const pct = (v: number) => ((v - DUR_MIN) / (DUR_MAX - DUR_MIN)) * 100;
  const setMin = (v: number) => onChange(Math.min(v, max - STEP), max);
  const setMax = (v: number) => onChange(min, Math.max(v, min + STEP));
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[13.5px] font-semibold text-on-surface">Duration</p>
        {active && (
          <button onClick={() => onChange(DUR_MIN, DUR_MAX)} className="text-[12px] font-semibold text-primary hover:underline">Reset</button>
        )}
      </div>
      <div className={`rounded-none border px-3.5 pb-3.5 pt-3 transition-colors ${active ? "border-primary bg-primary-container/40" : "border-white/12 bg-white/[0.03]"}`}>
        {/* Value readout */}
        <div className="mb-3 flex items-center justify-between text-[13px] font-semibold text-on-surface">
          <span className="inline-flex items-center gap-1"><Icon d="M12 8v4l3 2M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" size={13} />{dur(min)}</span>
          <span className="text-on-surface-variant">to</span>
          <span>{dur(max)}</span>
        </div>
        {/* Track + two thumbs */}
        <div className="relative h-5">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-container-high" />
          <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }} />
          <input
            type="range" min={DUR_MIN} max={DUR_MAX} step={STEP} value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="range-thumb pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent"
            style={{ zIndex: min > DUR_MAX - max ? 5 : 3 }}
            aria-label="Minimum duration"
          />
          <input
            type="range" min={DUR_MIN} max={DUR_MAX} step={STEP} value={max}
            onChange={(e) => setMax(Number(e.target.value))}
            className="range-thumb pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent"
            aria-label="Maximum duration"
          />
        </div>
        {/* Scale ticks */}
        <div className="mt-1 flex justify-between text-[10.5px] text-on-surface-variant">
          <span>0:00</span><span>1:00</span><span>2:00</span><span>3:00</span>
        </div>
        {/* Quick presets (all within the Shorts range) */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {([["≤ 15s", DUR_MIN, 15], ["≤ 30s", DUR_MIN, 30], ["≤ 60s", DUR_MIN, 60], ["1–3 min", 60, DUR_MAX]] as [string, number, number][]).map(([lbl, lo, hi]) => {
            const on = min === lo && max === hi;
            return (
              <button
                key={lbl}
                onClick={() => onChange(lo, hi)}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${on ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant hover:text-on-surface"}`}
              >
                {lbl}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VideoCard({ v }: { v: ExploreVideo }) {
  const transcriptHref = `/dashboard/shorts-transcript?url=${encodeURIComponent(v.url)}`;
  return (
    <div className="group flex flex-col overflow-hidden border border-white/[0.08] bg-[#0c0c0f] transition-colors hover:border-white/25">
      {/* Thumbnail */}
      <a href={v.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[9/16] overflow-hidden bg-black">
        {v.id || v.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.id ? hdThumb(v.id) : v.thumbnail}
            alt=""
            loading="lazy"
            onError={(e) => { const img = e.currentTarget; if (v.thumbnail && img.src !== v.thumbnail) img.src = v.thumbnail; }}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-on-surface-variant"><Icon d="M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" size={28} /></div>
        )}
        {/* open-in-new corner chip */}
        <span className="absolute left-2 top-2 flex size-7 items-center justify-center bg-black/55 text-white/90 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <Icon d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" size={14} />
        </span>
        {/* center play on hover */}
        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Icon d="M5 3l14 9-14 9V3z" size={18} />
          </span>
        </span>
        {v.durationSec > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">{dur(v.durationSec)}</span>
        )}
      </a>

      {/* Meta */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-on-surface">{v.title}</p>
        <div className="flex items-center gap-1.5 text-[12px] text-on-surface-variant">
          {v.channelAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={v.channelAvatar} alt="" className="h-4 w-4 shrink-0 rounded-full" />
          ) : null}
          <span className="truncate">{v.channelName}</span>
        </div>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-on-surface-variant">
          <span className="inline-flex items-center gap-1"><Icon d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" size={12} />{fmt(v.views)}</span>
          {v.outlierX >= 1 && (
            <span className="inline-flex items-center gap-1 rounded-none bg-primary-container px-1.5 py-0.5 font-semibold text-on-primary-container">
              <Icon d="M3 17l6-6 4 4 8-8M21 7v5h-5" size={12} />{v.outlierX.toFixed(1)}x
            </span>
          )}
          <span className="inline-flex items-center gap-1"><Icon d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={12} />{timeAgo(v.publishedAt)}</span>
        </div>
        <Link href={transcriptHref} className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-none border border-white/12 py-1.5 text-[12.5px] font-semibold text-on-surface transition-colors hover:bg-white/[0.06]">
          <Icon d="M4 7V4h16v3M9 20h6M12 4v16" size={13} /> Transcript
        </Link>
      </div>
    </div>
  );
}

export function Explore() {
  const { user } = useAuth();
  const [niches, setNiches] = useState<NicheDef[]>([]);
  const [active, setActive] = useState<string>("all");
  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [sort, setSort] = useState<SortKey>("views");
  // Filters (index into the preset arrays; 0 = "any").
  const [fViews, setFViews] = useState(0);
  const [fSubs, setFSubs] = useState(0);
  const [fTime, setFTime] = useState(0);
  const [durMin, setDurMin] = useState(DUR_MIN);
  const [durMax, setDurMax] = useState(DUR_MAX);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<"videos" | "channels">("videos");
  const [chSearch, setChSearch] = useState(""); // channel-tab search (rendered here, used by ExploreChannels)
  useEffect(() => { setMounted(true); }, []);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  const durActive = durMin > DUR_MIN || durMax < DUR_MAX;
  const anyFilter = fViews > 0 || fSubs > 0 || fTime > 0 || durActive;
  const clearFilters = () => { setFViews(0); setFSubs(0); setFTime(0); setDurMin(DUR_MIN); setDurMax(DUR_MAX); };

  // Build the API query from the active filters (server-side filtering/sort/paging).
  const buildParams = useCallback((offset: number): string => {
    const p = new URLSearchParams({ niche: active, sort, limit: String(PAGE_SIZE), offset: String(offset) });
    if (fViews > 0) p.set("minViews", String(VIEW_THRESH[fViews]));
    if (fSubs > 0) { const [lo, hi] = SUB_RANGE[fSubs]; if (lo) p.set("minSubs", String(lo)); if (hi) p.set("maxSubs", String(hi)); }
    if (fTime > 0) p.set("publishedAfter", String(Date.now() - TIME_MS[fTime]));
    if (durActive) { p.set("minDuration", String(durMin)); if (durMax < DUR_MAX) p.set("maxDuration", String(durMax)); }
    return p.toString();
  }, [active, sort, fViews, fSubs, fTime, durActive, durMin, durMax]);

  // Load the first page whenever niche/sort/filters change.
  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/explore?${buildParams(0)}`, { headers: await authHeader() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't load videos."); setVideos([]); setTotal(0); }
      else {
        setNiches(data.niches ?? []);
        setVideos((data.videos ?? []).map(mapVideo));
        setTotal(data.total ?? 0);
      }
    } catch { setError("Network error."); }
    setLoading(false);
  }, [user, authHeader, buildParams]);

  useEffect(() => { load(); }, [load]);

  // Load-more appends the next page.
  const loadMore = useCallback(async () => {
    if (!user || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/explore?${buildParams(videos.length)}`, { headers: await authHeader() });
      const data = await res.json();
      if (res.ok) setVideos((prev) => [...prev, ...(data.videos ?? []).map(mapVideo)]);
    } catch { /* ignore */ }
    setLoadingMore(false);
  }, [user, authHeader, buildParams, videos.length, loadingMore]);

  const options = [ALL, ...niches];

  // The filter panel is portaled to <body> so it escapes the dashboard `zoom`
  // transform (which makes position:fixed anchor to the zoomed container and
  // drift on scroll). Portaled + fixed = truly locked, full sidebar height.
  const railPanel = (
    <aside className="dashboard-dark fixed z-20 hidden w-[272px] flex-col overflow-y-auto border border-white/[0.08] bg-[#08080a] p-5 lg:flex" style={{ left: "calc(16rem + 15px)", top: "15px", height: "calc(100vh - 30px)" }}>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-white/55">Filters</p>
        {(anyFilter || sort !== "views" || active !== "all") && (
          <button onClick={() => { clearFilters(); setSort("views"); setActive("all"); }} className="text-[12.5px] font-semibold text-primary hover:underline">Clear</button>
        )}
      </div>
      <div className="flex flex-col gap-5">
        <SelectDropdown title="Sort by" icon="M3 6h18M7 12h10M11 18h2" value={SORT_OPTS.findIndex((s) => s[0] === sort)} options={SORT_OPTS.map((s) => s[1])} onChange={(i) => setSort(SORT_OPTS[i][0])} />
        <SelectDropdown title="Niche" icon="M4 6h16M6 12h12M9 18h6" value={options.findIndex((o) => o.id === active)} options={options.map((o) => o.label)} onChange={(i) => setActive(options[i].id)} />
        <FilterDropdown title="Views" icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" options={VIEW_FILTERS} value={fViews} onChange={setFViews} />
        <FilterDropdown title="Subscribers" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" options={SUB_FILTERS} value={fSubs} onChange={setFSubs} />
        <FilterDropdown title="Posted Time" icon="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" options={TIME_FILTERS} value={fTime} onChange={setFTime} />
        <DurationRange min={durMin} max={durMax} onChange={(lo, hi) => { setDurMin(lo); setDurMax(hi); }} />
      </div>
    </aside>
  );

  return (
    <div className="dash-fade-up w-full">
      {mounted && tab === "videos" && createPortal(railPanel, document.body)}
      <div className="flex gap-3.5">
      {/* Spacer holds the grid's left-column width (the panel itself is fixed/portaled).
          Sized so the grid clears the 272px real-px fixed panel (15px gaps) through 0.92 zoom. */}
      <div className="hidden w-[288px] shrink-0 lg:block" />

      {/* Main content */}
      <div className="min-w-0 flex-1">
      {/* Tabs — pulled up onto the topbar line (same row as the floating nav
          items / user menu). Offset accounts for <main>'s pt-20. */}
      <div className="flex items-center gap-3 lg:-mt-[68px]">
        <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#08080a]">
          {([
            ["videos", "Videos", "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z"],
            ["channels", "Channels", "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"],
          ] as const).map(([t, label, icon]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 px-7 py-2.5 text-[14.5px] font-semibold transition-all ${tab === t ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-white/[0.05] hover:text-on-surface"}`}
            >
              <Icon d={icon} size={16} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4 mt-4" />{/* spacer below the topbar row */}

      {tab === "channels" ? (
        <ExploreChannels search={chSearch} onSearch={setChSearch} />
      ) : (
      <>
      {/* Count badge (weekly-refresh countdown lives in the topbar). */}
      {!loading && (
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0c0c0f] py-1.5 pl-1.5 pr-3.5">
            <span className="inline-flex min-w-[30px] items-center justify-center rounded-md bg-primary px-2.5 py-1 text-[13px] font-bold tabular-nums text-on-primary">{fmt(total)}</span>
            <span className="text-[13px] font-medium text-on-surface-variant">videos match your filters</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-none border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-none border border-white/[0.08] bg-[#0c0c0f]">
              <div className="aspect-[9/16] animate-pulse bg-white/[0.05]" />
              <div className="space-y-2 p-3">
                <div className="h-3.5 w-full animate-pulse rounded bg-surface-container-high" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-surface-container-high" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 && !error ? (
        <div className="rounded-none border border-dashed border-white/12 py-16 text-center">
          {anyFilter ? (
            <>
              <p className="text-[15px] font-semibold text-on-surface">No videos match your filters</p>
              <p className="mt-1 text-[14px] text-on-surface-variant">Try loosening a filter.</p>
              <button onClick={clearFilters} className="mt-4 rounded-none border border-white/12 bg-white/[0.03] px-4 py-2 text-[13px] font-semibold text-on-surface transition-colors hover:bg-white/[0.06]">Clear filters</button>
            </>
          ) : (
            <>
              <p className="text-[15px] font-semibold text-on-surface">No videos yet</p>
              <p className="mt-1 text-[14px] text-on-surface-variant">The weekly refresh hasn&apos;t run yet. Videos will appear after the first crawl.</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {videos.map((v) => <VideoCard key={v.id} v={v} />)}
          </div>
          {videos.length < total && (
            <div className="mt-8 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore} className="rounded-none border border-white/12 bg-white/[0.03] px-5 py-2.5 text-[13.5px] font-semibold text-on-surface transition-colors hover:bg-white/[0.06] disabled:opacity-60">
                {loadingMore ? "Loading…" : `Load more (${fmt(total - videos.length)} left)`}
              </button>
            </div>
          )}
        </>
      )}
      </>
      )}
      </div>{/* /main content */}
      </div>{/* /flex row */}
    </div>
  );
}
