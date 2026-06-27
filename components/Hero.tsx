"use client";

import { motion } from "framer-motion";
import { WaitlistForm } from "./WaitlistForm";
import { CountUp } from "./CountUp";
import { AnimatedShowcase } from "./AnimatedShowcase";
import { openReferralModal } from "./ReferralModal";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.05 + i * 0.09 },
  }),
};

export function Hero({ count }: { count: number }) {
  return (
    <section id="top" className="relative overflow-hidden px-5 md:px-8 pt-36 md:pt-44 pb-24 text-center">
      <div className="hero-aura" />
      <div className="dot-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-[920px]">
        {/* M3 assist chip */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mb-8 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-low px-4 py-2 text-label-large text-on-surface-variant">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
          Competitor intelligence for creators
        </motion.div>

        <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show" className="text-display-large mx-auto max-w-[900px]">
          The #1 tool for{" "}
          <span className="m3-highlight">spying on competitors</span>
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="text-body-large mx-auto mt-7 max-w-[640px] text-on-surface-variant">
          NicheSpy is the competitor-intelligence workspace for YouTube creators. Find every
          competitor, spot their winning videos, and uncover untapped topics —{" "}
          <strong className="font-semibold text-on-surface">without the spreadsheet grind.</strong>
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-10 flex flex-col items-center">
          <div className="w-full max-w-[480px]">
            <WaitlistForm source="hero" buttonLabel="Join the Waitlist" />
          </div>

          {/* Waitlist perk — single clear callout */}
          <div className="mt-5 inline-flex max-w-[560px] flex-col items-center rounded-2xl border border-primary/30 bg-primary-container/40 px-6 py-4 text-center">
            <span className="flex items-center gap-2 text-[15px] font-semibold text-on-surface md:text-[16px]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
              </svg>
              Join the waitlist &amp; get exclusive early access at launch
            </span>
            <span className="mt-1.5 text-[14px] text-on-surface-variant">
              Plus 1 week of our premium tools — completely free.
            </span>
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-[14px] font-bold text-on-primary md:text-[15px]">
              <span className="h-2 w-2 rounded-full bg-on-primary animate-pulse-dot" />
              First 1,000 users only
            </span>
          </div>

          <button
            onClick={openReferralModal}
            className="mt-5 inline-flex items-center gap-1.5 text-body-medium text-on-surface-variant transition-colors hover:text-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
            Have a referral code?
          </button>
        </motion.div>

        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-9 flex items-center justify-center gap-3.5">
          <div className="flex -space-x-2.5">
            {[
              { t: "Y", c: "bg-[#ff6b6b] text-white" },
              { t: "M", c: "bg-[#4ecdc4] text-white" },
              { t: "A", c: "bg-[#a8e063] text-[#0c0d14]" },
              { t: "+", c: "bg-tertiary text-on-tertiary" },
            ].map((a) => (
              <div key={a.t} className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-surface text-[14px] font-semibold ${a.c}`}>
                {a.t}
              </div>
            ))}
          </div>
          <span className="text-body-medium text-on-surface-variant">
            Trusted by{" "}
            <strong className="font-semibold text-on-surface">
              <CountUp to={count} from={Math.max(0, count - 60)} />
            </strong>{" "}
            creators
          </span>
        </motion.div>
      </div>

      {/* animated product showcase */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
        className="relative mt-20 px-2"
      >
        <AnimatedShowcase />
      </motion.div>
    </section>
  );
}
