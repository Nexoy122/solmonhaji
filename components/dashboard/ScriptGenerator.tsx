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

interface HistoryItem { id: string; title: string; script: string; at: number }

export function ScriptGenerator() {
  const { user } = useAuth();
  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Starting point: "idea" → topic; "script" → paste/URL/upload a reference.
  const [mode, setMode] = useState<"idea" | "script">("idea");

  // idea
  const [topic, setTopic] = useState("");
  // script
  const [ytUrl, setYtUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [script, setScript] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [outTab, setOutTab] = useState<"output" | "history">("output");

  const ideaReady = topic.trim().length >= 5;
  const scriptReady = Boolean(ytUrl.trim() || transcript.trim() || file);
  const ready = mode === "idea" ? ideaReady : scriptReady;

  const generate = async () => {
    setErr(""); setScript("");
    if (!ready) return;
    setBusy(true); setOutTab("output");
    try {
      let data: { script?: string; error?: string };
      if (mode === "idea") {
        const res = await fetch("/api/script/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeader()) },
          body: JSON.stringify({ topic: topic.trim() }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't generate the script.");
      } else {
        const fd = new FormData();
        if (ytUrl.trim()) fd.append("youtubeUrl", ytUrl.trim());
        if (transcript.trim()) fd.append("transcript", transcript.trim());
        if (file) fd.append("video", file);
        const res = await fetch("/api/script/generate-from-video", {
          method: "POST", headers: { ...(await authHeader()) }, body: fd,
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't generate the script.");
      }
      const out = data.script ?? "";
      setScript(out);
      const title = mode === "idea" ? topic.trim().slice(0, 60) : (ytUrl.trim() ? "From YouTube" : file ? file.name : "From transcript");
      setHistory((h) => [{ id: crypto.randomUUID(), title, script: out, at: Date.now() }, ...h].slice(0, 20));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  return (
    <div className="dash-fade-up w-full">
      <p className="mb-5 text-[14px] text-on-surface-variant">Write scroll-stopping YouTube Shorts scripts in seconds — from an idea or an existing script.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Left: input ── */}
        <div className="border border-white/10 bg-[#050506]">
          <div className="border-b border-white/[0.07] px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Step 1 of 2</p>
            <p className="mt-0.5 text-[16px] font-bold text-on-surface">Choose your starting point</p>
          </div>

          <div className="p-5">
            {/* Starting-point cards */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <StartCard
                active={mode === "idea"}
                onClick={() => setMode("idea")}
                icon="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"
                title="Start from an idea"
                desc="Describe your video concept and we'll write a full script."
              />
              <StartCard
                active={mode === "script"}
                onClick={() => setMode("script")}
                icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"
                title="Start from a script"
                desc="Paste an existing script and we'll rewrite it in a new style."
              />
            </div>

            {/* Inputs */}
            {mode === "idea" ? (
              <div className="mt-4">
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  maxLength={10000}
                  rows={7}
                  placeholder="Describe your video idea — what topic, angle, or hook are you thinking about?"
                  className="w-full resize-none border border-white/12 bg-[#1E1F21] px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/30"
                />
                <p className="mt-1.5 text-right text-[11px] text-on-surface-variant">{topic.length}/10000</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <Field label="YouTube URL">
                  <input
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…  or  /shorts/…"
                    className="h-11 w-full border border-white/12 bg-[#1E1F21] px-4 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/30"
                  />
                </Field>
                <OrDivider />
                <Field label="Paste a script / transcript">
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    rows={4}
                    placeholder="Paste the script of a Short you like… (its first line becomes your hook)"
                    className="w-full resize-none border border-white/12 bg-[#1E1F21] px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/30"
                  />
                </Field>
                <OrDivider />
                <Field label="Upload a video">
                  <input ref={fileRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                  {file ? (
                    <div className="flex items-center gap-2 border border-white/12 bg-[#1E1F21] p-3">
                      <Icon d="M15 10l4.55-2.28A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.45.88L15 14M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" size={18} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-white">{file.name}</span>
                      <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-white/50 hover:text-[#ff6b6b]"><Icon d="M18 6 6 18M6 6l12 12" size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/80">
                      <Icon d="M12 16V4M7 9l5-5 5 5M5 20h14" size={16} /> Choose a video file (max 25 MB)
                    </button>
                  )}
                </Field>
              </div>
            )}

            {err && (
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[#ff6b6b]">
                <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={15} /> {err}
              </p>
            )}

            <button
              onClick={generate}
              disabled={!ready || busy}
              className="gbtn mt-4 flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <><span className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white/80" /> Writing script…</>
              ) : (
                <>Generate script <Icon d="M5 12h14M13 6l6 6-6 6" size={16} /></>
              )}
            </button>
            {!ready && !busy && (
              <p className="mt-2 text-center text-[12px] text-on-surface-variant">
                {mode === "idea" ? "Type at least 5 characters to continue." : "Add a YouTube URL, a script, or a video to continue."}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: output ── */}
        <div className="flex flex-col border border-white/10 bg-[#050506]">
          {/* Output / History tabs */}
          <div className="grid grid-cols-2 border-b border-white/[0.07]">
            {(["output", "history"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOutTab(t)}
                className={`py-3.5 text-[13.5px] font-semibold capitalize transition-colors ${outTab === t ? "bg-white/[0.04] text-white" : "text-on-surface-variant hover:text-white"}`}
              >
                {t}{t === "history" && history.length > 0 ? ` (${history.length})` : ""}
              </button>
            ))}
          </div>

          <div className="min-h-[420px] flex-1 p-5">
            {outTab === "output" ? (
              busy ? (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                  <span className="mb-4 size-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
                  <p className="text-[14px] text-on-surface-variant">Writing your script…</p>
                </div>
              ) : script ? (
                <ScriptOutput text={script} />
              ) : (
                <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                  <span className="mb-4 flex size-14 items-center justify-center rounded-xl border border-white/10 text-white/40">
                    <Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" size={24} />
                  </span>
                  <p className="text-[15px] font-semibold text-on-surface">Your script will appear here</p>
                  <p className="mt-1.5 max-w-[300px] text-[13px] text-on-surface-variant">Pick a starting point, add your input, and generate.</p>
                </div>
              )
            ) : history.length === 0 ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center text-center">
                <p className="text-[14px] text-on-surface-variant">No scripts yet this session.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => { setScript(h.script); setOutTab("output"); }}
                    className="flex w-full items-center gap-3 border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.04]"
                  >
                    <span className="text-white/40"><Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" size={16} /></span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{h.title}</span>
                    <span className="shrink-0 text-[11px] text-on-surface-variant">{new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StartCard({ active, onClick, icon, title, desc }: { active: boolean; onClick: () => void; icon: string; title: string; desc: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-2 border p-3.5 text-left transition-colors ${active ? "border-white/40 bg-white/[0.05]" : "border-white/10 bg-[#1E1F21] hover:border-white/25"}`}
    >
      <span className={`flex size-8 items-center justify-center rounded-md ${active ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/50"}`}>
        <Icon d={icon} size={17} />
      </span>
      <span className="text-[13.5px] font-semibold text-on-surface">{title}</span>
      <span className="text-[11.5px] leading-snug text-on-surface-variant">{desc}</span>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">{label}</label>
      {children}
    </div>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium text-on-surface-variant/60">
      <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function ScriptOutput({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Your script</span>
        <button onClick={copy} className="gbtn inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white/80">
          <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"} size={14} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">{text}</p>
    </div>
  );
}
