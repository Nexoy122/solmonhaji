"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LpButton, TONES } from "./LpButton";

// Limited-time offer popup with a cinematic entrance:
//   1. after ~2.5s (or on demand via the gift button) a COMET flies in
//   2. it traces one smooth counter-clockwise teardrop loop across the screen
//   3. it arrives at the bottom-right corner and the offer card "docks"
//   4. the card grows and the copy fills in
// The flight uses CSS offset-path so the comet follows the curve in ONE
// continuous tween, no waypoints, no stutter, and offset-rotate:auto keeps its
// tail trailing along the path. The overlay is pointer-events-none (click-through).
const SHOW_DELAY_MS = 2500;
const FLIGHT_MS = 3600;

// The flight path, matching the hand-drawn teardrop, in a 0–100 proportional
// space: START upper-right → across the top → down the left → across the bottom
// → up the right, ENDING just below the start (bottom-right dock).
// CSS offset-path path() uses PIXELS, so we scale these to the real viewport.
const PATH_PCT: [number, number][] = [
  [86, 30], // start (upper-right)
  [74, 12], [40, 8], [22, 24], // top curve, heading left
  [6, 38], [6, 64], [22, 78],  // left + bottom curve
  [40, 94], [74, 92], [88, 74], // bottom → up the right, dock
];

// Build a smooth cubic-bezier path in real pixels for the given viewport size.
function buildPath(w: number, h: number): string {
  const p = PATH_PCT.map(([x, y]) => [(x / 100) * w, (y / 100) * h] as [number, number]);
  const [s, ...rest] = p;
  let d = `M ${s[0].toFixed(1)} ${s[1].toFixed(1)}`;
  for (let i = 0; i < rest.length; i += 3) {
    const [c1, c2, end] = [rest[i], rest[i + 1], rest[i + 2]];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
  }
  return d;
}

// Comet: a glowing head with a tapering tail. Drawn pointing RIGHT (+X) so that
// offset-rotate:auto makes the tail trail correctly as it banks around the loop.
function Comet({ size = 66, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="cometTail" x1="0" y1="30" x2="80" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#01D4FF" stopOpacity="0" />
          <stop offset="0.6" stopColor="#0FA5E9" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7DE9FF" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="cometHead" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#8FEBFF" />
          <stop offset="1" stopColor="#0FA5E9" />
        </radialGradient>
      </defs>
      {/* tail, narrow wedge fading out to the left */}
      <path d="M82 30 L6 22 Q0 30 6 38 Z" fill="url(#cometTail)" />
      {/* soft glow behind the head */}
      <circle cx="82" cy="30" r="16" fill="#01D4FF" opacity="0.35" />
      {/* head */}
      <circle cx="82" cy="30" r="11" fill="url(#cometHead)" />
      <circle cx="79" cy="27" r="3.2" fill="#ffffff" opacity="0.9" />
    </svg>
  );
}

export function LpOfferPopup() {
  const router = useRouter();
  // "idle" (nothing) → "flying" → "docked" (card open) → "minimized" (small
  // re-open pill at the bottom, shown after the user dismisses the card).
  const [phase, setPhase] = useState<"idle" | "flying" | "docked" | "minimized">("idle");
  const [cardVisible, setCardVisible] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [vp, setVp] = useState({ w: 0, h: 0 });

  const launch = () => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setReduceMotion(!!prefersReduced);
    if (prefersReduced) {
      setPhase("docked");
      setCardVisible(true);
    } else {
      setCardVisible(false);
      setPhase("flying");
    }
  };

  useEffect(() => {
    // The comet flies on EVERY page load, no dismiss gate, so a refresh
    // always replays the animation.
    const t = setTimeout(launch, SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  // ✕ on the card → collapse to the small re-open pill (not gone). "Claim" →
  // signup. The pill re-opens the card instantly (no comet re-flight).
  const dismiss = (claiming = false) => {
    setCardVisible(false);
    setTimeout(() => setPhase(claiming ? "idle" : "minimized"), 300);
    if (claiming) router.push("/signup");
  };

  const reopen = () => {
    setPhase("docked");
    requestAnimationFrame(() => setCardVisible(true));
  };

  return (
    <>
      {/* ── Flight overlay: comet follows the path in one smooth tween ──
          offset-path drives position + offset-rotate:auto banks it along the
          tangent, so the whole loop is a single glitch-free tween (0%→100%). */}
      {phase === "flying" && !reduceMotion && vp.w > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[140]">
          <motion.div
            className="absolute left-0 top-0"
            style={{
              offsetPath: `path('${buildPath(vp.w, vp.h)}')`,
              offsetRotate: "auto",
            }}
            initial={{ offsetDistance: "0%" }}
            animate={{ offsetDistance: "100%" }}
            transition={{ duration: FLIGHT_MS / 1000, ease: [0.45, 0.05, 0.35, 1] }}
            onAnimationComplete={() => {
              setPhase("docked");
              requestAnimationFrame(() => requestAnimationFrame(() => setCardVisible(true)));
            }}
          >
            <Comet size={72} className="-translate-x-1/2 -translate-y-1/2 drop-shadow-[0_0_16px_rgba(1,212,255,0.7)]" />
          </motion.div>
        </div>
      )}

      {/* ── Docked offer card ── */}
      <AnimatePresence>
        {phase === "docked" && cardVisible && (
          <motion.div
            role="dialog"
            aria-label="Beta launch offer"
            initial={{ opacity: 0, scale: 0.6, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-4 right-4 z-[130] w-[min(88vw,300px)] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#171d2b] shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div
              className="relative flex h-24 items-center justify-center overflow-hidden"
              style={{ background: "linear-gradient(135deg, #0FA5E9 0%, #0284c7 55%, #01D4FF 120%)" }}
            >
              <span className="absolute left-5 top-5 text-sm text-white/70">✦</span>
              <span className="absolute right-9 top-7 text-xs text-white/50">✦</span>
              <span className="absolute bottom-5 left-10 text-[10px] text-white/40">✦</span>

              {/* The comet head settles into the card as a glowing star. */}
              <motion.div
                initial={reduceMotion ? false : { scale: 0.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="animate-float-soft"
              >
                <Comet size={62} />
              </motion.div>

              <button
                onClick={() => dismiss(false)}
                aria-label="Dismiss offer"
                className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            <motion.div
              className="p-4"
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18, duration: 0.35 }}
            >
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#01D4FF]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#01D4FF] animate-pulse-dot" />
                Limited-time · beta only
              </span>
              <h3 className="mt-2 text-[17px] font-bold text-white">Get 50% off at launch</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                Sign up now and lock in{" "}
                <strong className="font-semibold text-white">50% off</strong> for life, exclusively for our first beta users.
              </p>

              <LpButton
                onClick={() => dismiss(true)}
                tone={TONES.cyan}
                className="mt-3.5 h-10 w-full text-[14px] font-semibold"
              >
                Claim 50% offer
              </LpButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Minimized re-open pill ── shown after the user dismisses the card,
          so the offer is never fully gone, a tap re-opens it instantly. */}
      <AnimatePresence>
        {phase === "minimized" && (
          <motion.button
            onClick={reopen}
            aria-label="Reopen 50% beta offer"
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "bottom right" }}
            className="group fixed bottom-4 right-4 z-[130] flex items-center gap-2 rounded-full border border-[#01D4FF]/40 bg-[#171d2b] py-2.5 pl-2.5 pr-4 text-[13px] font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-[#01D4FF] hover:shadow-[0_10px_34px_rgba(1,212,255,0.35)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#01D4FF]/15 text-[#01D4FF]">
              <span className="h-2 w-2 rounded-full bg-[#01D4FF] animate-pulse-dot" />
            </span>
            <span className="text-[#01D4FF]">50% off</span>
            <span className="hidden text-white/70 sm:inline">, beta offer</span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
