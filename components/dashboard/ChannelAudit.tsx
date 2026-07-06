"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

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

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
function scoreColor(s: number) {
  // s is /10
  if (s >= 8) return "#16a34a";
  if (s >= 6) return "#0FA5E9";
  if (s >= 4) return "#d97706";
  return "#e11d48";
}
function gradeColor(g: string) {
  if (g.startsWith("A")) return "#16a34a";
  if (g.startsWith("B")) return "#0FA5E9";
  if (g.startsWith("C")) return "#d97706";
  return "#e11d48";
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
  const [connectedName, setConnectedName] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Check if the user has a connected YouTube channel (for the deep audit).
  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/youtube/status", { headers: await authHeader() });
      const data = await res.json();
      setConnected(!!data.connected);
      setConnectedName(data.channels?.[0]?.name ?? "");
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

  // Deep audit of the user's own connected channel (real analytics + video-ML).
  const runConnectedAudit = async () => {
    if (running) return;
    setError(""); setWarning(""); setResult(null); setRunning(true); setProgress("Fetching your analytics…"); setIsDeep(true);
    try {
      const res = await fetch("/api/audit/connected", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({}),
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
    <div className="mx-auto max-w-[1000px]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-on-surface">Channel Audit</h1>
        <p className="mt-1 text-[15px] text-on-surface-variant">A full Shorts review — hooks, editing, voiceover, music &amp; captions, from your best 5 &amp; worst 5 Shorts.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#d97706]/30 bg-[#d97706]/10 px-4 py-3.5 text-[14px] text-[#92400e]">
          <span className="mt-0.5 shrink-0 text-[#d97706]"><Icon d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={18} /></span>
          <div>
            <p className="font-semibold">Can&apos;t audit this channel</p>
            <p className="mt-0.5 leading-relaxed">{warning}</p>
          </div>
        </div>
      )}

      {/* Input */}
      {!result && (
        <div className="space-y-5">
          {/* Option 1: Connect your own channel — DEEP audit (real analytics) */}
          <div className="rounded-3xl border border-outline-variant bg-surface p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fde8e8] text-[#dc2626]">
                <Icon d="M22 8.5c0-1.4-.1-2.4-.3-3-.2-.7-.7-1.2-1.4-1.4C18.9 3.7 12 3.7 12 3.7s-6.9 0-8.3.4c-.7.2-1.2.7-1.4 1.4-.2.6-.3 1.6-.3 3v3c0 1.4.1 2.4.3 3 .2.7.7 1.2 1.4 1.4 1.4.4 8.3.4 8.3.4s6.9 0 8.3-.4c.7-.2 1.2-.7 1.4-1.4.2-.6.3-1.6.3-3v-3zM10 14V7l6 3.5-6 3.5z" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-on-surface">Audit your own channel <span className="ml-1.5 rounded-full bg-primary-container px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-on-primary-container">Deep</span></p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-on-surface-variant">
                  {connected
                    ? `Connected: ${connectedName || "your channel"}. Adds REAL analytics — retention, CTR, traffic sources & subscriber conversion.`
                    : "Connect your YouTube for a deep audit with real retention, CTR & traffic data."}
                </p>
              </div>
              {connected ? (
                <button onClick={runConnectedAudit} disabled={running} className="m3-btn-filled inline-flex items-center gap-2 disabled:opacity-60">
                  {running && isDeep ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {progress}</>
                  ) : (
                    <><Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" size={16} /> Deep Audit</>
                  )}
                </button>
              ) : (
                <button onClick={connectChannel} disabled={running} className="m3-btn-tonal inline-flex items-center gap-2">
                  Connect YouTube
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[12px] font-medium text-on-surface-variant/60">
            <span className="h-px flex-1 bg-outline-variant" /> or audit any public channel <span className="h-px flex-1 bg-outline-variant" />
          </div>

          {/* Option 2: Public URL/handle audit (kept as-is; free later) */}
          <div className="rounded-3xl border border-outline-variant bg-surface p-6">
            <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Any channel by URL or @handle</label>
            <input
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAudit()}
              disabled={running}
              placeholder="@ZackDFilms  ·  or a channel URL"
              className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[15px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary disabled:opacity-60"
            />
            <button onClick={runAudit} disabled={running || !channel.trim()} className="m3-btn-filled mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">
              {running && !isDeep ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> {progress}</>
              ) : (
                <><Icon d="M21 21l-4-4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14z" size={16} /> Run Audit</>
              )}
            </button>
            <p className="mt-3 text-center text-[12px] text-on-surface-variant">
              Analyzes the channel&apos;s best 5 &amp; worst 5 Shorts — downloads, transcribes, and reviews them. Takes 8–15 minutes.
            </p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && <Results r={result} deep={isDeep} onReset={() => { setResult(null); setChannel(""); }} />}
    </div>
  );
}

function Results({ r, deep, onReset }: { r: AuditResult; deep: boolean; onReset: () => void }) {
  return (
    <div className="space-y-5">
      {deep && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-container/30 px-4 py-2.5 text-[13px] font-semibold text-on-primary-container">
          <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z" size={16} />
          Deep audit — includes your real private analytics (retention, CTR, traffic).
        </div>
      )}
      {/* Channel header */}
      <div className="rounded-3xl border border-outline-variant bg-surface p-6">
        <div className="flex flex-wrap items-center gap-4">
          {r.channel.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={r.channel.thumbnail} alt="" className="h-14 w-14 rounded-full" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">{r.channel.title.charAt(0)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[20px] font-bold text-on-surface">{r.channel.title}</p>
            <p className="text-[13px] text-on-surface-variant">{fmtNum(r.channel.subscriberCount)} subscribers · {fmtNum(r.channel.videoCount)} videos</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[30px] font-bold leading-none" style={{ color: gradeColor(r.grade) }}>{r.grade}</span>
              <span className="font-mono text-[18px] font-semibold text-on-surface-variant">{r.overall}/100</span>
            </div>
          </div>
        </div>
        {r.summary && <p className="mt-4 rounded-2xl bg-surface-container-low p-4 text-[14px] leading-relaxed text-on-surface">{r.summary}</p>}
      </div>

      {/* Category cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {r.categories.map((c) => (
          <div key={c.name} className="rounded-2xl border border-outline-variant bg-surface p-5">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-bold text-on-surface">{c.name}</span>
              <span className="font-mono text-[18px] font-bold" style={{ color: scoreColor(c.score) }}>{c.score}/10</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
              <div className="h-full rounded-full" style={{ width: `${c.score * 10}%`, background: scoreColor(c.score) }} />
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-on-surface-variant">{c.note}</p>
          </div>
        ))}
      </div>

      {/* Strengths */}
      {r.strengths.length > 0 && (
        <div className="rounded-3xl border border-outline-variant bg-surface p-6">
          <h3 className="text-[15px] font-bold text-[#16a34a]">Strengths</h3>
          <ul className="mt-3 space-y-1.5">
            {r.strengths.map((s, i) => (
              <li key={i} className="flex gap-2 text-[14px] text-on-surface"><span className="text-[#16a34a]">+</span> {s}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvements */}
      {r.improvements.length > 0 && (
        <div className="rounded-3xl border border-[#d97706]/30 bg-[#d97706]/[0.06] p-6">
          <h3 className="text-[15px] font-bold text-[#b45309]">Top Improvements</h3>
          <ol className="mt-3 space-y-2">
            {r.improvements.map((s, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-on-surface">
                <span className="font-bold text-[#b45309]">{i + 1}.</span> {s}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Coach review */}
      {r.coachReview && (
        <div className="rounded-3xl border border-outline-variant bg-surface p-6">
          <h3 className="flex items-center gap-2 text-[15px] font-bold text-primary">
            <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={17} /> What NicheSpy AI thinks
          </h3>
          <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-on-surface">
            {r.coachReview.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      )}

      <button onClick={onReset} className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-5 py-2.5 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
        <Icon d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6.7 3M3 4v4h4" size={15} /> Audit another channel
      </button>
    </div>
  );
}
