import { Reveal } from "../Reveal";
import { LpSignupButton } from "./LpSignupButton";
import { LpButton } from "./LpButton";

export function LpFinalCta() {
  return (
    <section className="px-5 md:px-8 pb-28">
      <Reveal>
        <div className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[36px] border border-[#01D4FF]/20 px-6 py-20 text-center md:px-10"
          style={{ background: "linear-gradient(135deg, #0a2536 0%, #06131d 55%, #081b28 120%)" }}
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(60% 60% at 50% 0%, rgba(1,212,255,0.22) 0%, transparent 60%)" }}
          />
          <div className="relative mx-auto max-w-[660px]">
            <h2 className="font-heading text-[clamp(32px,5vw,52px)] font-bold tracking-[-0.01em] text-white">
              Stop guessing. Start spying.
            </h2>
            <p className="mt-5 text-[18px] leading-relaxed text-white/70">
              Join thousands of faceless creators getting competitor intelligence, outlier alerts,
              and AI scripts before anyone else.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <LpSignupButton size="lg" label="Get Started Free" />
              <LpButton href="/login" size="lg" className="font-semibold">
                Sign In
              </LpButton>
            </div>
            <p className="mt-5 text-[14px] text-white/55">
              First 1,000 members get 1 week of premium tools free.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
