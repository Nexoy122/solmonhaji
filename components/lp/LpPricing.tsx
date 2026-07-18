import Link from "next/link";
import { Reveal } from "../Reveal";

// Mirrors the live paid plans in components/dashboard/Plans.tsx.
type Plan = {
  name: string;
  price: string;
  originalPrice: string;
  cadence: string;
  tagline: string;
  features: string[];
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    price: "$3",
    originalPrice: "$5",
    cadence: "/ month",
    tagline: "For a solo creator getting started.",
    features: [
      "All tools included",
      "1,000 credits / month",
      "1 connected channel",
      "7-day history",
      "Community support",
    ],
  },
  {
    name: "Creator",
    price: "$6",
    originalPrice: "$12",
    cadence: "/ month",
    tagline: "For an active creator running 1–3 channels.",
    features: [
      "All tools included",
      "3,000 credits / month",
      "3 connected channels",
      "30-day history",
      "Priority email support",
    ],
    featured: true,
  },
  {
    name: "Plus",
    price: "$13",
    originalPrice: "$25",
    cadence: "/ month",
    tagline: "For agencies & power users.",
    features: [
      "All tools included",
      "8,000 credits / month",
      "10 connected channels",
      "Unlimited history",
      "Priority + early access",
    ],
  },
];

export function LpPricing() {
  return (
    <section id="pricing" className="mx-auto max-w-[1180px] px-5 md:px-8 py-24 md:py-32">
      <Reveal>
        <div className="text-center">
          <span className="inline-flex items-center rounded-full border border-[#01D4FF]/30 bg-[#01D4FF]/10 px-4 py-1.5 text-[13px] font-bold text-[#01D4FF]">
            50% OFF LAUNCH PRICING
          </span>
          <h2 className="font-heading mt-6 text-[clamp(30px,4vw,46px)] font-bold tracking-[-0.01em] text-white mx-auto max-w-[720px]">
            Every plan gets{" "}
            <span className="bg-gradient-to-r from-[#0FA5E9] to-[#01D4FF] bg-clip-text text-transparent">every tool</span>
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-white/60 mx-auto max-w-[560px]">
            Pick your plan by how much you create. All tools unlocked on every tier, you only scale credits, channels, and support.
          </p>
        </div>
      </Reveal>

      <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08} className="h-full">
            <div
              className={`flex h-full flex-col rounded-[28px] border p-8 transition-all duration-300 ${
                p.featured
                  ? "border-[#01D4FF]/40 bg-[#171d2b] shadow-[0_20px_60px_rgba(1,212,255,0.12)] md:-translate-y-3"
                  : "border-white/[0.08] bg-[#171d2b] hover:-translate-y-1 hover:border-white/20"
              }`}
            >
              {p.featured && (
                <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-[#0FA5E9] px-3.5 py-1 text-[12px] font-bold text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse-dot" />
                  MOST POPULAR
                </span>
              )}
              <h3 className="font-heading text-[24px] font-bold text-white">{p.name}</h3>
              <div className="mt-3 flex items-end gap-2">
                <span className="font-heading text-[clamp(30px,4vw,44px)] font-bold text-white">{p.price}</span>
                <span className="mb-2 text-[15px] text-white/50">{p.cadence}</span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[13px] font-medium text-white/35 line-through">{p.originalPrice}{p.cadence}</span>
                <span className="rounded-full bg-[#01D4FF]/15 px-2 py-0.5 text-[11px] font-bold text-[#01D4FF]">
                  50% off
                </span>
              </div>
              <p className="mt-2 text-[15px] text-white/55">{p.tagline}</p>

              <ul className="mt-7 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[15px] text-white/85">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#01D4FF]/15 text-[#01D4FF]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-8 flex h-12 items-center justify-center rounded-full text-[15px] font-semibold transition ${
                  p.featured
                    ? "bg-[#0FA5E9] text-white shadow-[0_8px_24px_rgba(15,165,233,0.3)] hover:bg-[#0b8fd0]"
                    : "border border-white/15 text-white hover:bg-white/[0.05]"
                }`}
              >
                Get started
              </Link>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
