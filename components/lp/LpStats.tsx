"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { Reveal } from "../Reveal";
import { LpParallax } from "./LpScrollFx";

const STATS: { big: string; label: string; sub: string }[] = [
  { big: "12K+", label: "Creators on the list", sub: "Across 40+ countries" },
  { big: "500K+", label: "Videos analyzed", sub: "Outliers, gaps & trends" },
  { big: "3–5 hrs", label: "Saved every week", sub: "vs. manual spreadsheets" },
  { big: "5×", label: "Faster research", sub: "vs. guessing by hand" },
];

/**
 * Splits a stat like "12K+", "3–5 hrs" or "5×" into the leading text before the
 * final number, the target number itself, and the trailing text. We only count
 * up the last number in the string so "3–5 hrs" animates the 5.
 */
function parseStat(big: string) {
  const m = big.match(/^(.*?)(\d+)([^\d]*)$/);
  if (!m) return { prefix: big, target: null as number | null, suffix: "" };
  return { prefix: m[1], target: parseInt(m[2], 10), suffix: m[3] };
}

/** Counts the number up from 0 → target when it scrolls into view (once). */
function CountUpStat({ big }: { big: string }) {
  const { prefix, target, suffix } = parseStat(big);
  const reduce = useReducedMotion();
  const [value, setValue] = useState(target === null || reduce ? target ?? 0 : 0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (target === null || reduce) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true;
          const controls = animate(0, target, {
            duration: 1.4,
            ease: [0.22, 1, 0.36, 1],
            onUpdate: (v) => setValue(Math.round(v)),
          });
          return () => controls.stop();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, reduce]);

  return (
    <span
      ref={ref}
      className="font-heading text-[clamp(38px,4.6vw,54px)] font-extrabold leading-none tracking-[-0.02em]"
      style={{
        // vidIQ-style engraved depth: bright at top → dimmer cool blue
        // at the bottom, with a soft drop shadow underneath.
        background: "linear-gradient(180deg, #ffffff 0%, #dfe8f5 42%, #93a7c9 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))",
      }}
    >
      {target === null ? big : `${prefix}${value}${suffix}`}
    </span>
  );
}

export function LpStats() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 md:px-8 pb-20 md:pb-28">
      <LpParallax amount={22}>
        <Reveal>
          {/* vidIQ-style stat box: one flat dark-gradient card, 4 stats across a
              single row with thin dividers, clean light numbers. */}
          <div
            className="grid grid-cols-2 gap-y-10 rounded-[24px] border border-white/[0.07] px-6 py-11 md:grid-cols-4 md:px-6 md:py-12"
            style={{
              background:
                "radial-gradient(120% 130% at 50% -10%, #1e2537 0%, #171d2b 45%, #121722 100%)",
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center px-4 text-center ${
                  i !== STATS.length - 1 ? "md:border-r md:border-white/[0.08]" : ""
                }`}
              >
                <CountUpStat big={s.big} />
                <span className="mt-3 text-[16px] font-semibold text-white">{s.label}</span>
                <span className="mt-1 text-[13.5px] text-white/45">{s.sub}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </LpParallax>
    </section>
  );
}
