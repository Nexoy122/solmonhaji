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


export function LpHero() {
  return (
    <section id="top" className="relative overflow-hidden px-5 md:px-8 pt-28 md:pt-32 pb-10 text-center">
      {/* soft glow behind the headline */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[560px]"
        style={{
          background:
            "radial-gradient(46% 50% at 50% 4%, rgba(139,92,246,0.28) 0%, rgba(99,68,196,0.10) 42%, transparent 68%), radial-gradient(38% 40% at 24% 20%, rgba(37,99,235,0.14) 0%, transparent 60%), radial-gradient(38% 40% at 78% 16%, rgba(15,165,233,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[960px]">
        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="font-heading mx-auto whitespace-nowrap text-[clamp(22px,3.9vw,52px)] font-extrabold leading-[1.05] tracking-[-0.03em] text-white"
        >
          Get More Views &amp; Subscribers by{" "}
          <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">
            spying on what works
          </span>
        </motion.h1>

        <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mx-auto mt-5 max-w-[620px] text-[16px] leading-relaxed text-white/60">
          AI-powered competitor intelligence, outlier detection, and untapped-topic ideas that do
          the heavy lifting, <strong className="font-semibold text-white/90">so you can focus on creating.</strong>
        </motion.p>

        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <LpSignupButton size="lg" label="Get Started Free" />
          <LpButton href="#tools" size="lg" className="font-semibold">
            See the tools
          </LpButton>
        </motion.div>
      </div>
    </section>
  );
}
