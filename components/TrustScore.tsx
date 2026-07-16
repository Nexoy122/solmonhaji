"use client";

import { Reveal } from "./Reveal";
import { motion } from "framer-motion";

const SIGNALS = [
  { label: "Engagement", value: 92 },
  { label: "Retention", value: 78 },
  { label: "Upload consistency", value: 85 },
  { label: "Authority", value: 88 },
  { label: "Growth velocity", value: 73 },
];

// circular gauge ring for the score
function Gauge({ score = 87 }: { score?: number }) {
  const r = 70;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative h-[200px] w-[200px]">
      <svg width="200" height="200" className="-rotate-90">
        <circle cx="100" cy="100" r={r} fill="none" stroke="var(--color-surface-container-high)" strokeWidth="14" />
        <motion.circle
          cx="100" cy="100" r={r} fill="none"
          stroke="var(--color-primary)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          whileInView={{ strokeDashoffset: offset }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[56px] font-bold leading-none text-primary">{score}</span>
        <span className="text-[13px] text-on-surface-variant">/ 100 · Strong</span>
      </div>
    </div>
  );
}

export function TrustScore() {
  return (
    <section className="mx-auto max-w-[1180px] px-5 md:px-8 py-12 md:py-16">
      <Reveal>
        <div className="overflow-hidden rounded-[36px] border border-outline-variant bg-surface-container-low p-8 md:p-14">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_auto]">
            {/* copy */}
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-tertiary-container px-4 py-1.5 text-[13px] font-bold uppercase tracking-wider text-on-tertiary-container">
                Coming soon · Trust Score
              </span>
              <h2 className="mt-6 text-display-small">
                Know which channels are{" "}
                <span className="text-primary">actually strong.</span>
              </h2>
              <p className="mt-5 max-w-[560px] text-body-large text-on-surface-variant">
                Subscriber counts lie. Trust Score gives any channel, yours or a competitor&apos;s, a single <strong className="text-on-surface">0–100 health score</strong> built from real signals:
                engagement, retention, upload consistency, authority, and growth velocity. Instantly tell
                genuine momentum from inflated vanity numbers.
              </p>

              {/* why it matters */}
              <ul className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  "Spot fading channels before you copy them",
                  "Benchmark your channel vs the niche",
                  "Find under-rated rising stars early",
                  "Cut through fake / bought subscribers",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-body-medium text-on-surface-variant">
                    <span className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-on-primary">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            {/* gauge + signal bars */}
            <div className="flex flex-col items-center gap-6 rounded-3xl bg-surface-container-lowest p-8 m3-card lg:w-[360px]">
              <Gauge score={87} />
              <div className="w-full space-y-3">
                {SIGNALS.map((s, i) => (
                  <div key={s.label}>
                    <div className="mb-1 flex justify-between text-[13px] text-on-surface-variant">
                      <span>{s.label}</span>
                      <span className="font-semibold text-on-surface">{s.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        initial={{ width: 0 }}
                        whileInView={{ width: `${s.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
