"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";

// Client-side credit cost constants — must mirror lib/creditCosts.ts.
export const CREDIT_COST = {
  script: 2,
  scriptFromVideo: 8,
  niche: 3,
  transcript: 3,
  trustScore: 5,
  channelAudit: 40,
  aiChat: 1,
} as const;
export type CreditAction = keyof typeof CREDIT_COST;

// Which paid plans exist. Anything not here (or "free") is treated as free.
export const PAID_PLANS = ["starter", "creator", "plus"] as const;
export function isPaidPlan(plan?: string | null): boolean {
  return !!plan && (PAID_PLANS as readonly string[]).includes(plan);
}
// Per-plan Trust Score channel limits (free = 1). Paid plans effectively unlimited.
export const TRUST_CHANNEL_LIMIT: Record<string, number> = {
  free: 1, starter: 999, creator: 999, plus: 999,
};
// Free-tier caps for Explore.
export const FREE_EXPLORE_LIMIT = 20;

interface CreditsState {
  balance: number | null;   // null = still loading / unknown
  plan: string;
  isPaid: boolean;
  refresh: () => void;
  setBalance: (n: number) => void;
  // Shows the "out of credits" upgrade modal.
  showOutOfCredits: (needed?: number) => void;
  // Inspect a failed fetch: if it's a 402 INSUFFICIENT_CREDITS, show the modal
  // and return true (caller should stop). Otherwise return false.
  handleInsufficient: (res: Response, data?: { code?: string; needed?: number }) => boolean;
}

const Ctx = createContext<CreditsState | null>(null);

export function useCredits() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCredits must be used inside <CreditsProvider>");
  return c;
}

// Credit coin icon — a clean bordered coin with a spark, Bauhaus-friendly.
export function CreditIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="#F0C020" stroke="#121212" strokeWidth="2" />
      <path d="M12 7.5 13.2 11h3.3l-2.7 2 1 3.4L12 14.4 9.2 16.4l1-3.4-2.7-2h3.3L12 7.5Z" fill="#121212" />
    </svg>
  );
}

// Small lock icon for paywalled controls.
export function LockIcon({ size = 13, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="4" y="11" width="16" height="10" rx="1" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

// A little "PRO" badge, Bauhaus yellow block.
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 border-2 border-black bg-[#F0C020] px-1.5 py-[1px] text-[10px] font-black uppercase leading-none tracking-wide text-black ${className}`}>
      <LockIcon size={10} /> Pro
    </span>
  );
}

// Inline "upgrade to unlock" nudge — a Bauhaus card tools can drop in place of
// gated content. `title`/`body` describe what's locked.
export function UpgradeNudge({ title, body, compact = false }: { title: string; body?: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center border-2 border-black bg-white text-center shadow-[4px_4px_0px_0px_#121212] ${compact ? "gap-2 p-5" : "gap-3 p-8"}`}>
      <span className="flex h-10 w-10 items-center justify-center border-2 border-black bg-[#F0C020] text-black">
        <LockIcon size={18} />
      </span>
      <h4 className={`font-black uppercase tracking-tight text-black ${compact ? "text-[15px]" : "text-[18px]"}`}>{title}</h4>
      {body && <p className="max-w-[360px] text-[13px] font-medium leading-relaxed text-black/70">{body}</p>}
      <Link
        href="/dashboard/plans"
        className="mt-1 inline-flex items-center gap-2 border-2 border-black bg-[#D02020] px-4 py-2 text-[13px] font-black uppercase tracking-wider text-white shadow-[3px_3px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        Upgrade plan
      </Link>
    </div>
  );
}

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [balance, setBalanceState] = useState<number | null>(null);
  const [plan, setPlan] = useState("free");
  const [oocOpen, setOocOpen] = useState(false);
  const [oocNeeded, setOocNeeded] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await user?.getIdToken();
      if (!token) return;
      const res = await fetch("/api/credits", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (typeof data.balance === "number" && data.balance >= 0) setBalanceState(data.balance);
      if (typeof data.plan === "string") setPlan(data.plan);
    } catch { /* ignore */ }
  }, [user]);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onChange = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("credits:changed", onChange);
    return () => { window.removeEventListener("focus", onFocus); window.removeEventListener("credits:changed", onChange); };
  }, [refresh]);

  const setBalance = useCallback((n: number) => setBalanceState(n), []);
  const showOutOfCredits = useCallback((needed?: number) => { setOocNeeded(needed ?? null); setOocOpen(true); }, []);
  const handleInsufficient = useCallback((res: Response, data?: { code?: string; needed?: number }) => {
    if (res.status === 402 || data?.code === "INSUFFICIENT_CREDITS") {
      setOocNeeded(data?.needed ?? null);
      setOocOpen(true);
      return true;
    }
    return false;
  }, []);

  return (
    <Ctx.Provider value={{ balance, plan, isPaid: isPaidPlan(plan), refresh, setBalance, showOutOfCredits, handleInsufficient }}>
      {children}

      {/* Out-of-credits modal */}
      {oocOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={() => setOocOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md border-4 border-black bg-white shadow-[10px_10px_0px_0px_#121212]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b-4 border-black bg-[#D02020] px-5 py-4">
              <div className="flex items-center gap-2.5">
                <CreditIcon size={22} />
                <h3 className="text-[19px] font-black uppercase tracking-tight text-white">Out of credits</h3>
              </div>
              <button onClick={() => setOocOpen(false)} aria-label="Close" className="flex h-9 w-9 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6">
              <p className="text-[15px] font-medium leading-relaxed text-black">
                {oocNeeded
                  ? `This action needs ${oocNeeded} credits, but you're out.`
                  : "You've used all your credits."}{" "}
                Upgrade your plan for more credits every month, or wait for your weekly free refresh.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/plans"
                  onClick={() => setOocOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 border-2 border-black bg-[#D02020] px-5 py-3 text-[14px] font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Upgrade plan
                </Link>
                <button
                  onClick={() => setOocOpen(false)}
                  className="flex flex-1 items-center justify-center border-2 border-black bg-white px-5 py-3 text-[14px] font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
