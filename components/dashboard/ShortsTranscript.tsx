"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function ShortsTranscript() {
  const { user } = useAuth();
  const params = useSearchParams();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [copied, setCopied] = useState(false);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Prefill from ?url= (e.g. the "Transcript" button in Niche Researcher).
  useEffect(() => {
    const u = params.get("url");
    if (u) setUrl(u);
  }, [params]);

  const getTranscript = async () => {
    if (!url.trim() || busy) return;
    setError(""); setWarning(""); setTranscript(""); setTitle(""); setThumbnail(null); setBusy(true);
    try {
      const res = await fetch("/api/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (data.unsupported === "not_short") {
        setWarning(data.error);
      } else if (!res.ok) {
        setError(data.error || "Couldn't get the transcript.");
      } else {
        setTranscript(data.transcript);
        setTitle(data.title || "");
        setThumbnail(data.thumbnail || null);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(transcript); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="mx-auto max-w-[760px]">
      {/* Title */}
      <div className="mb-7 text-center">
        <h1 className="text-[30px] font-bold text-on-surface">Shorts Transcript</h1>
        <p className="mt-1.5 text-[15px] text-on-surface-variant">Paste a YouTube Shorts link and get its full transcript.</p>
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
            <p className="font-semibold">Shorts only</p>
            <p className="mt-0.5 leading-relaxed">{warning}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="rounded-3xl border border-outline-variant bg-surface p-6">
        <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">YouTube Shorts URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && getTranscript()}
          disabled={busy}
          placeholder="https://www.youtube.com/shorts/…"
          className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[15px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary disabled:opacity-60"
        />
        <button onClick={getTranscript} disabled={busy || !url.trim()} className="m3-btn-filled mt-4 inline-flex w-full items-center justify-center gap-2 disabled:opacity-60">
          {busy ? (
            <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Getting transcript…</>
          ) : (
            <><Icon d="M4 7V4h16v3M9 20h6M12 4v16" size={16} /> Get transcript</>
          )}
        </button>
        {busy && <p className="mt-2 text-center text-[12px] text-on-surface-variant">If the Short has no captions we transcribe the audio — that can take 10–30s.</p>}
      </div>

      {/* Result */}
      {transcript && (
        <div className="mt-6 rounded-3xl border border-outline-variant bg-surface p-6">
          {(title || thumbnail) && (
            <div className="mb-4 flex items-center gap-3">
              {thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover" />
              )}
              <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-on-surface">{title || "Transcript"}</p>
            </div>
          )}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Transcript</span>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
              <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"} size={14} />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="whitespace-pre-wrap rounded-2xl bg-surface-container-low p-4 text-[15px] leading-relaxed text-on-surface">{transcript}</p>
        </div>
      )}
    </div>
  );
}
