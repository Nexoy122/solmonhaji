"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function ScriptGenerator() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"topic" | "video">("topic");

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // ── From Topic ──
  const [topic, setTopic] = useState("");
  const [topicBusy, setTopicBusy] = useState(false);
  const [topicScript, setTopicScript] = useState("");
  const [topicErr, setTopicErr] = useState("");

  const generateTopic = async () => {
    setTopicErr(""); setTopicScript("");
    if (!topic.trim()) return setTopicErr("Please enter a topic.");
    setTopicBusy(true);
    try {
      const res = await fetch("/api/script/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = await res.json();
      if (!res.ok) setTopicErr(data.error || "Couldn't generate the script.");
      else setTopicScript(data.script);
    } catch { setTopicErr("Network error. Please try again."); }
    setTopicBusy(false);
  };

  // ── From Video Style ──
  const [ytUrl, setYtUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoScript, setVideoScript] = useState("");
  const [videoErr, setVideoErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const generateVideo = async () => {
    setVideoErr(""); setVideoScript("");
    if (!ytUrl.trim() && !transcript.trim() && !file) {
      return setVideoErr("Add a YouTube URL, paste a transcript, or upload a video.");
    }
    setVideoBusy(true);
    try {
      const fd = new FormData();
      if (ytUrl.trim()) fd.append("youtubeUrl", ytUrl.trim());
      if (transcript.trim()) fd.append("transcript", transcript.trim());
      if (file) fd.append("video", file);
      const res = await fetch("/api/script/generate-from-video", {
        method: "POST",
        headers: { ...(await authHeader()) },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) setVideoErr(data.error || "Couldn't generate the script.");
      else setVideoScript(data.script);
    } catch { setVideoErr("Network error. Please try again."); }
    setVideoBusy(false);
  };

  return (
    <div className="mx-auto max-w-[760px]">
      {/* Title */}
      <div className="mb-7 text-center">
        <h1 className="text-[30px] font-bold text-on-surface">Script Generator</h1>
        <p className="mt-1.5 text-[15px] text-on-surface-variant">Write scroll-stopping YouTube Shorts scripts in seconds.</p>
      </div>

      <div className="rounded-3xl border border-outline-variant bg-surface">
        {/* Tabs */}
        <div className="flex border-b border-outline-variant">
          {[["topic", "✍️ From Topic"], ["video", "📺 From Video Style"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k as "topic" | "video")}
              className={`relative flex-1 px-6 py-4 text-[14px] font-semibold transition-colors ${tab === k ? "text-on-surface" : "text-on-surface-variant hover:text-on-surface"}`}
            >
              {label}
              {tab === k && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "topic" ? (
            <>
              <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Topic</label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && generateTopic()}
                maxLength={200}
                placeholder="e.g. How the Great Wall of China was actually built"
                className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[15px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
              />
              <p className="mt-1.5 text-right text-[11px] text-on-surface-variant">{topic.length}/200</p>
              {topicErr && <ErrLine msg={topicErr} />}
              <button onClick={generateTopic} disabled={topicBusy} className="m3-btn-filled mt-3 w-full disabled:opacity-60">
                {topicBusy ? "Writing script…" : "Generate script"}
              </button>
              {topicScript && <ScriptOutput text={topicScript} />}
            </>
          ) : (
            <>
              <p className="text-[13px] leading-relaxed text-on-surface-variant">
                Give a reference and the AI studies its style, then writes a brand-new script (keeping the hook if you paste a transcript).
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">YouTube URL</label>
                  <input
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…  or  /shorts/…"
                    className="mt-2 h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-[15px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-3 text-[12px] font-medium text-on-surface-variant/60">
                  <span className="h-px flex-1 bg-outline-variant" /> or <span className="h-px flex-1 bg-outline-variant" />
                </div>

                <div>
                  <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Paste a transcript</label>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder="Paste the transcript of a Short you like… (its first sentence becomes your hook)"
                    className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-3 text-[14px] text-on-surface outline-none transition-colors placeholder:text-on-surface-variant focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-3 text-[12px] font-medium text-on-surface-variant/60">
                  <span className="h-px flex-1 bg-outline-variant" /> or <span className="h-px flex-1 bg-outline-variant" />
                </div>

                <div>
                  <label className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Upload a video</label>
                  <input ref={fileRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                  {file ? (
                    <div className="mt-2 flex items-center gap-2 rounded-xl border border-outline-variant bg-surface-container-low p-3">
                      <Icon d="M15 10l4.55-2.28A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.45.88L15 14M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" size={18} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-on-surface">{file.name}</span>
                      <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-on-surface-variant hover:text-error"><Icon d="M18 6 6 18M6 6l12 12" size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant py-3 text-[13px] font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface">
                      <Icon d="M12 16V4M7 9l5-5 5 5M5 20h14" size={16} /> Choose a video file (max 25 MB)
                    </button>
                  )}
                </div>
              </div>

              {videoErr && <ErrLine msg={videoErr} />}
              <button onClick={generateVideo} disabled={videoBusy} className="m3-btn-filled mt-4 w-full disabled:opacity-60">
                {videoBusy ? "Studying & writing…" : "Generate script"}
              </button>
              {videoBusy && <p className="mt-2 text-center text-[12px] text-on-surface-variant">Transcribing can take 10–30s for videos…</p>}
              {videoScript && <ScriptOutput text={videoScript} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrLine({ msg }: { msg: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-[14px] font-medium text-error">
      <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={16} /> {msg}
    </p>
  );
}

function ScriptOutput({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Your script</span>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors hover:bg-surface-container-high">
          <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"} size={14} />
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-on-surface">{text}</p>
    </div>
  );
}
