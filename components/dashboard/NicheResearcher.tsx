"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

interface NicheDef { id: string; label: string }
interface ViralVideo { id: string; title: string; channelName: string; thumbnail: string; views: number; url: string; outlierX: number }
interface RankedChannel { channelId: string; name: string; avatar: string | null; subs: number; delta: number; deltaPct?: number; uploads?: number }
interface SubNiche {
  name: string; viralCount: number; viralRate: number; avgViews: number; totalViews: number;
  topOutlierX: number; topChannels: string[]; exampleTitle: string;
  opportunity: "hot" | "rising" | "saturated" | "untapped"; movement: number;
  titlePatterns: string[]; aiInsight: string; contentAngle: string;
  examples: { title: string; thumbnail: string; url: string; views: number; outlierX: number }[];
}
interface Recap {
  niche: string; label: string; updatedAt: number; trackedChannels: number;
  viewsGained: number; subsGained: number; newUploads: number; viralityRate: number;
  brief: string; viral: ViralVideo[]; resurging: ViralVideo[]; subNiches: SubNiche[];
  topSubGainers: RankedChannel[]; topViewGainers: RankedChannel[]; mostUploads: RankedChannel[];
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
function weekLabel(weekKey: string): string {
  const d = new Date(weekKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function NicheResearcher() {
  const { user } = useAuth();
  const [niches, setNiches] = useState<NicheDef[]>([]);
  const [active, setActive] = useState<string>("");   // "" = nothing picked yet
  const [recap, setRecap] = useState<Recap | null>(null);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(""); // "" = latest
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Load the niche list once (so the tabs render before a niche is picked).
  useEffect(() => {
    if (!user || niches.length) return;
    (async () => {
      try {
        const res = await fetch(`/api/niche-research?niche=${DEFAULT_NICHES[0].id}`, { headers: await authHeader() });
        const data = await res.json();
        if (res.ok && data.niches?.length) setNiches(data.niches);
      } catch { /* fall back to DEFAULT_NICHES */ }
    })();
  }, [user, niches.length, authHeader]);

  const load = useCallback(async (niche: string, week: string) => {
    if (!user || !niche) return;
    setLoading(true); setError("");
    try {
      const q = week ? `&week=${week}` : "";
      const res = await fetch(`/api/niche-research?niche=${niche}${q}`, { headers: await authHeader() });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't load."); }
      else { setNiches(data.niches ?? []); setRecap(data.recap ?? null); setWeeks(data.weeks ?? []); }
    } catch { setError("Network error."); }
    setLoading(false);
  }, [user, authHeader]);

  useEffect(() => { if (active) load(active, selectedWeek); }, [active, selectedWeek, load]);

  const tabNiches = niches.length ? niches : DEFAULT_NICHES;
  const picked = Boolean(active);

  return (
    <div className="dash-fade-up w-full">
      {/* Header — the page title lives in the fixed topbar (no duplicate H1). */}
      <p className="mb-4 text-[14.5px] text-on-surface-variant">What happened in every niche this week — virals, movers, and where the opportunity is.</p>

      {/* Niche tabs — sharp, full width, evenly spread */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {tabNiches.map((n) => (
          <button
            key={n.id}
            onClick={() => { setActive(n.id); setSelectedWeek(""); }}
            className={`rounded-none border px-4 py-3 text-[13.5px] font-semibold transition-colors ${
              active === n.id
                ? "border-primary bg-primary-container text-on-primary-container"
                : "border-white/10 bg-black/25 text-on-surface hover:border-white/25 hover:bg-black/40"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-none border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} /> {error}
        </div>
      )}

      {/* ── AI ANALYSIS panel ── */}
      <p className="mb-2 text-[13px] text-on-surface-variant">AI reads the whole niche and tells you exactly where the gap is.</p>
      <div className="relative overflow-hidden rounded-none border border-white/10 bg-white/[0.02] p-6">
        <p className="mb-4 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-primary">
          <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={14} /> AI Analysis
        </p>
        {picked && recap?.brief ? (
          <p className="text-[14px] leading-relaxed text-on-surface">{recap.brief}</p>
        ) : picked && loading ? (
          <SkeletonLines />
        ) : (
          <>
            <SkeletonLines dim />
            {/* Centered "pick a niche" overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-[#141317]/60 to-[#141317]/80">
              <div className="max-w-[420px] rounded-none border border-primary/25 bg-[#17161c] px-10 py-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                  <Icon d="M12 19V5M5 12l7-7 7 7" size={20} />
                </span>
                <p className="text-[17px] font-bold text-on-surface">Pick a niche to begin</p>
                <p className="mx-auto mt-2 max-w-[340px] text-[13.5px] leading-relaxed text-on-surface-variant">
                  Tap any niche above and we&apos;ll pull live opportunity data, the most underserved sub-niches, and what&apos;s trending right now.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── The rest only shows once a niche is picked ── */}
      {picked && (
        <>
          {/* Week history dropdown */}
          {weeks.length > 0 && (
            <div className="relative mt-5">
              <button
                onClick={() => setWeekMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-none border border-white/10 bg-white/[0.02] px-4 py-2.5 text-[13.5px] font-medium text-on-surface transition-colors hover:bg-white/[0.05]"
              >
                <Icon d="M12 8v4l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={15} />
                {selectedWeek ? `Week of ${weekLabel(selectedWeek)}` : "Latest week"}
                <Icon d="m6 9 6 6 6-6" size={15} />
              </button>
              {weekMenuOpen && (
                <div className="absolute z-20 mt-1.5 w-[240px] overflow-hidden rounded-none border border-white/10 bg-[#1a1a20] shadow-lg">
                  <button
                    onClick={() => { setSelectedWeek(""); setWeekMenuOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.05] ${!selectedWeek ? "font-semibold text-primary" : "text-on-surface"}`}
                  >
                    Latest week
                  </button>
                  {weeks.map((w) => (
                    <button
                      key={w}
                      onClick={() => { setSelectedWeek(w); setWeekMenuOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.05] ${selectedWeek === w ? "font-semibold text-primary" : "text-on-surface"}`}
                    >
                      Week of {weekLabel(w)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-primary" /></div>
          ) : !recap ? (
            <div className="mt-5 rounded-none border border-white/10 bg-white/[0.02] p-10 text-center">
              <p className="text-[16px] font-bold text-on-surface">No data yet for this niche</p>
              <p className="mx-auto mt-2 max-w-[440px] text-[14px] text-on-surface-variant">
                The first weekly refresh hasn&apos;t run for this niche yet. Once it does, the recap appears here.
              </p>
            </div>
          ) : (
            <>
              {/* Stats at a glance */}
              <p className="mb-3 mt-6 text-[13px] text-on-surface-variant">The numbers at a glance — channels, videos, and how often they go viral.</p>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" label="Channels" value={fmt(recap.trackedChannels)} foot="tracked in this niche" />
                <StatCard icon="M3 3v18h18M7 14l3-4 4 3 5-7" label="New Uploads" value={fmt(recap.newUploads)} foot="this week" up />
                <StatCard icon="M13 2L3 14h7l-1 8 10-12h-7z" label="Virality Rate" value={`${recap.viralityRate}%`} foot="hit 2x+ outlier" up={recap.viralityRate >= 4} />
                <StatCard icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" label="Views Gained" value={`+${fmt(recap.viewsGained)}`} foot={`across ${recap.trackedChannels} channels`} up />
              </div>

              {/* What's blowing up (last 14 days) */}
              {recap.viral.length > 0 && (
                <div className="mt-7">
                  <p className="mb-3 text-[13px] text-on-surface-variant">What&apos;s blowing up in this niche right now, from the last 14 days.</p>
                  <VideoGrid videos={recap.viral} />
                </div>
              )}

              {/* Resurging */}
              {recap.resurging?.length > 0 && (
                <div className="mt-7">
                  <p className="mb-3 flex items-center gap-1.5 text-[13px] text-on-surface-variant">
                    <Icon d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" size={14} />
                    Older videos gaining serious views again.
                  </p>
                  <VideoGrid videos={recap.resurging} />
                </div>
              )}

              {/* Channels of the week */}
              <div className="mt-8">
                <p className="mb-3 flex items-center gap-2 text-[16px] font-bold text-on-surface">
                  <Icon d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" size={18} />
                  Channels of the week
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  <RankColumn title="Top Sub Gainers" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" channels={recap.topSubGainers} render={(c) => `+${fmt(c.delta)}${c.deltaPct ? ` (${c.deltaPct.toFixed(1)}%)` : ""}`} />
                  <RankColumn title="Top View Gainers" icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" channels={recap.topViewGainers} render={(c) => `+${fmt(c.delta)}`} />
                  <RankColumn title="Most Uploads" icon="M12 16V4M7 9l5-5 5 5M5 20h14" channels={recap.mostUploads} render={(c) => `${c.uploads ?? 0} new`} />
                </div>
              </div>

              {/* Sub-niche breakdown — at the bottom */}
              {recap.subNiches?.length > 0 && (
                <div className="mt-8">
                  <p className="mb-1 text-[16px] font-bold text-on-surface">Sub-niche breakdown</p>
                  <p className="mb-3 text-[13px] text-on-surface-variant">Every sub-niche ranked by opportunity — <span className="text-[#34d399]">green is underserved</span>, <span className="text-[#f87171]">red is saturated</span>.</p>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {recap.subNiches.map((s) => <SubNicheCard key={s.name} s={s} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// Fallback niche tabs so the row renders instantly before the API responds.
const DEFAULT_NICHES: NicheDef[] = [
  { id: "commentary", label: "Commentary" }, { id: "ranking", label: "Ranking" },
  { id: "animation", label: "Animation" }, { id: "gaming", label: "Gaming" },
  { id: "captions_only", label: "Captions Only" }, { id: "edits_montages", label: "Edits/Montages" },
  { id: "memes", label: "Memes" },
];

// Skeleton lines for the AI Analysis panel (shimmer bars).
function SkeletonLines({ dim }: { dim?: boolean }) {
  return (
    <div className={`space-y-2.5 ${dim ? "opacity-40" : ""}`}>
      <div className="h-3 w-[92%] animate-pulse rounded bg-white/10" />
      <div className="h-3 w-[78%] animate-pulse rounded bg-white/10" />
      <div className="h-3 w-[85%] animate-pulse rounded bg-white/10" />
    </div>
  );
}

// Opportunity → color. Green = underserved (untapped/hot demand, few creators),
// red = saturated. Matches the "green is underserved, red is saturated" legend.
const OPP_STYLE: Record<string, { label: string; c: string; bg: string; border: string }> = {
  untapped: { label: "Untapped", c: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  hot: { label: "Hot", c: "#34d399", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)" },
  rising: { label: "Rising", c: "#4fc3f7", bg: "rgba(79,195,247,0.12)", border: "rgba(79,195,247,0.3)" },
  saturated: { label: "Saturated", c: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.35)" },
};

function SubNicheCard({ s }: { s: SubNiche }) {
  const opp = OPP_STYLE[s.opportunity] ?? OPP_STYLE.rising;
  return (
    <div className="rounded-none border p-5" style={{ borderColor: opp.border, background: "rgba(255,255,255,0.02)" }}>
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-on-surface">{s.name}</span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: opp.bg, color: opp.c }}>{opp.label}</span>
        {s.movement !== 0 && (
          <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${s.movement > 0 ? "text-[#34d399]" : "text-[#f87171]"}`}>
            <Icon d={s.movement > 0 ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} size={12} /> {Math.abs(s.movement)}% wk
          </span>
        )}
        <span className="ml-auto rounded-full bg-primary-container px-2.5 py-0.5 text-[12px] font-bold text-on-primary-container">{s.viralRate}% share</span>
      </div>

      {/* stat row */}
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-none bg-white/[0.03] p-3">
        <Stat label="Viral" value={`${s.viralCount}`} />
        <Stat label="Avg views" value={fmt(s.avgViews)} />
        <Stat label="Total" value={fmt(s.totalViews)} />
        <Stat label="Top hit" value={`${s.topOutlierX.toFixed(0)}x`} />
      </div>

      {/* AI insight + angle */}
      {s.aiInsight && (
        <div className="mt-3">
          <p className="text-[13px] leading-relaxed text-on-surface"><span className="font-semibold text-primary">Why it&apos;s winning: </span>{s.aiInsight}</p>
        </div>
      )}
      {s.contentAngle && (
        <div className="mt-2 flex gap-2 rounded-none border border-primary/20 bg-primary-container/20 p-3">
          <span className="mt-0.5 shrink-0 text-primary"><Icon d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" size={14} /></span>
          <p className="text-[13px] leading-relaxed text-on-surface"><span className="font-semibold text-primary">Try this: </span>{s.contentAngle}</p>
        </div>
      )}

      {/* patterns + channels */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {s.titlePatterns.length > 0 && (
          <span className="text-on-surface-variant">Patterns: {s.titlePatterns.map((p) => <span key={p} className="mr-1 inline-block rounded bg-surface-container-high px-1.5 py-0.5 font-semibold text-on-surface">{p}</span>)}</span>
        )}
        {s.topChannels.length > 0 && <span className="text-on-surface-variant">Driven by: <span className="font-semibold text-on-surface">{s.topChannels.join(", ")}</span></span>}
      </div>

      {/* example videos */}
      {s.examples.length > 0 && (
        <div className="mt-3 flex gap-2">
          {s.examples.map((e) => (
            <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="group relative block h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container-high">
              {e.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 text-[8px] font-bold text-white">{fmt(e.views)}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[15px] font-bold text-on-surface">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-on-surface-variant/70">{label}</p>
    </div>
  );
}

function VideoGrid({ videos }: { videos: ViralVideo[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {videos.slice(0, 12).map((v) => (
        <div key={v.id} className="group overflow-hidden rounded-none border border-white/10 bg-white/[0.02] transition-colors hover:border-white/25">
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="block">
            <div className="relative aspect-[9/12] bg-white/[0.04]">
              {v.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnail} alt="" className="h-full w-full object-cover" />
              )}
              <span className="absolute right-1.5 top-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">{v.outlierX.toFixed(1)}x</span>
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">{fmt(v.views)}</span>
            </div>
          </a>
          <div className="p-2">
            <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-on-surface">{v.title}</p>
            <p className="mt-0.5 truncate text-[10px] text-on-surface-variant">{v.channelName}</p>
            <a
              href={`/dashboard/shorts-transcript?url=${encodeURIComponent(v.url)}`}
              className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-white/12 px-2 py-1 text-[10px] font-semibold text-on-surface-variant transition-colors hover:bg-white/[0.05] hover:text-on-surface"
            >
              <Icon d="M4 7V4h16v3M9 20h6M12 4v16" size={11} /> Transcript
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ icon, label, value, foot, up }: { icon: string; label: string; value: string; foot: string; up?: boolean }) {
  return (
    <div className="rounded-none border border-white/10 bg-white/[0.02] p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
        <Icon d={icon} size={13} /> {label}
      </p>
      <p className="mt-2 font-mono text-[24px] font-bold tracking-tight text-on-surface">{value}</p>
      <p className={`mt-1 text-[11px] ${up ? "text-[#34d399]" : "text-on-surface-variant"}`}>{foot}</p>
    </div>
  );
}

function RankColumn({ title, icon, channels, render }: { title: string; icon: string; channels: RankedChannel[]; render: (c: RankedChannel) => string }) {
  return (
    <div className="rounded-none border border-white/10 bg-white/[0.02] p-5">
      <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
        <Icon d={icon} size={14} /> {title}
      </p>
      {channels.length === 0 ? (
        <p className="py-3 text-[13px] text-on-surface-variant">No movement this week.</p>
      ) : (
        <div className="space-y-2.5">
          {channels.map((c) => (
            <div key={c.channelId} className="flex items-center gap-2.5">
              {c.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full" />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-on-primary">{c.name.charAt(0)}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-on-surface">{c.name}</p>
                <p className="text-[11px] text-on-surface-variant">{fmt(c.subs)} subs</p>
              </div>
              <span className="shrink-0 font-mono text-[13px] font-bold text-[#34d399]">{render(c)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
