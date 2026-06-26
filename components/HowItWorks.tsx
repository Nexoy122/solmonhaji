"use client";

import { Reveal } from "./Reveal";
import { motion } from "framer-motion";

const STEPS = [
  { n: "01", name: "Type your niche", desc: '"personal finance for millennials", "budget travel vlogs", "AI tool reviews." NicheSpy reads context, not just keywords.' },
  { n: "02", name: "Get your competitor map", desc: "In seconds, every relevant channel appears — ranked by size, activity, and engagement. See who you're up against." },
  { n: "03", name: "Act on the intel", desc: "Spot the gaps, steal the formats that work, and get alerted the moment the landscape shifts." },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-28">
      <Reveal>
        <h2 className="text-display-small">
          From zero to full intel in{" "}
          <span className="text-primary">three steps.</span>
        </h2>
      </Reveal>

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.1}>
            <div className="h-full rounded-[28px] bg-surface-container-low p-8 transition-all duration-300 hover:-translate-y-1 hover:bg-surface-container">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-[22px] font-bold text-on-primary">
                {s.n}
              </div>
              <div className="mb-3 text-title-large">{s.name}</div>
              <p className="text-body-large text-on-surface-variant">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* animated flow pipeline */}
      <FlowDiagram />
    </section>
  );
}

const FLOW = [
  {
    label: "Type your niche",
    sub: '"ai tools reviews"',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
    ),
  },
  {
    label: "Competitors found",
    sub: "214 channels",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
  {
    label: "Outliers + gaps",
    sub: "3 outliers · 6 gaps",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 7v5h-5" /></svg>
    ),
  },
  {
    label: "You win first",
    sub: "before they do",
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
    ),
  },
];

function FlowDiagram() {
  return (
    <Reveal delay={0.1} className="mt-20">
      <div className="relative mx-auto max-w-[1000px] rounded-[32px] border border-outline-variant bg-surface-container-lowest p-8 md:p-12">
        <div className="grid grid-cols-1 gap-x-2 gap-y-8 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
          {FLOW.map((node, i) => (
            <FlowNodeWithConnector key={node.label} node={node} index={i} last={i === FLOW.length - 1} />
          ))}
        </div>
      </div>
    </Reveal>
  );
}

function FlowNodeWithConnector({
  node, index, last,
}: {
  node: (typeof FLOW)[number];
  index: number;
  last: boolean;
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.18, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          {node.icon}
        </div>
        <div className="text-title-medium">{node.label}</div>
        <div className="mt-1 font-mono text-[14px] text-primary">{node.sub}</div>
      </motion.div>

      {!last && (
        <>
          {/* horizontal connector (desktop) */}
          <div className="relative hidden h-px w-full min-w-[28px] overflow-hidden bg-outline-variant md:block">
            <motion.div
              initial={{ x: "-100%" }}
              whileInView={{ x: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1.1, delay: 0.3 + index * 0.18, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent"
            />
          </div>
          {/* vertical connector (mobile) */}
          <div className="mx-auto h-6 w-px bg-outline-variant md:hidden" />
        </>
      )}
    </>
  );
}
