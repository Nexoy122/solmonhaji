"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import type { ReactNode } from "react";

// ── Scroll progress bar ─────────────────────────────────────────────────────
// Thin cyan line fixed at the very top that fills as you scroll the page.
export function LpScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[120] h-[3px] origin-left"
      style={{
        scaleX,
        background: "linear-gradient(90deg, #0FA5E9, #01D4FF 60%, #7DE9FF)",
        boxShadow: "0 0 12px rgba(1,212,255,0.6)",
      }}
    />
  );
}

// ── Parallax ────────────────────────────────────────────────────────────────
// Drifts its children vertically as the element scrolls through the viewport.
// `amount` is the total px of drift (positive = moves up as you scroll down).
export function LpParallax({
  children,
  amount = 60,
  className,
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yRaw = useTransform(scrollYProgress, [0, 1], [amount, -amount]);
  const y = useSpring(yRaw, { stiffness: 120, damping: 30, mass: 0.4 });
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

// ── Scroll-scale reveal ─────────────────────────────────────────────────────
// A richer entrance than the shared Reveal: fades + slides + scales in, once.
export function LpRise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// Helper so callers can build their own transforms off a shared progress value.
export function useSectionProgress(ref: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return scrollYProgress;
}
