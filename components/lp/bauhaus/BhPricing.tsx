import Link from "next/link";
import { Check } from "lucide-react";
import { BhLabel } from "./BhKit";

// Keep in sync with lib/creditCosts.ts (PLAN_MONTHLY_CREDITS) + dashboard Plans.tsx.
const PLANS = [
  {
    name: "Free", price: "$0", accent: "#F0C020",
    features: ["Core tools included", "100 credits / week", "1 connected channel", "First 20 results", "Community support"],
    cta: "Start free",
  },
  {
    name: "Starter", price: "$5", accent: "#1040C0",
    features: ["Every tool unlocked", "1,000 credits / month", "Unlimited results", "All filters unlocked", "Email support"],
    cta: "Get Starter",
  },
  {
    name: "Creator", price: "$12", accent: "#FF0033", featured: true,
    features: ["Every tool unlocked", "3,000 credits / month", "Unlimited results", "All filters unlocked", "Priority support"],
    cta: "Get Creator",
  },
  {
    name: "Plus", price: "$25", accent: "#7C3AED",
    features: ["Every tool unlocked", "8,000 credits / month", "Unlimited results", "All filters unlocked", "Priority + early access"],
    cta: "Get Plus",
  },
];

export function BhPricing() {
  return (
    <section id="pricing" className="border-b-4 bh-border bh-bg">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <BhLabel className="text-[#FF0033]">Pricing</BhLabel>
          <h2 className="mt-4 text-[clamp(32px,5vw,64px)] font-black uppercase leading-[0.9] tracking-tighter bh-text">
            Start free, upgrade when it pays
          </h2>
          <p className="mt-5 text-[17px] font-medium opacity-70 bh-text">Every paid plan unlocks every tool and every filter. You only scale credits.</p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:items-start">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative border-2 bh-border bh-surface bh-sh-8 p-7 md:border-4 ${p.featured ? "lg:-translate-y-4" : ""}`}
            >
              {p.featured && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 bh-border bg-[#FF0033] px-4 py-1 text-[12px] font-black uppercase tracking-widest text-white bh-sh-3">
                  Most popular
                </span>
              )}
              <span className="inline-block h-6 w-6 border-2 bh-border" style={{ background: p.accent }} />
              <h3 className="mt-4 text-[24px] font-black uppercase tracking-tight bh-text">{p.name}</h3>
              <div className="mt-2 flex items-end gap-1.5">
                <span className="text-[46px] font-black leading-none bh-text">{p.price}</span>
                <span className="mb-2 text-[15px] font-bold uppercase opacity-50 bh-text">/ mo</span>
              </div>
              <ul className="mt-7 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14.5px] font-medium bh-text">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bh-border" style={{ background: p.accent }}>
                      <Check className={`h-3 w-3 ${p.accent === "#F0C020" ? "text-black" : "text-white"}`} strokeWidth={4} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-8 flex w-full items-center justify-center border-2 bh-border px-6 py-3 text-[14px] font-black uppercase tracking-wider bh-sh-4 transition-all duration-200 ease-out active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none ${p.featured ? "bg-[#FF0033] text-white" : "bh-surface bh-text hover:brightness-95"}`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
