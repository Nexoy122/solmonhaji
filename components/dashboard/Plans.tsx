"use client";

import { useState } from "react";
import BorderGlow from "@/components/dashboard/BorderGlow";
import { useAuth } from "@/components/AuthProvider";

const DISCOUNT_RATE = 0.5; // 50% off

type Feature = { label: string; included: boolean };
type FeatureGroup = { heading: string; items: Feature[] };

interface Plan {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  price: number;
  popular?: boolean;
  credits: number;
  groups: FeatureGroup[];
  included: string[];
}

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For a solo creator just getting started.",
    icon: "auto_awesome",
    price: 9,
    credits: 500,
    groups: [
      {
        heading: "Includes",
        items: [
          { label: "Access to every tool on NicheSpy", included: true },
          { label: "1 connected channel", included: true },
          { label: "Unlimited Discover & Explore browsing", included: true },
          { label: "10 Trust Score analyses / month", included: true },
          { label: "7-day history", included: true },
        ],
      },
    ],
    included: ["500 credits / month (~150 scripts, or ~100 niche researches)", "Community support (Discord)"],
  },
  {
    id: "creator",
    name: "Creator",
    tagline: "For an active faceless creator running 1–3 channels.",
    icon: "workspace_premium",
    price: 19,
    popular: true,
    credits: 1500,
    groups: [
      {
        heading: "Everything in Starter, plus",
        items: [
          { label: "3 connected channels", included: true },
          { label: "40 Trust Score analyses / month", included: true },
          { label: "30-day history", included: true },
          { label: "Priority email support", included: true },
        ],
      },
    ],
    included: ["1,500 credits / month (~450 scripts, or ~300 niche researches)", "Priority email support"],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For agencies and power users managing many channels.",
    icon: "bolt",
    price: 39,
    credits: 4000,
    groups: [
      {
        heading: "Everything in Creator, plus",
        items: [
          { label: "10 connected channels", included: true },
          { label: "Unlimited Trust Score analyses", included: true },
          { label: "Unlimited history", included: true },
          { label: "Priority support + earliest access to new tools", included: true },
        ],
      },
    ],
    included: ["4,000 credits / month (~1,200 scripts, or ~800 niche researches)", "Priority + early access"],
  },
];

const CREDIT_COSTS: { action: string; credits: string; note: string }[] = [
  { action: "Browse Discover / Explore", credits: "0", note: "Cached, near-zero cost" },
  { action: "Generate / improve a script", credits: "2", note: "" },
  { action: "Niche research (per niche)", credits: "3", note: "" },
  { action: "Shorts transcript", credits: "3", note: "" },
  { action: "Trust Score analysis", credits: "5", note: "" },
  { action: "Video-from-upload script", credits: "8", note: "" },
  { action: "Channel Audit (deep video ML)", credits: "40", note: "Our most expensive action" },
];

function getPriceInfo(plan: Plan, yearly: boolean) {
  if (yearly) {
    const original = plan.price * 12;
    const discounted = Math.round(original * (1 - DISCOUNT_RATE));
    return { discounted, original: Math.round(original), period: "year" as const };
  }
  const discounted = Math.round(plan.price * (1 - DISCOUNT_RATE));
  return { discounted, original: Math.round(plan.price), period: "month" as const };
}

function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Check() {
  return (
    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-[#01D4FF]">
      <Icon d="M20 6 9 17l-5-5" size={14} />
    </span>
  );
}

function CreditPill({ credits }: { credits: number }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#01D4FF]/15 text-[#01D4FF]">
        <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" size={13} />
      </span>
      <span className="text-[13.5px] text-on-surface-variant">
        <span className="font-semibold text-on-surface">{credits.toLocaleString()} credits</span> / month for the AI tools
      </span>
    </div>
  );
}

function PlanCard({ plan, onUpgrade, loading, yearly }: { plan: Plan; onUpgrade: (planId: string) => void; loading: boolean; yearly: boolean }) {
  const { discounted, original, period } = getPriceInfo(plan, yearly);

  const cardInner = (
    <div className="flex h-full flex-col p-6">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            plan.popular ? "bg-[#01D4FF] text-[#001318]" : "bg-white/[0.06] text-on-surface"
          }`}
        >
          <Icon d={ICON_PATHS[plan.icon] ?? ICON_PATHS.auto_awesome} size={19} />
        </span>
        <div>
          <p className="text-[16px] font-bold text-on-surface">{plan.name}</p>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-snug text-on-surface-variant">{plan.tagline}</p>

      <div className="mt-5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-on-surface-variant">$</span>
          <span className="text-[38px] font-extrabold leading-none tracking-tight text-on-surface">{discounted}</span>
          <span className="text-[13px] text-on-surface-variant">/{period}</span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[13px] font-medium text-on-surface-variant/60 line-through">${original}/{period}</span>
          <span className="rounded-full bg-[#01D4FF] px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-[#001318] shadow-[0_0_0_1px_rgba(1,212,255,0.4)]">
            50% off
          </span>
        </div>
      </div>

      <div className="mt-5">
        <CreditPill credits={plan.credits} />
      </div>

      <div className="mt-6 flex-1 space-y-5">
        {plan.groups.map((group) => (
          <div key={group.heading}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant/70">
              {group.heading}
            </p>
            {group.items.length > 0 && (
              <ul className="mt-2.5 space-y-2">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-2 text-[13.5px] leading-snug text-on-surface">
                    <Check />
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-2 border-t border-white/[0.06] pt-5">
        {plan.included.map((line) => (
          <div key={line} className="flex items-start gap-2 text-[13px] text-on-surface-variant">
            <Check />
            <span>{line}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {plan.popular ? (
          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={loading}
            className="btn-donate inline-flex w-full items-center justify-center gap-2 !rounded-xl !text-[14px] !font-bold disabled:opacity-60"
          >
            {loading ? "Redirecting…" : `Upgrade to ${plan.name}`}
          </button>
        ) : (
          <button
            onClick={() => onUpgrade(plan.id)}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-[14px] font-bold text-on-surface transition-colors hover:bg-white/[0.06] disabled:opacity-60"
          >
            {loading ? "Redirecting…" : `Upgrade to ${plan.name}`}
          </button>
        )}
        <p className="mt-2.5 text-center text-[11.5px] text-on-surface-variant/70">Cancel anytime</p>
      </div>
    </div>
  );

  if (plan.popular) {
    return (
      <div className="relative">
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#01D4FF] px-3 py-1 text-[11px] font-bold text-[#001318]">
          Most popular
        </span>
        <BorderGlow borderRadius={20} backgroundColor="#0a0d10" glowColor="199 89 55" glowIntensity={0.7} className="h-full">
          {cardInner}
        </BorderGlow>
      </div>
    );
  }

  return (
    <div className="h-full rounded-[20px] border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20">
      {cardInner}
    </div>
  );
}

const ICON_PATHS: Record<string, string> = {
  auto_awesome: "M12 3l1.9 5.8L20 10l-6.1 1.2L12 17l-1.9-5.8L4 10l6.1-1.2z",
  workspace_premium: "M12 2l8 4v5c0 5-3.4 8-8 10-4.6-2-8-5-8-10V6l8-4z",
  bolt: "M13 2L3 14h7l-1 8 10-12h-7z",
};

export function Plans() {
  const { user } = useAuth();
  const [yearly, setYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const authHeader = async (): Promise<Record<string, string>> => {
    const token = await user?.getIdToken();
    return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : {};
  };

  const handleUpgrade = async (planId: string) => {
    setError("");
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: await authHeader(),
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    setError("");
    setPortalLoading(true);
    try {
      const res = await fetch("/api/portal", { method: "POST", headers: await authHeader() });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "No active subscription found.");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPortalLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-[#01D4FF] px-4 py-1.5 text-[13px] font-extrabold uppercase tracking-wide text-[#001318]">
          <Icon d="M13 2L3 14h7l-1 8 10-12h-7z" size={14} />
          50% off every plan — limited time
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#01D4FF]">Pricing</p>
        <h1 className="mt-2 font-heading text-[28px] font-bold tracking-[-0.01em] text-on-surface md:text-[34px]">
          Simple, credit-based pricing
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-on-surface-variant">
          Every plan gets every tool. Plans differ by monthly credits, connected channels,
          history, and support — not by what you can open. Upgrade, downgrade, or cancel anytime.
        </p>
        <button
          onClick={handleManageBilling}
          disabled={portalLoading}
          className="mt-3 text-[12.5px] font-medium text-on-surface-variant underline decoration-white/20 underline-offset-4 transition-colors hover:text-on-surface disabled:opacity-60"
        >
          {portalLoading ? "Opening billing portal…" : "Already subscribed? Manage billing"}
        </button>
        {error && <p className="mt-3 text-[13px] text-[#ff6b6b]">{error}</p>}

        <div className="mx-auto mt-6 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            onClick={() => setYearly(false)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              !yearly ? "bg-white/10 text-on-surface" : "text-on-surface-variant"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setYearly(true)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              yearly ? "bg-white/10 text-on-surface" : "text-on-surface-variant"
            }`}
          >
            Yearly
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onUpgrade={handleUpgrade} loading={loadingPlan === plan.id} yearly={yearly} />
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-center font-heading text-[22px] font-bold text-on-surface">How credits work</h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-[13.5px] leading-relaxed text-on-surface-variant">
          Browsing Discover and Explore is always free. Credits are only spent on AI actions —
          cheap actions cost few credits, and Channel Audit (our heaviest action) costs more.
        </p>

        <div className="mx-auto mt-6 max-w-2xl overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.02]">
          {CREDIT_COSTS.map((row, i) => (
            <div
              key={row.action}
              className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
                i !== CREDIT_COSTS.length - 1 ? "border-b border-white/[0.06]" : ""
              }`}
            >
              <div>
                <p className="text-[13.5px] font-medium text-on-surface">{row.action}</p>
                {row.note && <p className="mt-0.5 text-[12px] text-on-surface-variant/70">{row.note}</p>}
              </div>
              <span className="shrink-0 rounded-full bg-[#01D4FF]/15 px-3 py-1 text-[12.5px] font-bold text-[#01D4FF]">
                {row.credits} {row.credits === "1" ? "credit" : "credits"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-[12.5px] text-on-surface-variant/70">
        Need something bigger? <span className="text-on-surface">Reach out</span> and we&apos;ll put together a custom plan.
      </p>
    </div>
  );
}
