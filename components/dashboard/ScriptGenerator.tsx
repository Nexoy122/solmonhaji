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

// Animated "Generating" letter loader (Uiverse by dexter-st).
function GeneratingLoader() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center">
      <div className="loader-wrapper">
        {"Generating".split("").map((ch, i) => <span key={i} className="loader-letter">{ch}</span>)}
        <div className="gloader" />
      </div>
    </div>
  );
}

type Mode = "idea" | "improve" | "video";
interface HistoryItem { id: string; title: string; script: string; at: number }

const MODES: { id: Mode; label: string; icon: string }[] = [
  { id: "idea", label: "From Idea", icon: "M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" },
  { id: "improve", label: "Improve Script", icon: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" },
  { id: "video", label: "From Video", icon: "M23 7l-7 5 7 5V7zM14 5H3a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" },
];

const IMPROVE_OPTS: { id: string; label: string }[] = [
  { id: "better_hook", label: "Better hook" },
  { id: "tighter_pacing", label: "Tighter pacing" },
  { id: "stronger_cta", label: "Stronger CTA" },
  { id: "more_engaging", label: "More engaging" },
  { id: "shorter", label: "Make shorter" },
  { id: "longer", label: "Make longer" },
];

export function ScriptGenerator() {
  const { user } = useAuth();
  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  const [mode, setModeRaw] = useState<Mode>("idea");
  const [step, setStep] = useState(1); // current wizard step (per mode)

  const setMode = (m: Mode) => { setModeRaw(m); setStep(1); setErr(""); };

  // shared reference + options
  const [refUrl, setRefUrl] = useState("");
  const [refTranscript, setRefTranscript] = useState("");
  const [withTimestamps, setWithTimestamps] = useState(false);

  // idea
  const [idea, setIdea] = useState("");
  // improve
  const [scriptIn, setScriptIn] = useState("");
  const [improveOpts, setImproveOpts] = useState<string[]>(["better_hook"]);
  // video
  const [videoUrl, setVideoUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [script, setScript] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [outTab, setOutTab] = useState<"output" | "history">("output");

  // Is the FIRST (required) input of the current mode filled?
  const step1Done =
    mode === "idea" ? idea.trim().length >= 5 :
    mode === "improve" ? scriptIn.trim().length >= 20 :
    Boolean(videoUrl.trim() || file);

  const toggleOpt = (id: string) =>
    setImproveOpts((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  const next = () => setStep((s) => s + 1);

  const readJson = async (res: Response): Promise<{ script?: string; error?: string }> => {
    const raw = await res.text();
    try { return raw ? JSON.parse(raw) : {}; }
    catch { return { error: res.status === 504 ? "The video took too long to process. Try a shorter clip." : `Server error (${res.status}). Please try again.` }; }
  };

  const generate = async () => {
    setErr(""); setScript("");
    if (!step1Done) return;
    setBusy(true); setOutTab("output");
    try {
      let data: { script?: string; error?: string };
      if (mode === "video") {
        const fd = new FormData();
        if (videoUrl.trim()) fd.append("youtubeUrl", videoUrl.trim());
        if (file) fd.append("video", file);
        if (refTranscript.trim()) fd.append("transcript", refTranscript.trim());
        if (withTimestamps) fd.append("withTimestamps", "1");
        const res = await fetch("/api/script/generate-from-video", { method: "POST", headers: { ...(await authHeader()) }, body: fd });
        data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Couldn't generate the script.");
      } else {
        const payload: Record<string, unknown> = { mode, withTimestamps, transcript: refTranscript.trim() || null, youtubeUrl: refUrl.trim() || null };
        if (mode === "idea") payload.idea = idea.trim();
        else { payload.script = scriptIn.trim(); payload.options = improveOpts; }
        const res = await fetch("/api/script/generate", {
          method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify(payload),
        });
        data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Couldn't generate the script.");
      }
      const out = data.script ?? "";
      setScript(out);
      const title = mode === "idea" ? idea.trim().slice(0, 60) : mode === "improve" ? "Improved script" : (videoUrl.trim() ? "From video URL" : file?.name ?? "From video");
      setHistory((h) => [{ id: crypto.randomUUID(), title, script: out, at: Date.now() }, ...h].slice(0, 20));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  // Steps definition per mode: [label]. Last step is always "Generate".
  const steps: string[] =
    mode === "idea" ? ["Your idea", "Reference style", "Options"] :
    mode === "improve" ? ["Your script", "What to improve", "Reference & options"] :
    ["Your video", "Reference style", "Options"];
  const totalSteps = steps.length;

  const RefStyle = (
    <>
      <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="Reference YouTube URL — copies its style" className={inputCls} />
      <div className="my-2.5"><OrDivider /></div>
      <textarea value={refTranscript} onChange={(e) => setRefTranscript(e.target.value)} rows={3} placeholder="…or paste a reference transcript to copy its style & hook" className={inputCls + " resize-none"} />
    </>
  );

  const TimestampToggle = (
    <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-on-surface">
      <span onClick={() => setWithTimestamps((v) => !v)} className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${withTimestamps ? "bg-[#2e8eff]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-white transition-transform ${withTimestamps ? "translate-x-4" : "translate-x-0.5"}`} />
      </span>
      Include timestamps
    </label>
  );

  return (
    <div className="dash-fade-up w-full">
      <p className="mb-5 text-[14px] text-on-surface-variant">Turn any idea, script, or video into a scroll-stopping YouTube Shorts script — step by step.</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ── Left: wizard ── */}
        <div className="border border-white/10 bg-[#050506]">
          {/* Mode tabs */}
          <div className="grid grid-cols-3 border-b border-white/[0.07]">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-1 px-2 py-3 text-center transition-colors ${mode === m.id ? "bg-white/[0.05] text-white" : "text-on-surface-variant hover:text-white"}`}>
                <Icon d={m.icon} size={18} /><span className="text-[12.5px] font-semibold">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Step header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">Step {Math.min(step, totalSteps)} of {totalSteps}</p>
                <p className="mt-0.5 text-[16px] font-bold text-on-surface">{steps[Math.min(step, totalSteps) - 1]}</p>
              </div>
              {/* progress dots */}
              <div className="flex gap-1.5">
                {steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i < step ? "w-6 bg-[#2e8eff]" : "w-1.5 bg-white/15"}`} />)}
              </div>
            </div>

            {/* ── STEP 1: primary input ── */}
            <div className="step-in" key={`${mode}-1`}>
              {mode === "idea" && (
                <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={5} maxLength={10000}
                  placeholder="Describe your video idea — e.g. Iran vs USA military power" className={inputCls + " resize-none"} />
              )}
              {mode === "improve" && (
                <textarea value={scriptIn} onChange={(e) => setScriptIn(e.target.value)} rows={5}
                  placeholder="Paste the script you want to improve…" className={inputCls + " resize-none"} />
              )}
              {mode === "video" && (
                <>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Paste a YouTube Short URL…" className={inputCls} />
                  <div className="my-3"><OrDivider /></div>
                  <input ref={fileRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
                  {file ? (
                    <div className="flex items-center gap-2 border border-white/12 bg-[#1E1F21] p-3">
                      <Icon d="M15 10l4.55-2.28A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.45.88L15 14M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" size={18} />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-white">{file.name}</span>
                      <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-white/50 hover:text-[#ff6b6b]"><Icon d="M18 6 6 18M6 6l12 12" size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 border border-dashed border-white/15 py-3 text-[13px] font-medium text-white/55 transition-colors hover:bg-white/[0.04] hover:text-white/80">
                      <Icon d="M12 16V4M7 9l5-5 5 5M5 20h14" size={16} /> Upload a video (max 500 MB)
                    </button>
                  )}
                  <p className="mt-2 text-[11.5px] text-on-surface-variant">Our AI watches &amp; analyzes the video — no captions needed.</p>
                </>
              )}
            </div>

            {/* ── STEP 2 ── */}
            {step >= 2 && (
              <div className="step-in mt-5 border-t border-white/[0.06] pt-4" key={`${mode}-2`}>
                {mode === "improve" ? (
                  <div className="flex flex-wrap gap-2">
                    {IMPROVE_OPTS.map((o) => (
                      <button key={o.id} onClick={() => toggleOpt(o.id)}
                        className={`border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${improveOpts.includes(o.id) ? "border-white/40 bg-white/[0.06] text-white" : "border-white/12 bg-[#1E1F21] text-white/55 hover:text-white/80"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <>{RefStyle}</>
                )}
              </div>
            )}

            {/* ── STEP 3 ── */}
            {step >= 3 && (
              <div className="step-in mt-5 border-t border-white/[0.06] pt-4" key={`${mode}-3`}>
                {mode === "improve" && <div className="mb-4">{RefStyle}</div>}
                {TimestampToggle}
              </div>
            )}

            {err && (
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[#ff6b6b]">
                <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={15} /> {err}
              </p>
            )}

            {/* Next / Generate */}
            {step < totalSteps ? (
              <button onClick={next} disabled={step === 1 && !step1Done}
                className="gbtn mt-5 flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold text-white/90 disabled:cursor-not-allowed disabled:opacity-40">
                Next <Icon d="M5 12h14M13 6l6 6-6 6" size={16} />
              </button>
            ) : (
              <button onClick={generate} disabled={!step1Done || busy}
                className="btn-donate mt-5 flex w-full items-center justify-center gap-2 text-[14px]">
                {busy ? "Generating…" : <>Generate script <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" size={16} /></>}
              </button>
            )}
            {step === 1 && !step1Done && (
              <p className="mt-2 text-center text-[12px] text-on-surface-variant">
                {mode === "idea" ? "Describe your idea (5+ characters)." : mode === "improve" ? "Paste a script (20+ characters)." : "Add a video URL or file to continue."}
              </p>
            )}
            {/* Back link on later steps */}
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="mx-auto mt-3 flex items-center gap-1 text-[12px] text-on-surface-variant transition-colors hover:text-white">
                <Icon d="M19 12H5M11 18l-6-6 6-6" size={13} /> Back
              </button>
            )}
          </div>
        </div>

        {/* ── Right: output ── */}
        <div className="flex flex-col border border-white/10 bg-[#050506]">
          <div className="grid grid-cols-2 border-b border-white/[0.07]">
            {(["output", "history"] as const).map((t) => (
              <button key={t} onClick={() => setOutTab(t)}
                className={`py-3.5 text-[13.5px] font-semibold capitalize transition-colors ${outTab === t ? "bg-white/[0.04] text-white" : "text-on-surface-variant hover:text-white"}`}>
                {t}{t === "history" && history.length > 0 ? ` (${history.length})` : ""}
              </button>
            ))}
          </div>
          <div className="min-h-[460px] flex-1 p-5">
            {outTab === "output" ? (
              busy ? <GeneratingLoader /> :
              script ? <ScriptOutput text={script} /> : (
                <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center">
                  <span className="mb-4 flex size-14 items-center justify-center rounded-xl border border-white/10 text-white/40">
                    <Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" size={24} />
                  </span>
                  <p className="text-[15px] font-semibold text-on-surface">Your script will appear here</p>
                  <p className="mt-1.5 max-w-[300px] text-[13px] text-on-surface-variant">Follow the steps and generate.</p>
                </div>
              )
            ) : history.length === 0 ? (
              <div className="flex h-full min-h-[420px] items-center justify-center text-center">
                <p className="text-[14px] text-on-surface-variant">No scripts yet this session.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {history.map((h) => (
                  <button key={h.id} onClick={() => { setScript(h.script); setOutTab("output"); }}
                    className="flex w-full items-center gap-3 border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/25 hover:bg-white/[0.04]">
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

const inputCls = "w-full border border-white/12 bg-[#1E1F21] px-4 py-2.5 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/30";

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
    <div className="step-in">
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
