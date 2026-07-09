"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import BorderGlow from "@/components/dashboard/BorderGlow";

interface Category { name: string; score: number; note: string }
interface AuditResult {
  channel: { title: string; handle: string; thumbnail: string; subscriberCount: number; videoCount: number };
  overall: number;
  grade: string;
  summary: string;
  categories: Category[];
  strengths: string[];
  improvements: string[];
  coachReview: string;
}

// ── Shared helpers (match Trust Score's design language) ──
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">{children}</p>;
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
// overall is /100
function overallHex(s: number) {
  if (s >= 75) return "#34d399";
  if (s >= 60) return "#01D4FF";
  if (s >= 45) return "#e0b341";
  return "#f87171";
}
// category score is /10
function catHex(s: number) {
  if (s >= 8) return "#34d399";
  if (s >= 6) return "#01D4FF";
  if (s >= 4) return "#e0b341";
  return "#f87171";
}

// Score ring (overall /100)
function ScoreRing({ score, size = 168 }: { score: number; size?: number }) {
  const stroke = 9;
  const r = size / 2 - stroke;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={overallHex(score)} strokeWidth={stroke} strokeDasharray={circ}
          strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[46px] font-extrabold leading-none tracking-tight tabular-nums text-on-surface">{Math.round(score)}</span>
        <span className="mt-1 text-[12px] text-on-surface-variant">/ 100</span>
      </div>
    </div>
  );
}

// Brand "Auditing" letter loader (shared Uiverse style, from globals.css).
function AuditingLoader({ progress }: { progress: string }) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center gap-6 rounded-none border border-white/10 bg-[#1B1D1F] p-10">
      <div className="loader-wrapper">
        {"Auditing".split("").map((ch, i) => <span key={i} className="loader-letter">{ch}</span>)}
        <div className="gloader" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-on-surface">{progress || "Processing…"}</p>
        <p className="mt-1.5 text-[12px] text-on-surface-variant">Downloading, transcribing & reviewing your best and worst Shorts — this takes 8–15 minutes.</p>
      </div>
    </div>
  );
}

export function ChannelAudit() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [channel, setChannel] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [isDeep, setIsDeep] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [channels, setChannels] = useState<{ youtubeId: string; name: string; thumbnailUrl: string | null; subscriberCount: number }[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/youtube/status", { headers: await authHeader() });
      const data = await res.json();
      setConnected(!!data.connected);
      const list = data.channels ?? [];
      setChannels(list);
      setSelectedChannelId((prev) => prev && list.some((c: { youtubeId: string }) => c.youtubeId === prev) ? prev : list[0]?.youtubeId ?? null);
    } catch {
      setConnected(false);
    }
  }, [user, authHeader]);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => {
    if (params.get("yt_connected")) loadStatus();
  }, [params, loadStatus]);
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const connectChannel = async () => {
    setError("");
    try {
      const res = await fetch("/api/youtube/connect", { headers: await authHeader() });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Couldn't start the connection.");
    } catch { setError("Couldn't start the connection."); }
  };

  const runConnectedAudit = async () => {
    if (running) return;
    setError(""); setWarning(""); setResult(null); setRunning(true); setProgress("Fetching your analytics…"); setIsDeep(true);
    try {
      const res = await fetch("/api/audit/connected", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ channelId: selectedChannelId ?? undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't start the deep audit."); setRunning(false); return; }
      poll(data.jobId);
    } catch {
      setError("Network error. Please try again."); setRunning(false);
    }
  };

  const runAudit = async () => {
    if (!channel.trim() || running) return;
    setError(""); setWarning(""); setResult(null); setRunning(true); setProgress("Starting…"); setIsDeep(false);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ channel: channel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Couldn't start the audit."); setRunning(false); return; }
      poll(data.jobId);
    } catch {
      setError("Network error. Please try again."); setRunning(false);
    }
  };

  const poll = (jobId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit/${jobId}`, { headers: await authHeader() });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Audit failed."); stop(); return; }
        setProgress(data.progress || "Processing…");
        if (data.status === "done") { setResult(data.result); stop(); }
        else if (data.status === "error") {
          if (data.unsupported === "no_videos") setWarning("This channel has no Shorts to audit. Post some Shorts first, then try again.");
          else if (data.unsupported === "longform_only") setWarning("This channel only has long-form videos. Channel Audit currently reviews Shorts only.");
          else setError(data.error || "Audit failed.");
          stop();
        }
      } catch {
        setError("Lost connection to the audit service."); stop();
      }
    }, 4000);
  };
  const stop = () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; setRunning(false); };

  return (
    <div className="dash-fade-up w-full overflow-x-hidden">
      {/* Intro */}
      <div className="mb-6">
        <p className="text-[14px] text-on-surface-variant">A full Shorts review — hooks, editing, voiceover, music &amp; captions — from your best 5 &amp; worst 5 Shorts.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-none border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-5 flex items-start gap-2.5 rounded-none border border-[#d97706]/30 bg-[#d97706]/10 px-4 py-3.5 text-[14px] text-[#d97706]">
          <span className="mt-0.5 shrink-0"><Icon d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={18} /></span>
          <div>
            <p className="font-semibold">Can&apos;t audit this channel</p>
            <p className="mt-0.5 leading-relaxed">{warning}</p>
          </div>
        </div>
      )}

      {/* STATE 1 — running */}
      {running && <AuditingLoader progress={progress} />}

      {/* STATE 2 — input (two ways to audit) */}
      {!running && !result && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Deep audit — your own channel */}
          <div className="flex flex-col rounded-none border border-white/10 bg-[#1B1D1F] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-[#01D4FF]/10 text-[#01D4FF]">
                <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z M9 12l2 2 4-4" size={22} />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[15px] font-bold text-on-surface">
                  Your own channel
                  <span className="rounded-full bg-[#01D4FF]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#01D4FF]">Deep</span>
                </p>
                <p className="text-[12px] text-on-surface-variant">Adds real private analytics</p>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-on-surface-variant">
              {connected
                ? "Combines the video review with your real retention, traffic sources & subscriber conversion."
                : "Connect your YouTube for a deep audit with your real retention, traffic & conversion data layered on top of the video review."}
            </p>

            {/* Connected channels — selectable */}
            {connected && channels.length > 0 && (
              <div className="mt-4 space-y-2">
                <Eyebrow>Select a channel to audit</Eyebrow>
                {channels.map((c) => {
                  const isSel = c.youtubeId === selectedChannelId;
                  return (
                    <button
                      key={c.youtubeId}
                      onClick={() => setSelectedChannelId(c.youtubeId)}
                      className={`flex w-full items-center gap-2.5 rounded-none border p-2.5 text-left transition-all ${
                        isSel ? "border-[#01D4FF]/60 bg-[#01D4FF]/10" : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.08]"
                      }`}
                    >
                      {c.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.thumbnailUrl} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-on-primary">{c.name.charAt(0)}</span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-on-surface">{c.name}</p>
                        <p className="text-[11px] text-on-surface-variant">{fmtNum(c.subscriberCount)} subs</p>
                      </div>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSel ? "border-[#01D4FF] bg-[#01D4FF] text-[#001014]" : "border-white/25"}`}>
                        {isSel && <Icon d="M20 6 9 17l-5-5" size={12} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex-1" />
            {connected ? (
              <button onClick={runConnectedAudit} disabled={running} className="btn-donate inline-flex w-full items-center justify-center gap-2 !rounded-none disabled:opacity-50">
                <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z M9 12l2 2 4-4" size={16} /> Run deep audit
              </button>
            ) : (
              <button onClick={connectChannel} className="btn-donate inline-flex w-full items-center justify-center gap-2 !rounded-none">
                <Icon d="M12 5v14M5 12h14" size={16} /> Connect YouTube
              </button>
            )}
          </div>

          {/* Public audit — any channel */}
          <div className="flex flex-col rounded-none border border-white/10 bg-[#1B1D1F] p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-none bg-white/[0.05] text-white/70">
                <Icon d="M21 21l-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-on-surface">Any public channel</p>
                <p className="text-[12px] text-on-surface-variant">By URL or @handle</p>
              </div>
            </div>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              disabled={running}
              placeholder="@ZackDFilms  ·  or a channel URL"
              className="mt-4 h-12 w-full rounded-none border border-white/10 bg-[#0f1113] px-4 text-[14px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant/60 focus:border-white/25 disabled:opacity-60"
            />
            <button onClick={runAudit} disabled={running || !channel.trim()} className="btn-donate mt-4 inline-flex w-full items-center justify-center gap-2 !rounded-none disabled:opacity-50">
              <Icon d="M21 21l-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" size={16} /> Run audit
            </button>
            <p className="mt-3 text-center text-[12px] text-on-surface-variant">Reviews the best 5 &amp; worst 5 Shorts. Takes 8–15 min.</p>
          </div>
        </div>
      )}

      {/* STATE 3 — result */}
      {!running && result && <Results r={result} deep={isDeep} onReset={() => { setResult(null); setChannel(""); }} />}
    </div>
  );
}

function Results({ r, deep, onReset }: { r: AuditResult; deep: boolean; onReset: () => void }) {
  return (
    <div className="space-y-6">
      {/* HERO — score on top */}
      <div className="relative overflow-hidden rounded-none border border-white/10 bg-[#1B1D1F] px-6 py-10">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-3xl" style={{ background: overallHex(r.overall) }} />
        <div className="relative flex flex-col items-center text-center">
          {/* channel identity */}
          <div className="mb-6 flex items-center gap-3">
            {r.channel.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.channel.thumbnail} alt="" className="h-10 w-10 rounded-full" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-[15px] font-bold text-on-primary">{r.channel.title.charAt(0)}</span>
            )}
            <div className="text-left">
              <p className="text-[15px] font-bold text-on-surface">{r.channel.title}</p>
              <p className="text-[12px] text-on-surface-variant">{fmtNum(r.channel.subscriberCount)} subscribers · {fmtNum(r.channel.videoCount)} videos</p>
            </div>
          </div>
          <ScoreRing score={r.overall} />
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <span className="rounded-full px-3 py-1 text-[14px] font-bold" style={{ background: `${overallHex(r.overall)}1a`, color: overallHex(r.overall) }}>
              Grade {r.grade}
            </span>
            {deep && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#01D4FF]/12 px-3 py-1 text-[12px] font-bold text-[#01D4FF]">
                <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z" size={13} /> Deep · real analytics
              </span>
            )}
          </div>
          {r.summary && <p className="mt-4 max-w-[620px] text-[14px] leading-relaxed text-on-surface-variant">{r.summary}</p>}
          <div className="mt-6">
            <button onClick={onReset} className="inline-flex items-center gap-2 rounded-none border border-white/15 px-5 py-2.5 text-[13px] font-bold text-white/85 transition-colors hover:bg-white/[0.06]">
              <Icon d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.7 3M3 4v4h4" size={15} /> Audit another
            </button>
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div>
        <h3 className="mb-3 text-[15px] font-bold text-on-surface">Breakdown</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {r.categories.map((c) => (
            <div key={c.name} className="rounded-none border border-white/10 bg-[#1B1D1F] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-on-surface">{c.name}</span>
                <span className="text-[16px] font-extrabold tabular-nums" style={{ color: catHex(c.score) }}>{c.score}<span className="text-[12px] text-on-surface-variant">/10</span></span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full" style={{ width: `${c.score * 10}%`, background: catHex(c.score) }} />
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">{c.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths + Improvements side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {r.strengths.length > 0 && (
          <div className="rounded-none border border-white/10 bg-[#1B1D1F] p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#34d399]">
              <Icon d="M20 6 9 17l-5-5" size={17} /> Strengths
            </h3>
            <ul className="mt-4 space-y-2.5">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-on-surface">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#34d399]" /> {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.improvements.length > 0 && (
          <div className="rounded-none border border-white/10 bg-[#1B1D1F] p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#e0b341]">
              <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" size={17} /> Top improvements
            </h3>
            <ol className="mt-4 space-y-3">
              {r.improvements.map((s, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-relaxed text-on-surface">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e0b341]/15 text-[12px] font-bold text-[#e0b341]">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Coach review — wrapped in the animated AI border glow */}
      {r.coachReview && (
        <BorderGlow borderRadius={0} backgroundColor="#1B1D1F" glowColor="0 0 100" glowIntensity={0.5} mesh>
          <div className="p-6">
            <h3 className="flex items-center gap-2 text-[15px] font-bold text-[#01D4FF]">
              <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={17} /> What NicheSpy AI thinks
            </h3>
            <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-on-surface">
              {r.coachReview.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </BorderGlow>
      )}
    </div>
  );
}
