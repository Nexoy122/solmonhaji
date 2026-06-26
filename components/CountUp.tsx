"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts up to `to` (easing out) the first time it scrolls into view.
 */
export function CountUp({ to, from = 0, duration = 1800 }: { to: number; from?: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(from);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = performance.now();
          const tick = (now: number) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - t, 3);
            setVal(Math.round(from + (to - from) * ease));
            if (t < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, from, duration]);

  return <span ref={ref}>{val.toLocaleString()}</span>;
}
