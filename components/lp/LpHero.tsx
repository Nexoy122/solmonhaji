"use client";

import { motion } from "framer-motion";
import { LpSignupButton } from "./LpSignupButton";
import { LpButton } from "./LpButton";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 + i * 0.09 },
  }),
};

function CreatorWin() {
  return (
    <motion.a
      href="#tools"
      custom={0}
      variants={fadeUp}
      initial="hidden"
      animate="show"
      className="group mx-auto mb-9 inline-flex items-center gap-2.5 rounded-full border border-white/[0.09] bg-[#141821]/80 px-2 py-1 pr-3.5 text-[13px] shadow-[0_2px_10px_rgba(0,0,0,0.4)] backdrop-blur transition-colors hover:border-white/20"
    >
      {/* gold trophy pill */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#4d9fff]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#f5b942]">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
        CREATOR WIN
      </span>
      <span className="hidden text-white/50 sm:inline">
        Kryptonite Korner · <span className="font-semibold text-[#4d9fff]">0 subs → 3K subs + 2M views</span>{" "}
        <span className="text-white/45">in 6 months</span>
      </span>
      <span className="font-semibold text-[#4d9fff] sm:hidden">0 → 3K subs + 2M views</span>
      <span className="text-white/35 transition-transform group-hover:translate-x-0.5">→</span>
    </motion.a>
  );
}

export function LpHero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 md:px-8 pt-36 md:pt-44 pb-24 text-center">
      {/* vidIQ-style hero bloom: a soft purple/violet glow centered behind the
          headline, plus a cooler blue wash, fading to the near-black page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[680px]"
        style={{
          background:
            "radial-gradient(46% 50% at 50% 4%, rgba(139,92,246,0.30) 0%, rgba(99,68,196,0.10) 42%, transparent 68%), radial-gradient(38% 40% at 24% 20%, rgba(37,99,235,0.16) 0%, transparent 60%), radial-gradient(38% 40% at 78% 16%, rgba(15,165,233,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1000px]">
        <CreatorWin />

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="font-heading mx-auto max-w-[1000px] text-[clamp(46px,7.4vw,88px)] font-extrabold leading-[1.02] tracking-[-0.03em] text-white"
        >
          Get More Views &amp; Subscribers by{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">
            spying on what works
          </span>
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mx-auto mt-7 max-w-[660px] text-[18px] leading-relaxed text-white/60">
          AI-powered competitor intelligence, outlier detection, and untapped-topic ideas that do
          the heavy lifting — <strong className="font-semibold text-white/90">so you can focus on creating.</strong>
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-11 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <LpSignupButton size="lg" label="Get Started Free" />
          <LpButton href="#tools" size="lg" className="font-semibold">
            See the tools
          </LpButton>
        </motion.div>

        <motion.p custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-5 text-[14px] text-white/45">
          No credit card required · Free during beta
        </motion.p>
      </div>
    </section>
  );
}
