"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Reusable "before → click → after" product demo, in a browser frame. Loops:
// show the empty (before) state → glide the cursor to a button → click ripple →
// the result "prints in" from a reveal point downward via an animated clip-path
// (so only the changed region animates, no whole-image flicker) → hold → reset.
// Runs only while on-screen (IntersectionObserver) and respects reduced-motion.
//
// Each tool supplies a config: the two screenshots, the button position (% of
// frame), where the result reveal starts (revealTop %), and the "working" label.
export type ClickDemoConfig = {
  before: string;
  after: string;
  label: string;
  btnX: string; // horizontal center of the button, e.g. "50%"
  btnY: string; // vertical center of the button
  revealTop: string; // where the result starts revealing, e.g. "18%" (below the header)
  workingLabel: string; // chip text shown between click and result
  restX?: string; // where the cursor idles before moving (default "62%")
  restY?: string;
};

// ── Presets ───────────────────────────────────────────────────────────────────
export const SCRIPT_DEMO: ClickDemoConfig = {
  before: "/lp-shots/script-generator-before.png",
  after: "/lp-shots/script-generator.png",
  label: "Script Generator",
  btnX: "27%",
  btnY: "86%",
  revealTop: "18%",
  workingLabel: "Generating…",
};

export const TRUST_DEMO: ClickDemoConfig = {
  before: "/lp-shots/trust-score-before.png",
  after: "/lp-shots/trust-score.png",
  label: "Trust Score",
  btnX: "51%", // "Analyze channel" button is roughly centered
  btnY: "68%", // sits on the button (was 77%, landed too low)
  revealTop: "22%", // reveal starts just below the channel/header row
  workingLabel: "Analyzing…",
  restX: "34%",
  restY: "48%",
};

export const TRANSCRIPT_DEMO: ClickDemoConfig = {
  before: "/lp-shots/shorts-transcript-before.png",
  after: "/lp-shots/shorts-transcript.png",
  label: "Shorts Transcript",
  btnX: "50%", // "Get transcript" button is centered
  btnY: "34%", // measured from the before-image: button center ≈ 320/941 px
  revealTop: "44%", // the transcript card prints in below the form
  workingLabel: "Fetching transcript…",
  restX: "36%",
  restY: "56%",
};

type Stage = "idle" | "moving" | "clicked" | "result";

export function LpClickDemo({
  config,
  chrome = true,
  bare = false,
}: {
  config: ClickDemoConfig;
  chrome?: boolean; // show the faux browser chrome bar
  bare?: boolean; // drop the outer frame (border/shadow/rounding) + glow
}) {
  const { before, after, label, btnX, btnY, revealTop, workingLabel } = config;
  const restX = config.restX ?? "62%";
  const restY = config.restY ?? "50%";

  const [stage, setStage] = useState<Stage>("idle");
  const [beforeOk, setBeforeOk] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const running = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      running.current = true;
      const cycle = () => {
        if (!running.current) return;
        setStage("idle");
        timers.push(setTimeout(() => setStage("moving"), 700));
        timers.push(setTimeout(() => setStage("clicked"), 2100));
        timers.push(setTimeout(() => setStage("result"), 2600));
        timers.push(setTimeout(cycle, 8000)); // hold result, then restart
      };
      cycle();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running.current) run();
        else if (!e.isIntersecting) {
          running.current = false;
          timers.forEach(clearTimeout);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      running.current = false;
      timers.forEach(clearTimeout);
      io.disconnect();
    };
  }, []);

  const showResult = stage === "result";

  return (
    <div ref={ref} className="group relative">
      {!bare && (
        <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[32px] bg-[radial-gradient(60%_60%_at_50%_40%,rgba(1,212,255,0.18),transparent_70%)] opacity-70 blur-2xl" />
      )}

      <div
        className={
          bare
            ? "relative overflow-hidden bg-[#171d2b]"
            : "relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#171d2b] shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
        }
      >
        {/* browser chrome */}
        {chrome && (
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 flex items-center gap-1.5 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-medium text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-[#28c840] animate-pulse-dot" /> app.vixo.live
            </span>
          </div>
        )}

        {/* Fixed aspect box so the frame keeps its height even before the image
            loads or if a file is missing (no collapse to just the chrome bar). */}
        <div className="relative aspect-video">
          {/* BEFORE (fallback if the file isn't dropped in yet) */}
          {beforeOk ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt={`${label}, start`} className="block h-full w-full object-cover object-top" onError={() => setBeforeOk(false)} />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#141a26] text-center">
              <div>
                <p className="text-[13px] font-semibold text-white/70">{label} (before) screenshot</p>
                <p className="mt-1 text-[12px] text-white/35">drop {before} to enable the click demo</p>
              </div>
            </div>
          )}

          {/* AFTER, registered on top; result "prints in" via clip-path so only
              the changed region animates (no whole-image flicker). */}
          {showResult && (
            <motion.img
              key="after"
              // eslint-disable-next-line @next/next/no-img-element
              src={after}
              alt={`${label}, result`}
              className="absolute inset-0 block h-full w-full object-cover object-top"
              initial={{ clipPath: `inset(${revealTop} 0% ${100 - parseFloat(revealTop)}% 0%)` }}
              animate={{ clipPath: `inset(${revealTop} 0% 0% 0%)` }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            />
          )}

          {/* cyan scan-line rides the reveal edge */}
          {showResult && (
            <motion.div
              className="pointer-events-none absolute inset-x-0 z-20 h-6 bg-gradient-to-b from-transparent via-[#01D4FF]/30 to-transparent"
              initial={{ top: revealTop, opacity: 0 }}
              animate={{ top: [revealTop, "100%"], opacity: [0.9, 0.9, 0] }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
            />
          )}

          {/* "working" chip between click and result */}
          <AnimatePresence>
            {stage === "clicked" && (
              <motion.div
                className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#01D4FF]/40 bg-[#0f1420]/90 px-4 py-2 text-[13px] font-semibold text-[#01D4FF] shadow-lg"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#01D4FF]/30 border-t-[#01D4FF] align-middle" />
                {workingLabel}
              </motion.div>
            )}
          </AnimatePresence>

          {/* animated cursor */}
          {!showResult && (
            <motion.div
              // -mt/-ml pull the pointer's TIP (SVG coord ~5,3) onto the target
              // point, instead of the icon's top-left corner sitting there.
              className="pointer-events-none absolute left-0 top-0 z-40 -ml-[5px] -mt-[3px]"
              initial={{ left: restX, top: restY }}
              animate={stage === "moving" || stage === "clicked" ? { left: btnX, top: btnY } : { left: restX, top: restY }}
              transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
            >
              {stage === "clicked" && (
                <motion.span
                  className="absolute -left-4 -top-4 h-10 w-10 rounded-full border-2 border-[#01D4FF]"
                  initial={{ scale: 0.2, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              )}
              <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]" aria-hidden="true">
                <path d="M5 3l14 7-6 2-2 6z" fill="#fff" stroke="#0f1420" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Back-compat: the Script Generator preset as a standalone component.
export function LpScriptDemo() {
  return <LpClickDemo config={SCRIPT_DEMO} />;
}
