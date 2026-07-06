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
function timeAgo(ts: number): string {
  const d = Math.floor((Date.now() - ts) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}
function weekLabel(weekKey: string): string {
  const d = new Date(weekKey + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function NicheResearcher() {
  const { user } = useAuth();
  const [niches, setNiches] = useState<NicheDef[]>([]);
  const [active, setActive] = useState<string>("commentary");
  const [recap, setRecap] = useState<Recap | null>(null);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<string>(""); // "" = latest
  const [weekMenuOpen, setWeekMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  const load = useCallback(async (niche: string, week: string) => {
    if (!user) return;
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

  useEffect(() => { load(active, selectedWeek); }, [active, selectedWeek, load]);

  return (
    <div className="mx-auto max-w-[1180px]">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-[26px] font-bold text-on-surface">Niche Researcher</h1>
        <p className="mt-1 text-[15px] text-on-surface-variant">What happened in every niche this week — virals, movers, and where the opportunity is.</p>
      </div>

      {/* Niche tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(niches.length ? niches : [{ id: active, label: active }]).map((n) => (
          <button
            key={n.id}
            onClick={() => { setActive(n.id); setSelectedWeek(""); }}
            className={`rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
              active === n.id
                ? "border-primary bg-primary text-on-primary"
                : "border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-outline-variant border-t-primary" /></div>
      ) : !recap ? (
        <div className="rounded-3xl border border-outline-variant bg-surface p-10 text-center">
          <p className="text-[16px] font-bold text-on-surface">No data yet for this niche</p>
          <p className="mx-auto mt-2 max-w-[440px] text-[14px] text-on-surface-variant">
            This niche hasn&apos;t been set up with tracked channels yet, or the first weekly refresh hasn&apos;t run. Once channels are added, the weekly recap appears here.
          </p>
        </div>
      ) : (
        <>
          {/* Sub-header */}
          <div className="mb-3">
            <p className="text-[17px] font-bold text-on-surface">{selectedWeek ? recap.label : `This week in ${recap.label}`}</p>
            <p className="text-[12px] text-on-surface-variant">Updated {timeAgo(recap.updatedAt)} · {recap.trackedChannels} tracked channels · a fresh recap every week</p>
          </div>

          {/* Week history dropdown */}
          {weeks.length > 0 && (
            <div className="relative mb-5">
              <button
                onClick={() => setWeekMenuOpen((o) => !o)}
                className="flex w-full items-center gap-2.5 rounded-xl border border-outline-variant bg-surface px-4 py-3 text-[14px] font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              >
                <Icon d="M12 8v4l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={16} />
                {selectedWeek ? `Week of ${weekLabel(selectedWeek)}` : "Latest week"}
                <Icon d="m6 9 6 6 6-6" size={16} />
              </button>
              {weekMenuOpen && (
                <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-lg">
                  <button
                    onClick={() => { setSelectedWeek(""); setWeekMenuOpen(false); }}
                    className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-container-high ${!selectedWeek ? "font-semibold text-primary" : "text-on-surface"}`}
                  >
                    Latest week
                  </button>
                  {weeks.map((w) => (
                    <button
                      key={w}
                      onClick={() => { setSelectedWeek(w); setWeekMenuOpen(false); }}
                      className={`block w-full px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-surface-container-high ${selectedWeek === w ? "font-semibold text-primary" : "text-on-surface"}`}
                    >
                      Week of {weekLabel(w)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" label="Views Gained" value={`+${fmt(recap.viewsGained)}`} foot={`across ${recap.trackedChannels} tracked channels`} up />
            <StatCard icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" label="Subs Gained" value={`+${fmt(recap.subsGained)}`} foot="net across the niche" up />
            <StatCard icon="M3 3v18h18M7 14l3-4 4 3 5-7" label="New Uploads" value={fmt(recap.newUploads)} foot="this week" up />
            <StatCard icon="M13 2L3 14h7l-1 8 10-12h-7z" label="Virality Rate" value={`${recap.viralityRate}%`} foot="of new uploads hit 2x+ outlier" up={recap.viralityRate >= 4} />
          </div>

          {/* This week's brief */}
          {recap.brief && (
            <div className="mt-5 rounded-3xl border border-primary/20 bg-primary-container/20 p-6">
              <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-primary">
                <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={15} /> This week&apos;s brief
              </p>
              <p className="text-[14px] leading-relaxed text-on-surface">{recap.brief}</p>
            </div>
          )}

          {/* Viral this week */}
          {recap.viral.length > 0 && (
            <VideoGrid
              title="🔥 Viral this week"
              subtitle="New uploads that exploded this week"
              videos={recap.viral}
            />
          )}

          {/* Resurging */}
          {recap.resurging?.length > 0 && (
            <VideoGrid
              title="🔄 Resurging"
              subtitle="Older videos gaining serious views again"
              videos={recap.resurging}
            />
          )}

          {/* Channels of the week */}
          <div className="mt-7">
            <p className="mb-3 flex items-center gap-2 text-[16px] font-bold text-on-surface">🏆 Channels of the week <span className="text-[13px] font-normal text-on-surface-variant">Who gained the most this week</span></p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <RankColumn title="Top Sub Gainers" icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" channels={recap.topSubGainers} render={(c) => `+${fmt(c.delta)}${c.deltaPct ? ` (${c.deltaPct.toFixed(1)}%)` : ""}`} />
              <RankColumn title="Top View Gainers" icon="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" channels={recap.topViewGainers} render={(c) => `+${fmt(c.delta)}`} />
              <RankColumn title="Most Uploads" icon="M12 16V4M7 9l5-5 5 5M5 20h14" channels={recap.mostUploads} render={(c) => `${c.uploads ?? 0} new`} />
            </div>
          </div>

          {/* Sub-niche breakdown */}
          {recap.subNiches?.length > 0 && (
            <div className="mt-7">
              <p className="flex items-center gap-2 text-[16px] font-bold text-on-surface">
                <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" size={17} /> Sub-niche breakdown
              </p>
              <p className="mb-3 mt-0.5 text-[13px] text-on-surface-variant">Every sub-niche — viral rate, opportunity, winning patterns, and the exact angle to try.</p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {recap.subNiches.map((s) => <SubNicheCard key={s.name} s={s} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const OPP_STYLE: Record<string, { label: string; c: string; bg: string }> = {
  hot: { label: "Hot", c: "#dc2626", bg: "#fee2e2" },
  untapped: { label: "Untapped", c: "#7c3aed", bg: "#f1e9fe" },
  rising: { label: "Rising", c: "#0FA5E9", bg: "#e0f2fe" },
  saturated: { label: "Saturated", c: "#d97706", bg: "#fef3c7" },
};

function SubNicheCard({ s }: { s: SubNiche }) {
  const opp = OPP_STYLE[s.opportunity] ?? OPP_STYLE.rising;
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-5">
      {/* header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[15px] font-bold text-on-surface">{s.name}</span>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: opp.bg, color: opp.c }}>{opp.label}</span>
        {s.movement !== 0 && (
          <span className={`text-[11px] font-semibold ${s.movement > 0 ? "text-[#16a34a]" : "text-[#dc2626]"}`}>
            {s.movement > 0 ? "▲" : "▼"} {Math.abs(s.movement)}% wk
          </span>
        )}
        <span className="ml-auto rounded-full bg-primary-container px-2.5 py-0.5 text-[12px] font-bold text-on-primary-container">{s.viralRate}% share</span>
      </div>

      {/* stat row */}
      <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl bg-surface-container-low p-3">
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
        <div className="mt-2 rounded-xl border border-primary/20 bg-primary-container/20 p-3">
          <p className="text-[13px] leading-relaxed text-on-surface"><span className="font-semibold text-primary">💡 Try this: </span>{s.contentAngle}</p>
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

function VideoGrid({ title, subtitle, videos }: { title: string; subtitle: string; videos: ViralVideo[] }) {
  return (
    <div className="mt-6">
      <p className="mb-3 flex flex-wrap items-center gap-2 text-[16px] font-bold text-on-surface">
        {title} <span className="text-[13px] font-normal text-on-surface-variant">{subtitle}</span>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {videos.slice(0, 12).map((v) => (
          <div key={v.id} className="group overflow-hidden rounded-2xl border border-outline-variant bg-surface transition-shadow hover:shadow-lg">
            <a href={v.url} target="_blank" rel="noopener noreferrer" className="block">
              <div className="relative aspect-[9/12] bg-surface-container-high">
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
                className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-outline-variant px-2 py-1 text-[10px] font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                <Icon d="M4 7V4h16v3M9 20h6M12 4v16" size={11} /> Transcript
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, foot, up }: { icon: string; label: string; value: string; foot: string; up?: boolean }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
        <Icon d={icon} size={13} /> {label}
      </p>
      <p className="mt-2 font-mono text-[24px] font-bold tracking-tight text-on-surface">{value}</p>
      <p className={`mt-1 text-[11px] ${up ? "text-[#16a34a]" : "text-on-surface-variant"}`}>{foot}</p>
    </div>
  );
}

function RankColumn({ title, icon, channels, render }: { title: string; icon: string; channels: RankedChannel[]; render: (c: RankedChannel) => string }) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-5">
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
              <span className="shrink-0 font-mono text-[13px] font-bold text-[#16a34a]">{render(c)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
