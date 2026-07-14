"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useCredits, CREDIT_COST, CreditIcon, UpgradeNudge, TRUST_CHANNEL_LIMIT } from "@/components/dashboard/CreditsContext";
import type { ScoreResult, CategoryScore } from "@/lib/scoring/engine";

// ── Types ──
interface ConnectedChannel {
  youtubeId: string;
  name: string;
  thumbnailUrl: string | null;
  customUrl: string | null;
  subscriberCount: number;
  videoCount: number;
}

const CATEGORY_META = {
  engagement: { label: "Engagement", weight: 28, icon: "M3 17l6-6 4 4 8-8M21 7v5h-5" },
  retention: { label: "Retention", weight: 27, icon: "M3 3v18h18M7 15l3-3 3 3 5-6" },
  upload: { label: "Consistency", weight: 20, icon: "M12 8v4l3 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" },
  authority: { label: "Authority", weight: 15, icon: "M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z" },
  velocity: { label: "Velocity", weight: 10, icon: "M13 2L3 14h7l-1 8 10-12h-7z" },
} as const;
type CategoryKey = keyof typeof CATEGORY_META;

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Connection cancelled. You can try again anytime.",
  token_failed: "Couldn't complete the Google connection. Please try again.",
  no_channel: "No YouTube channel found on that Google account.",
  session: "Your session expired. Please log in and try again.",
  server: "Something went wrong connecting. Please try again.",
};

const rs = (n: number) => Math.round(n);
function scoreHex(s: number) {
  if (s >= 75) return "#34d399"; // soft green
  if (s >= 60) return "#D02020"; // brand cyan
  if (s >= 45) return "#e0b341"; // soft amber
  return "#f87171";              // soft red
}
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// small uppercase tracked section label
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">{children}</p>;
}

// Skeleton shown while analyzing — mirrors the results layout so the page
// doesn't jump, with the brand letter-loader front and centre.
function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white ${className}`} />;
}
function ResultsSkeleton() {
  return (
    <div className="space-y-5">
      {/* hero with the brand loader */}
      <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
        <div className="flex flex-col items-center gap-5 py-4">
          <div className="loader-wrapper">
            {"Analyzing".split("").map((ch, i) => <span key={i} className="loader-letter">{ch}</span>)}
            <div className="gloader" />
          </div>
          <p className="text-[13px] font-medium text-on-surface-variant">Reading your private YouTube Analytics…</p>
        </div>
      </div>
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-4">
            <Sk className="h-2.5 w-16" />
            <Sk className="mt-4 h-6 w-12" />
            <Sk className="mt-2 h-2 w-20" />
          </div>
        ))}
      </div>
      {/* section blocks */}
      {[0, 1].map((i) => (
        <div key={i} className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
          <Sk className="h-3 w-32" />
          <div className="mt-5 space-y-3">
            <Sk className="h-10 w-full" />
            <Sk className="h-10 w-full" />
            <Sk className="h-10 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Score ring ──
function ScoreRing({ score, size = 132 }: { score: number | null; size?: number }) {
  const r = size / 2 - 9;
  const circ = 2 * Math.PI * r;
  const pct = score ?? 0;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E0E0E0" strokeWidth="7" />
        {score !== null && (
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={scoreHex(score)} strokeWidth="7" strokeDasharray={circ}
            strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.4,0,0.2,1)" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score === null ? (
          <span className="text-[13px] text-on-surface-variant">—</span>
        ) : (
          <>
            <span className="text-[34px] font-bold leading-none tracking-tight tabular-nums text-on-surface">{rs(score)}</span>
            <span className="text-[11px] text-on-surface-variant">/ 100</span>
          </>
        )}
      </div>
    </div>
  );
}

export function TrustScore() {
  const { user } = useAuth();
  const { handleInsufficient, refresh: refreshCredits, plan } = useCredits();
  const [channelLocked, setChannelLocked] = useState(false);
  const params = useSearchParams();

  const [channels, setChannels] = useState<ConnectedChannel[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [confidence, setConfidence] = useState<"high" | "medium" | "low" | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [warningTitle, setWarningTitle] = useState("");
  const [days, setDays] = useState<7 | 28 | 90>(90);
  const [openCat, setOpenCat] = useState<CategoryKey | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<ConnectedChannel | null>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // ── Manual inputs (data YouTube's API can't share) ──
  const [swipeRate, setSwipeRate] = useState("");
  const [communityStrikes, setCommunityStrikes] = useState("");
  const [copyrightStrikes, setCopyrightStrikes] = useState("");
  const [contentType, setContentType] = useState("");

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const token = await user?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [user]);

  const loadStatus = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/youtube/status", { headers: await authHeader() });
      const data = await res.json();
      const list: ConnectedChannel[] = data.channels ?? [];
      setChannels(list);
      // Keep the current selection if it still exists, else default to the first.
      setSelectedId((prev) =>
        prev && list.some((c) => c.youtubeId === prev) ? prev : list[0]?.youtubeId ?? null
      );
    } catch {
      setChannels([]);
    }
  }, [user, authHeader]);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  useEffect(() => {
    const err = params.get("yt_error");
    if (err) setError(ERROR_MESSAGES[err] ?? "Connection failed. Please try again.");
    if (params.get("yt_connected")) { setError(""); loadStatus(); }
  }, [params, loadStatus]);

  const connect = async () => {
    setError("");
    // Free users can connect only 1 channel; paid plans get more.
    const limit = TRUST_CHANNEL_LIMIT[plan] ?? 1;
    if ((channels?.length ?? 0) >= limit) { setChannelLocked(true); return; }
    try {
      const res = await fetch("/api/youtube/connect", { headers: await authHeader() });
      const data = await res.json();
      if (res.status === 403 || data.code === "UPGRADE_REQUIRED") { setChannelLocked(true); return; }
      if (data.url) window.location.href = data.url;
      else setError(data.error || "Couldn't start the connection.");
    } catch {
      setError("Couldn't start the connection. Please try again.");
    }
  };

  const confirmRemove = async () => {
    const youtubeId = pendingRemove?.youtubeId;
    setPendingRemove(null);
    if (!youtubeId) return;
    setError("");
    try {
      const res = await fetch("/api/youtube/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ channelId: youtubeId }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Couldn't remove the channel.");
      else {
        setResult(null);
        loadStatus();
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const analyze = async () => {
    setError("");
    setWarning("");
    setWarningTitle("");
    setAnalyzing(true);
    setResult(null);
    setConfidence(null);
    try {
      const manual = {
        swipeRate: swipeRate.trim() === "" ? undefined : Number(swipeRate),
        communityStrikes: communityStrikes === "" ? undefined : Number(communityStrikes),
        copyrightStrikes: copyrightStrikes === "" ? undefined : Number(copyrightStrikes),
        contentType: contentType || undefined,
      };
      const res = await fetch("/api/score/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ days, channelId: selectedId, manual }),
      });
      const data = await res.json();
      if (data.unsupported) {
        setWarning(data.error);
        setWarningTitle("No videos yet");
      } else if (!res.ok) {
        if (handleInsufficient(res, data)) { setAnalyzing(false); return; }
        setError(data.error || "Analysis failed. Please try again.");
      } else {
        setResult(data.score);
        setConfidence(data.confidence ?? null);
        refreshCredits();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setAnalyzing(false);
  };

  const ch = channels?.find((c) => c.youtubeId === selectedId) ?? channels?.[0] ?? null;
  const connected = !!(channels && channels.length > 0);

  // ── Stat cards (top-right row) ──
  const trend = result ? result.velocity.metrics.find((m) => m.key === "views_momentum")?.value ?? null : null;
  const avgViewPct = result ? result.retention.metrics.find((m) => m.key === "avg_view_percentage")?.value ?? null : null;
  const retention = result ? rs(result.retention.score) : null;

  return (
    <div className="dash-fade-up w-full overflow-x-hidden">
      {/* Channel-limit paywall modal */}
      {channelLocked && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setChannelLocked(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <UpgradeNudge
              title="Channel limit reached"
              body="Free accounts can connect 1 channel. Upgrade to a paid plan to score more channels."
            />
          </div>
        </div>
      )}
      {/* Header — page title lives in the fixed topbar */}
      <div className="mb-5">
        <p className="text-[14px] text-on-surface-variant">Connect your channel for a full Trust Score across 5 growth signals.</p>
      </div>

      {error && (
        <div className="mb-5 flex items-center gap-2 rounded-md border border-error/30 bg-error/10 px-4 py-3 text-[14px] font-medium text-error">
          <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={17} />
          {error}
        </div>
      )}

      {warning && (
        <div className="mb-5 flex items-start gap-2.5 rounded-md border border-[#d97706]/30 bg-[#d97706]/10 px-4 py-3.5 text-[14px] text-[#d97706]">
          <span className="mt-0.5 shrink-0 text-[#d97706]"><Icon d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01" size={18} /></span>
          <div>
            <p className="font-semibold">{warningTitle || "Can't analyze this channel"}</p>
            <p className="mt-0.5 leading-relaxed">{warning}</p>
          </div>
        </div>
      )}

      {/* ───── TOP BAR — channel picker + window + actions ───── */}
      <div className="mb-6 flex flex-col gap-3 border-b border-black pb-6 sm:flex-row sm:items-center sm:justify-between">
        <ChannelSwitcher
          channels={channels}
          selected={ch}
          open={switcherOpen}
          setOpen={setSwitcherOpen}
          onSelect={(id) => { if (id !== selectedId) { setSelectedId(id); setResult(null); setWarning(""); setError(""); } setSwitcherOpen(false); }}
          onConnect={connect}
          onRemove={(c) => setPendingRemove(c)}
        />
        {connected && (
          <div className="flex items-center gap-2.5">
            <Segmented value={String(days)} onChange={(v) => setDays(Number(v) as typeof days)} options={[{ v: "7", l: "7d" }, { v: "28", l: "28d" }, { v: "90", l: "90d" }]} />
            {result && (
              <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-1.5 rounded-none border border-black px-3.5 py-2 text-[13px] font-bold text-black transition-colors hover:bg-white">
                <Icon d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" size={15} /> Share
              </button>
            )}
            <button onClick={analyze} disabled={analyzing} className="btn-donate inline-flex items-center justify-center gap-2 !rounded-none !py-2 !text-[13px] disabled:opacity-50">
              <Icon d="M3 17l6-6 4 4 8-8M21 7v5h-5" size={15} /> {result ? "Re-analyze" : "Analyze"}
              <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] font-bold"><CreditIcon size={12} /> {CREDIT_COST.trustScore}</span>
            </button>
          </div>
        )}
      </div>

      {/* STATE 1 — analyzing */}
      {analyzing && <ResultsSkeleton />}

      {/* STATE 2 — no result yet */}
      {!analyzing && !result && (
        <div className="flex min-h-[440px] flex-col items-center justify-center rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-10 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-none bg-white text-black/70">
            <Icon d="M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z M9 12l2 2 4-4" size={30} />
          </span>
          <h3 className="mt-5 text-[20px] font-bold text-on-surface">
            {connected ? "Ready to check your Trust Score" : "Connect your channel to begin"}
          </h3>
          <p className="mt-2 max-w-[380px] text-[14px] leading-relaxed text-on-surface-variant">
            {connected
              ? "We'll read your private YouTube Analytics and score your channel across 5 growth signals."
              : "Securely connect your YouTube channel — read-only access to your Analytics."}
          </p>
          <button onClick={connected ? analyze : connect} className="btn-donate mt-6 inline-flex items-center justify-center gap-2 !rounded-none">
            {connected
              ? <><Icon d="M3 17l6-6 4 4 8-8M21 7v5h-5" size={16} /> Analyze channel <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[11px] font-bold"><CreditIcon size={12} /> {CREDIT_COST.trustScore}</span></>
              : <><Icon d="M12 5v14M5 12h14" size={16} /> Connect channel</>}
          </button>
        </div>
      )}

      {/* STATE 3 — results: full-width, score on top */}
      {!analyzing && result && (
        <div className="space-y-6">
          {/* HERO — big centered score */}
          <div className="relative overflow-hidden rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 px-6 py-10">
            {/* subtle score-colored glow behind the ring */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-3xl" style={{ background: scoreHex(result.overall) }} />
            <div className="relative flex flex-col items-center text-center">
              <ScoreRing score={result.overall} size={168} />
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <span className="text-[28px] font-extrabold text-on-surface">{result.label}</span>
                <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: `${scoreHex(result.overall)}1a`, color: scoreHex(result.overall) }}>
                  Grade {result.grade}
                </span>
                {confidence && <ConfidenceBadge level={confidence} />}
              </div>
              <p className="mt-3 max-w-[560px] text-[14px] leading-relaxed text-on-surface-variant">{result.trustMeaning}</p>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Trend" value={trend === null ? null : `${trend > 0 ? "+" : ""}${rs(trend)}%`} foot="views momentum" up={trend !== null && trend >= 0} />
            <StatCard label="Avg view %" value={avgViewPct === null ? null : `${avgViewPct.toFixed(0)}%`} foot="watched per Short" />
            <StatCard label="Retention" value={retention === null ? null : `${retention}`} foot="normalized" />
            <StatCard label="Last run" value="just now" foot={`${days}-day window`} muted />
          </div>

          {/* Two-column results grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* LEFT: focus + breakdown */}
            <div className="space-y-6">
              <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
                <Eyebrow>Focus this week</Eyebrow>
                <FocusBlock result={result} />
              </div>
              <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
                <h3 className="text-[16px] font-bold text-on-surface">Score breakdown</h3>
                <Breakdown result={result} openCat={openCat} setOpenCat={setOpenCat} />
              </div>
            </div>

            {/* RIGHT: recommendations + full metric breakdown */}
            <div className="space-y-6">
              {result.recommendations?.length > 0 && (
                <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
                  <h3 className="text-[16px] font-bold text-on-surface">Fine-tune accuracy</h3>
                  <p className="mt-1 text-[13px] text-on-surface-variant">What to improve to raise your Trust Score, ranked by impact.</p>
                  <div className="mt-4 space-y-3">
                    {result.recommendations.slice(0, 5).map((rec, i) => {
                      const color = rec.level === "critical" ? "#f87171" : rec.level === "warning" ? "#e0b341" : "#D02020";
                      return (
                        <div key={i} className="flex gap-3 rounded-none border border-black bg-white p-4">
                          <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-[14px] font-bold text-on-surface">{rec.title}</p>
                              {rec.impact > 0 && <span className="rounded-full bg-primary-container px-2 py-0.5 text-[11px] font-semibold text-on-primary-container">+{rec.impact} pts</span>}
                            </div>
                            <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">{rec.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <FullBreakdown result={result} />
            </div>
          </div>

          {/* Manual inputs — full width at the end */}
          <ManualInputs
            swipeRate={swipeRate} setSwipeRate={setSwipeRate}
            communityStrikes={communityStrikes} setCommunityStrikes={setCommunityStrikes}
            copyrightStrikes={copyrightStrikes} setCopyrightStrikes={setCopyrightStrikes}
            contentType={contentType} setContentType={setContentType}
            onSave={analyze} busy={analyzing} disabled={!connected}
          />
        </div>
      )}

      {/* Share card modal */}
      {shareOpen && result && (
        <ShareCard score={result} channelName={ch?.name ?? "Your channel"} onClose={() => setShareOpen(false)} />
      )}

      {/* Remove-channel confirm modal (in-app, not the browser alert) */}
      {pendingRemove && (
        <ConfirmModal
          title="Remove this channel?"
          message={`"${pendingRemove.name}" will be disconnected. You can reconnect it anytime.`}
          confirmLabel="Remove"
          onConfirm={confirmRemove}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </div>
  );
}

// In-app confirm dialog — portaled to <body> so the dashboard zoom transform
// doesn't push it off-screen. Replaces the native window.confirm().
function ConfirmModal({
  title, message, confirmLabel = "Confirm", onConfirm, onCancel,
}: { title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-[400px] rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/15 text-error">
            <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-extrabold text-black">{title}</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-on-surface-variant">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <button onClick={onCancel} className="rounded-none border border-black px-4 py-2.5 text-[14px] font-bold text-black transition-colors hover:bg-white">
            Cancel
          </button>
          <button onClick={onConfirm} className="rounded-none bg-error px-4 py-2.5 text-[14px] font-bold text-black transition-colors hover:bg-error/85">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Confidence badge (data completeness)
function ConfidenceBadge({ level }: { level: "high" | "medium" | "low" }) {
  const map = {
    high: { c: "#34d399", t: "High confidence" },
    medium: { c: "#e0b341", t: "Medium confidence" },
    low: { c: "#9ca3af", t: "Low confidence" },
  } as const;
  const { c, t } = map[level];
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: `${c}1a`, color: c }}>
      {level === "high" && <Icon d="M20 6 9 17l-5-5" size={13} />}
      {t}
    </span>
  );
}

// Full breakdown — every individual metric across all categories in a grid.
function FullBreakdown({ result }: { result: ScoreResult }) {
  const cats: CategoryKey[] = ["engagement", "retention", "upload", "authority", "velocity"];
  const all = cats.flatMap((k) => (result[k] as CategoryScore).metrics ?? []);
  return (
    <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
      <h3 className="text-[16px] font-bold text-on-surface">Full breakdown</h3>
      <p className="mt-1 text-[12px] text-on-surface-variant">Every signal we measured, scored 0–100.</p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {all.map((m) => (
          <div key={m.key} className="flex items-center justify-between rounded-none bg-white px-4 py-3">
            <span className="text-[13px] text-on-surface-variant">{m.name}</span>
            <span className="text-[15px] font-bold tabular-nums" style={{ color: scoreHex(m.score) }}>{rs(m.score)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ──
function StatCard({ label, value, foot, up, muted }: { label: string; value: string | null; foot: string; up?: boolean; muted?: boolean }) {
  return (
    <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-4">
      <Eyebrow>{label}</Eyebrow>
      <p className={`mt-3 text-[22px] font-bold tracking-tight tabular-nums ${value === null ? "text-on-surface-variant/40" : "text-on-surface"}`}>
        {value ?? "—"}
      </p>
      <p className={`mt-1 text-[11px] font-medium ${muted ? "text-on-surface-variant" : up ? "text-[#34d399]" : "text-on-surface-variant"}`}>{foot}</p>
    </div>
  );
}

// Compact channel picker for the top bar — shows the active channel and opens a
// dropdown to switch, remove, or add a channel.
function ChannelSwitcher({
  channels, selected, open, setOpen, onSelect, onConnect, onRemove,
}: {
  channels: ConnectedChannel[] | null;
  selected: ConnectedChannel | null;
  open: boolean;
  setOpen: (v: boolean) => void;
  onSelect: (id: string) => void;
  onConnect: () => void;
  onRemove: (c: ConnectedChannel) => void;
}) {
  const count = channels?.length ?? 0;

  if (!channels || channels.length === 0) {
    return (
      <button onClick={onConnect} className="btn-donate inline-flex items-center gap-2 !rounded-none !py-2.5 !text-[14px]">
        <Icon d="M12 5v14M5 12h14" size={16} /> Connect your channel
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 px-3 py-2 transition-colors hover:border-black"
      >
        {selected?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.thumbnailUrl} alt="" className="h-9 w-9 rounded-full" />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-on-primary">{selected?.name.charAt(0) ?? "?"}</span>
        )}
        <div className="min-w-0 text-left">
          <p className="truncate text-[14px] font-bold text-on-surface">{selected?.name ?? "Select channel"}</p>
          <p className="text-[11px] text-on-surface-variant">{selected ? `${fmtNum(selected.subscriberCount)} subscribers · ${fmtNum(selected.videoCount)} videos` : ""}</p>
        </div>
        <span className={`ml-1 text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}>
          <Icon d="M6 9l6 6 6-6" size={18} />
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-[320px] rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-2 shadow-2xl">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">Channels · {count}</p>
            <div className="max-h-[300px] space-y-1 overflow-y-auto">
              {channels.map((c) => {
                const isSel = c.youtubeId === selected?.youtubeId;
                return (
                  <div
                    key={c.youtubeId}
                    onClick={() => onSelect(c.youtubeId)}
                    className={`flex cursor-pointer items-center gap-3 rounded-none border p-2 transition-all ${
                      isSel ? "border-[#D02020]/60 bg-[#D02020]/10" : "border-transparent hover:border-black hover:bg-white"
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
                    {isSel && <span className="shrink-0 text-[#D02020]"><Icon d="M20 6 9 17l-5-5" size={15} /></span>}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(c); }}
                      title="Remove channel"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-error/10 hover:text-error"
                    >
                      <Icon d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button onClick={onConnect} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-none border border-dashed border-black py-2.5 text-[13px] font-medium text-black/60 transition-colors hover:bg-white hover:text-black/80">
              <Icon d="M12 5v14M5 12h14" size={15} /> Add another channel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Manual inputs the YouTube API can't provide — the creator reads these from
// YouTube Studio. Feeds swipe rate + strikes + content type into the score.
function ManualInputs({
  swipeRate, setSwipeRate,
  communityStrikes, setCommunityStrikes,
  copyrightStrikes, setCopyrightStrikes,
  contentType, setContentType,
  onSave, busy, disabled,
}: {
  swipeRate: string; setSwipeRate: (v: string) => void;
  communityStrikes: string; setCommunityStrikes: (v: string) => void;
  copyrightStrikes: string; setCopyrightStrikes: (v: string) => void;
  contentType: string; setContentType: (v: string) => void;
  onSave: () => void; busy: boolean; disabled: boolean;
}) {
  const fieldCls = "w-full rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 px-3.5 py-2.5 text-[14px] text-on-surface outline-none transition-colors focus:border-black";
  const strikeOpts = [0, 1, 2, 3];
  return (
    <div className="rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6">
      <p className="text-[13px] text-on-surface-variant">
        <span className="font-semibold text-[#e0b341]">Add data YouTube doesn&apos;t share via API</span> for a more accurate score.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">Swipe rate</span>
          <div className="relative">
            <input
              type="number" min={0} max={100} inputMode="decimal"
              value={swipeRate} onChange={(e) => setSwipeRate(e.target.value)}
              placeholder="—"
              className={`${fieldCls} pr-8 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">%</span>
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">Community strikes</span>
          <select value={communityStrikes} onChange={(e) => setCommunityStrikes(e.target.value)} className={fieldCls}>
            <option value="">—</option>
            {strikeOpts.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">Copyright strikes</span>
          <select value={copyrightStrikes} onChange={(e) => setCopyrightStrikes(e.target.value)} className={fieldCls}>
            <option value="">—</option>
            {strikeOpts.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">Content type</span>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={fieldCls}>
            <option value="">—</option>
            <option value="shorts">Shorts</option>
            <option value="long">Long-form</option>
            <option value="mixed">Mixed</option>
          </select>
        </label>
      </div>

      <button
        onClick={onSave}
        disabled={busy || disabled}
        className="btn-donate mt-5 inline-flex w-full items-center justify-center gap-2 !rounded-none !text-[14px] !font-bold disabled:opacity-50"
      >
        {busy ? "Recalculating…" : "Save & recalculate"}
      </button>
    </div>
  );
}

// Shareable Trust Score image modal. Portaled to <body> so it centers in the
// real viewport (the dashboard <main> uses a zoom transform, which otherwise
// anchors `position:fixed` to the wrong box and pushes the modal off-screen).
function ShareCard({ score, channelName, onClose }: { score: ScoreResult; channelName: string; onClose: () => void }) {
  const url = `/api/score/share-image?score=${rs(score.overall)}&name=${encodeURIComponent(channelName)}`;
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Lock body scroll while the modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const download = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `trustscore-${channelName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { /* ignore */ }
  };

  // Copy the actual PNG to the clipboard so pasting into Discord/Slack/etc drops
  // the IMAGE, not a link. Falls back to copying the link if the browser can't
  // put an image on the clipboard.
  const copyImage = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      } else {
        await navigator.clipboard.writeText(window.location.origin + url);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        await navigator.clipboard.writeText(window.location.origin + url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-white/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-auto w-full max-w-[420px] rounded-none border-2 border-black bg-white shadow-[5px_5px_0px_0px_#121212] md:border-4 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-black">Share your Trust Score</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-black/60 transition-colors hover:bg-white hover:text-black">
            <Icon d="M18 6 6 18M6 6l12 12" size={18} />
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Trust Score card" className="mt-4 w-full rounded-xl border border-black" />
        <div className="mt-4 flex gap-2">
          <button onClick={download} className="inline-flex flex-1 items-center justify-center gap-2 rounded-none border-2 border-black bg-[#D02020] px-4 py-2.5 text-[14px] font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#121212] transition-all duration-200 ease-out active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
            <Icon d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M8 12l4 4 4-4M12 2v14" size={16} /> Download
          </button>
          <button onClick={copyImage} className="inline-flex flex-1 items-center justify-center gap-2 rounded-none border border-black px-4 py-2.5 text-[14px] font-bold text-black transition-colors hover:bg-white">
            <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-4M4 9h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z"} size={16} />
            {copied ? "Copied!" : "Copy image"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="inline-flex rounded-full border border-outline-variant bg-surface-container-low p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${value === o.v ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}>
          {o.l}
        </button>
      ))}
    </div>
  );
}

function FocusBlock({ result }: { result: ScoreResult }) {
  const top = result.recommendations?.[0];
  return (
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold" style={{ background: `${scoreHex(result.overall)}1a`, color: scoreHex(result.overall) }}>
          {result.label} · {result.overall ? rs(result.overall) : 0}/100
        </span>
      </div>
      <p className="mt-3 text-[14px] leading-relaxed text-on-surface">{result.trustMeaning}</p>
      {top && (
        <div className="mt-4 rounded-none bg-white p-4">
          <p className="text-[14px] font-semibold text-on-surface">{top.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">{top.description}</p>
        </div>
      )}
    </div>
  );
}

function Breakdown({ result, openCat, setOpenCat }: { result: ScoreResult; openCat: CategoryKey | null; setOpenCat: (c: CategoryKey | null) => void }) {
  const cats: CategoryKey[] = ["engagement", "retention", "upload", "authority", "velocity"];
  return (
    <div className="mt-4 space-y-3">
      {cats.map((key) => {
        const cat = result[key] as CategoryScore;
        const meta = CATEGORY_META[key];
        const open = openCat === key;
        return (
          <div key={key} className="rounded-none border border-black bg-white">
            <button onClick={() => setOpenCat(open ? null : key)} className="flex w-full items-center gap-3 p-4">
              <span className="text-on-surface-variant"><Icon d={meta.icon} size={17} /></span>
              <span className="text-[14px] font-semibold text-on-surface">{meta.label}</span>
              <span className="text-[11px] text-on-surface-variant">{meta.weight}%</span>
              <div className="ml-auto flex items-center gap-3">
                <div className="hidden h-2 w-28 overflow-hidden rounded-full bg-surface-container-high sm:block">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${rs(cat.score)}%`, background: scoreHex(cat.score) }} />
                </div>
                <span className="text-[18px] font-bold tracking-tight tabular-nums" style={{ color: scoreHex(cat.score) }}>{rs(cat.score)}</span>
                <span className="text-on-surface-variant"><Icon d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} size={15} /></span>
              </div>
            </button>
            {open && (
              <div className="border-t border-outline-variant p-4">
                <p className="text-[13px] leading-relaxed text-on-surface-variant">{cat.summary}</p>
                {cat.metrics?.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {cat.metrics.map((m) => (
                      <div key={m.key} className="text-[13px]">
                        <div className="flex items-center justify-between">
                          <span className="text-on-surface-variant">{m.name}</span>
                          <span className="font-semibold tabular-nums" style={{ color: scoreHex(m.score) }}>{rs(m.score)}</span>
                        </div>
                        {m.recommendation && <p className="mt-0.5 text-[12px] leading-snug text-on-surface-variant/80">{m.recommendation}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
