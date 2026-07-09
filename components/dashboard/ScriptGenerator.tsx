"use client";

import { useState, useRef, useCallback, type ReactNode } from "react";
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
interface Step { title: string; hint: string; canNext: boolean; optional?: boolean; content: ReactNode }

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

const inputCls = "w-full rounded-md border border-white/20 bg-[#1E1F21] px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#2e8eff]/70";

// Idea starter chips — fill the idea box on click.
const IDEA_CHIPS = ["Weird product review", "Internet drama recap", "“Healthy” habit myth", "Overrated or underrated"];

// Static tips for the "How to get the best script" help panel.
const HELP_TIPS = [
  "Be specific: name the exact topic, angle, or hook you want.",
  "Add a reference (URL or transcript) to copy a creator's style & hook.",
  "For a silent/aesthetic clip, use From Video — the AI reads the on-screen text and visuals.",
  "After it generates, refine it with the improve box — e.g. “make the hook more controversial”.",
];

export function ScriptGenerator() {
  const { user } = useAuth();
  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  const [mode, setModeRaw] = useState<Mode>("idea");
  const [step, setStep] = useState(0); // 0-indexed active step
  const [helpOpen, setHelpOpen] = useState(false);

  // shared reference + options
  const [refUrl, setRefUrl] = useState("");
  const [refTranscript, setRefTranscript] = useState("");
  const [withTimestamps, setWithTimestamps] = useState(false);
  // idea / improve / video inputs
  const [idea, setIdea] = useState("");
  const [scriptIn, setScriptIn] = useState("");
  const [improveOpts, setImproveOpts] = useState<string[]>(["better_hook"]);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [script, setScript] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [outTab, setOutTab] = useState<"output" | "history">("output");

  const setMode = (m: Mode) => { setModeRaw(m); setStep(0); setErr(""); };
  const toggleOpt = (id: string) => setImproveOpts((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));

  // Reusable UI bits
  const uploadBox = (
    <>
      <input ref={fileRef} type="file" accept="video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
      {file ? (
        <div className="flex items-center gap-2.5 border border-white/12 bg-[#1E1F21] p-3.5">
          <Icon d="M15 10l4.55-2.28A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.45.88L15 14M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" size={20} />
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">{file.name}</span>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }} className="text-white/50 hover:text-[#ff6b6b]"><Icon d="M18 6 6 18M6 6l12 12" size={16} /></button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 border border-dashed border-white/15 py-8 text-white/55 transition-colors hover:border-white/30 hover:bg-white/[0.03] hover:text-white/80">
          <Icon d="M12 16V4M7 9l5-5 5 5M5 20h14" size={26} />
          <span className="text-[13.5px] font-medium">Click to upload a video</span>
          <span className="text-[11.5px] text-on-surface-variant">MP4, MOV, WEBM — up to 500 MB</span>
        </button>
      )}
    </>
  );

  const refStep = (
    <>
      <input value={refUrl} onChange={(e) => setRefUrl(e.target.value)} placeholder="Reference YouTube URL — copies its style" className={inputCls} />
      <div className="my-3"><OrDivider /></div>
      <textarea value={refTranscript} onChange={(e) => setRefTranscript(e.target.value)} rows={4} placeholder="…or paste a reference transcript to copy its style & hook" className={inputCls + " resize-none"} />
    </>
  );

  const optionsStep = (
    <label className="flex cursor-pointer items-center gap-3 border border-white/10 bg-[#1E1F21] p-4">
      <span onClick={() => setWithTimestamps((v) => !v)} className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${withTimestamps ? "bg-[#2e8eff]" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${withTimestamps ? "translate-x-5" : "translate-x-0.5"}`} />
      </span>
      <div>
        <p className="text-[14px] font-semibold text-white">Include timestamps</p>
        <p className="text-[12px] text-on-surface-variant">Add [0-3s] beats to each line — handy for editing.</p>
      </div>
    </label>
  );

  // ── Per-mode step definitions (one thing per step) ──
  const steps: Step[] =
    mode === "idea" ? [
      { title: "Your idea", hint: "Describe the video you want to make — the topic, angle, or hook.", canNext: idea.trim().length >= 5,
        content: (
          <div>
            <textarea value={idea} onChange={(e) => setIdea(e.target.value)} rows={5} maxLength={10000} placeholder="e.g. A video comparing Iran vs USA military power" className={inputCls + " resize-none"} />
            <p className="mt-1.5 text-right text-[11px] text-on-surface-variant">{idea.length}/10000</p>
            <p className="mb-2 mt-1 flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant">
              <Icon d="M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z" size={13} /> Try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {IDEA_CHIPS.map((c) => (
                <button key={c} onClick={() => setIdea(c)} className="rounded-full border border-white/15 bg-[#1E1F21] px-3.5 py-1.5 text-[12px] font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white">{c}</button>
              ))}
            </div>
          </div>
        ) },
      { title: "Reference style", hint: "Optional — give a video or transcript to copy its style & hook.", canNext: true, optional: true, content: refStep },
      { title: "Options", hint: "Choose how the final script is formatted.", canNext: true, content: optionsStep },
    ] :
    mode === "improve" ? [
      { title: "Your script", hint: "Paste the script you want to make better.", canNext: scriptIn.trim().length >= 20,
        content: <textarea value={scriptIn} onChange={(e) => setScriptIn(e.target.value)} rows={6} placeholder="Paste your current script here…" className={inputCls + " resize-none"} /> },
      { title: "What to improve", hint: "Pick what the AI should focus on.", canNext: improveOpts.length > 0,
        content: (
          <div className="flex flex-wrap gap-2">
            {IMPROVE_OPTS.map((o) => (
              <button key={o.id} onClick={() => toggleOpt(o.id)} className={`border px-3.5 py-2 text-[13px] font-medium transition-all ${improveOpts.includes(o.id) ? "border-white/40 bg-white/[0.06] text-white" : "border-white/12 bg-[#1E1F21] text-white/55 hover:text-white/80"}`}>{o.label}</button>
            ))}
          </div>
        ) },
      { title: "Reference & options", hint: "Optional style reference + formatting.", canNext: true, optional: true,
        content: <div className="space-y-4">{refStep}<div className="border-t border-white/[0.06] pt-4">{optionsStep}</div></div> },
    ] :
    [
      { title: "Your video", hint: "Upload a video (≤60s works best). Our AI watches & analyzes it — no captions or voiceover needed.", canNext: Boolean(file),
        content: <div>{uploadBox}</div> },
      { title: "Reference style", hint: "Optional — give a video or transcript to copy its style.", canNext: true, optional: true, content: refStep },
      { title: "Options", hint: "Choose how the final script is formatted.", canNext: true, content: optionsStep },
    ];

  const total = steps.length;
  const cur = steps[step];
  const isLast = step === total - 1;

  const readJson = async (res: Response): Promise<{ script?: string; error?: string; warning?: string }> => {
    const raw = await res.text();
    try { return raw ? JSON.parse(raw) : {}; }
    catch { return { error: res.status === 504 ? "The video took too long to process. Try a shorter clip." : `Server error (${res.status}). Please try again.` }; }
  };

  const generate = async () => {
    setErr(""); setScript(""); setNotice("");
    setBusy(true); setOutTab("output");
    try {
      let data: { script?: string; error?: string; warning?: string };
      if (mode === "video") {
        const fd = new FormData();
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
        const res = await fetch("/api/script/generate", { method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) }, body: JSON.stringify(payload) });
        data = await readJson(res);
        if (!res.ok) throw new Error(data.error || "Couldn't generate the script.");
      }
      const out = data.script ?? "";
      setScript(out);
      if (data.warning) setNotice(data.warning);
      const title = mode === "idea" ? idea.trim().slice(0, 60) : mode === "improve" ? "Improved script" : (file?.name ?? "From video");
      setHistory((h) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title, script: out, at: Date.now() }, ...h].slice(0, 20));
    } catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };

  // Refine the CURRENT output with a free-text instruction (from the output panel).
  const [refining, setRefining] = useState(false);
  const improveInline = async (instruction: string) => {
    if (!script || !instruction.trim()) return;
    setRefining(true); setErr("");
    try {
      const res = await fetch("/api/script/generate", {
        method: "POST", headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ mode: "improve", script, instruction: instruction.trim(), withTimestamps }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || "Couldn't improve the script.");
      const out = data.script ?? "";
      setScript(out);
      setHistory((h) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: instruction.trim().slice(0, 50), script: out, at: Date.now() }, ...h].slice(0, 20));
    } catch (e) { setErr((e as Error).message); }
    setRefining(false);
  };

  return (
    <div className="dash-fade-up w-full">
      <p className="mb-4 text-[14px] text-on-surface-variant">Write scroll-stopping YouTube Shorts scripts — from an idea, a script, or a video.</p>

      {/* How to get the best script — collapsible help */}
      <div className="mb-5 overflow-hidden rounded-xl border border-white/15 bg-[#0a0a0c]">
        <button onClick={() => setHelpOpen((o) => !o)} className="flex w-full items-center gap-2.5 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.02]">
          <span className="text-[#2e8eff]"><Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 16v-4M12 8h.01" size={17} /></span>
          <span className="flex-1 text-[14px] font-semibold text-white">How to get the best script</span>
          <Icon d={helpOpen ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} size={17} />
        </button>
        {helpOpen && (
          <div className="step-in border-t border-white/[0.07] px-5 py-4">
            <ul className="space-y-2">
              {HELP_TIPS.map((t, i) => (
                <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-on-surface-variant">
                  <span className="mt-0.5 shrink-0 text-[#2e8eff]"><Icon d="M20 6 9 17l-5-5" size={14} /></span> {t}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        {/* ── Left: wizard ── */}
        <div className="flex min-h-[600px] flex-col rounded-xl border border-white/20 bg-[#0a0a0c] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_rgba(0,0,0,0.5)]">
          {/* Mode tabs */}
          <div className="grid grid-cols-3 border-b border-white/15">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={`flex flex-col items-center gap-1.5 px-2 py-4 text-center transition-all first:rounded-tl-xl last:rounded-tr-xl ${mode === m.id ? "bg-white/[0.06] text-white" : "text-on-surface-variant hover:bg-white/[0.02] hover:text-white"}`}>
                <Icon d={m.icon} size={20} /><span className="text-[13px] font-semibold">{m.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-1 flex-col p-6">
            {/* Step header + progress */}
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                Step {step + 1} of {total}{cur.optional ? " · optional" : ""}
              </p>
              <div className="flex gap-1.5">
                {steps.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? "w-6 bg-[#2e8eff]" : "w-1.5 bg-white/15"}`} />)}
              </div>
            </div>

            {/* Active step (animated) — grows to fill */}
            <div className="step-in mt-4 flex-1" key={`${mode}-${step}`}>
              <p className="text-[18px] font-bold text-on-surface">{cur.title}</p>
              <p className="mb-4 mt-1 text-[13px] leading-relaxed text-on-surface-variant">{cur.hint}</p>
              {cur.content}
            </div>

            {err && (
              <p className="mt-3 flex items-center gap-1.5 text-[13px] font-medium text-[#ff6b6b]">
                <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={15} /> {err}
              </p>
            )}

            {/* Nav (pinned to bottom) */}
            <div className="mt-6 flex items-center gap-3">
              {step > 0 && (
                <button onClick={() => { setStep((s) => s - 1); setErr(""); }} className="gbtn flex items-center gap-1.5 px-4 py-3 text-[13.5px] font-semibold text-white/70">
                  <Icon d="M19 12H5M11 18l-6-6 6-6" size={15} /> Back
                </button>
              )}
              {isLast ? (
                <button onClick={generate} disabled={!steps[0].canNext || busy} className="btn-donate flex flex-1 items-center justify-center gap-2 text-[14px]">
                  {busy ? "Generating…" : <>Generate script <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" size={16} /></>}
                </button>
              ) : (
                <button onClick={() => { setStep((s) => s + 1); setErr(""); }} disabled={!cur.canNext} className="btn-donate flex flex-1 items-center justify-center gap-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-40">
                  {cur.optional && !cur.canNext ? "Skip" : "Next"} <Icon d="M5 12h14M13 6l6 6-6 6" size={16} />
                </button>
              )}
            </div>
            {!cur.canNext && step === 0 && (
              <p className="mt-2 text-center text-[12px] text-on-surface-variant">
                {mode === "idea" ? "Describe your idea (5+ characters)." : mode === "improve" ? "Paste a script (20+ characters)." : "Upload a video to continue."}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: output ── */}
        <div className="flex min-h-[600px] flex-col rounded-xl border border-white/20 bg-[#0a0a0c] shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_8px_30px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 border-b border-white/15">
            {(["output", "history"] as const).map((t) => (
              <button key={t} onClick={() => setOutTab(t)}
                className={`py-4 text-[13.5px] font-semibold capitalize transition-colors first:rounded-tl-xl last:rounded-tr-xl ${outTab === t ? "bg-white/[0.06] text-white" : "text-on-surface-variant hover:text-white"}`}>
                {t}{t === "history" && history.length > 0 ? ` (${history.length})` : ""}
              </button>
            ))}
          </div>
          <div className="flex flex-1 flex-col p-6">
            {outTab === "output" ? (
              busy ? <GeneratingLoader /> :
              script ? (
                <>
                  {notice && (
                    <div className="mb-3 flex items-start gap-2 rounded-md border border-[#e0b341]/30 bg-[#e0b341]/[0.08] px-3 py-2 text-[12px] text-[#e0b341]">
                      <Icon d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 8v4M12 16h.01" size={14} /> {notice}
                    </div>
                  )}
                  <ScriptOutput text={script} onImprove={improveInline} refining={refining} />
                </>
              ) : (
                <div className="flex h-full min-h-[460px] flex-col items-center justify-center text-center">
                  <span className="mb-4 flex size-14 items-center justify-center rounded-xl border border-white/10 text-white/40">
                    <Icon d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" size={24} />
                  </span>
                  <p className="text-[15px] font-semibold text-on-surface">Your script will appear here</p>
                  <p className="mt-1.5 max-w-[300px] text-[13px] text-on-surface-variant">Follow the steps and generate.</p>
                </div>
              )
            ) : history.length === 0 ? (
              <div className="flex h-full min-h-[460px] items-center justify-center text-center">
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

function OrDivider() {
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium text-on-surface-variant/60">
      <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

const IMPROVE_CHIPS = [
  "Make the hook more controversial",
  "Shorten the middle section",
  "Add a question at the start",
  "Make it more conversational",
  "Tighten the pacing",
];

function ScriptOutput({ text, onImprove, refining }: { text: string; onImprove: (s: string) => void; refining: boolean }) {
  const [copied, setCopied] = useState(false);
  const [change, setChange] = useState("");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const secs = Math.round((words / 150) * 60); // ~150 wpm spoken

  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const submit = (val: string) => { if (val.trim() && !refining) { onImprove(val); setChange(""); } };

  return (
    <div className="step-in flex h-full flex-col">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-bold text-on-surface">Your Script</p>
          <p className="mt-0.5 flex items-center gap-3 text-[12px] text-on-surface-variant">
            <span className="inline-flex items-center gap-1"><Icon d="M4 7V4h16v3M9 20h6M12 4v16" size={12} /> {words} words</span>
            <span className="inline-flex items-center gap-1"><Icon d="M12 6v6l4 2M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z" size={12} /> ~{secs}s spoken</span>
          </p>
        </div>
        <button onClick={copy} className="gbtn inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white/80">
          <Icon d={copied ? "M20 6 9 17l-5-5" : "M9 9h10v10H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"} size={14} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Script text */}
      <div className="relative flex-1">
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-on-surface">{text}</p>
        {refining && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050506]/70 backdrop-blur-[1px]">
            <span className="flex items-center gap-2 text-[13px] text-white/80"><span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white/70" /> Improving…</span>
          </div>
        )}
      </div>

      {/* Inline improve box */}
      <div className="mt-4 border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-2">
          <input
            value={change}
            onChange={(e) => setChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(change)}
            placeholder="What would you like to change?"
            disabled={refining}
            className="h-11 flex-1 border border-white/12 bg-[#1E1F21] px-4 text-[13.5px] text-white outline-none transition-colors placeholder:text-white/35 focus:border-white/30 disabled:opacity-50"
          />
          <button onClick={() => submit(change)} disabled={!change.trim() || refining} className="btn-donate flex items-center gap-1.5 px-5 text-[13px] disabled:cursor-not-allowed disabled:opacity-40">
            <Icon d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" size={15} /> Improve
          </button>
        </div>
        {/* Quick chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {IMPROVE_CHIPS.map((c) => (
            <button key={c} onClick={() => submit(c)} disabled={refining}
              className="rounded-full border border-white/12 bg-[#1E1F21] px-3 py-1 text-[11.5px] font-medium text-white/55 transition-colors hover:border-white/25 hover:text-white/80 disabled:opacity-40">
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
