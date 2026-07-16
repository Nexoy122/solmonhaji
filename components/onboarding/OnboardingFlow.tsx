"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { CreditIcon } from "@/components/dashboard/CreditsContext";
import { ArrowRight, Check, MessageCircle } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";

// Mirrors lib/nicheResearch.ts NICHES. Each carries the looping clip we already
// ship for the landing page, so the picker previews the niche instead of just
// naming it.
const NICHES = [
  { id: "commentary", label: "Commentary", video: "/niches/commentary.mp4", poster: "/niches/commentary.jpg" },
  { id: "ranking", label: "Ranking", video: "/niches/ranking.mp4", poster: "/niches/ranking.jpg" },
  { id: "animation", label: "Animation", video: "/niches/animation.mp4", poster: "/niches/animation.jpg" },
  { id: "gaming", label: "Gaming", video: "/niches/gaming.mp4", poster: "/niches/gaming.jpg" },
  { id: "captions_only", label: "Captions Only", video: "/niches/captions.mp4", poster: "/niches/captions.jpg" },
  { id: "edits_montages", label: "Edits/Montages", video: "/niches/edits.mp4", poster: "/niches/edits.jpg" },
  { id: "memes", label: "Memes", video: "/niches/memes.mp4", poster: "/niches/memes.jpg" },
];

const SOURCES = [
  { id: "youtube", label: "YouTube" },
  { id: "tiktok", label: "TikTok" },
  { id: "discord", label: "Discord" },
  { id: "friend", label: "Friend or colleague" },
  { id: "google", label: "Google search" },
  { id: "twitter", label: "X / Twitter" },
  { id: "reddit", label: "Reddit" },
  { id: "other", label: "Somewhere else" },
];

const PLANS = [
  { id: "starter", name: "Starter", price: 5, credits: "1,000", accent: "#1040C0", perks: ["Every tool unlocked", "All filters", "Unlimited results"] },
  { id: "creator", name: "Creator", price: 12, credits: "3,000", accent: "#FF0033", featured: true, perks: ["Everything in Starter", "3,000 credits / mo", "Priority support"] },
  { id: "plus", name: "Plus", price: 25, credits: "8,000", accent: "#7C3AED", perks: ["Everything in Creator", "8,000 credits / mo", "Early access"] },
];

// The steps the user actually walks through (the DB also has a terminal "done").
const STEPS = ["welcome", "source", "niches", "discord", "plans"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingFlow() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");
  const [niches, setNiches] = useState<string[]>([]);
  const [source, setSource] = useState<string | null>(null);
  const [sourceNote, setSourceNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const authHeader = useCallback(async (): Promise<Record<string, string>> => {
    const t = await user?.getIdToken();
    return t ? { Authorization: `Bearer ${t}` } : {};
  }, [user]);

  // Resume where they left off.
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    (async () => {
      try {
        const res = await fetch("/api/onboarding", { headers: await authHeader() });
        const data = await res.json();
        if (data.step === "done") { router.replace("/dashboard"); return; }
        if (STEPS.includes(data.step)) setStep(data.step);
        if (Array.isArray(data.niches)) setNiches(data.niches);
        if (data.source) setSource(data.source);
        if (data.sourceNote) setSourceNote(data.sourceNote);
      } catch { /* start at welcome */ }
      setReady(true);
    })();
  }, [user, loading, authHeader, router]);

  const save = async (patch: Record<string, unknown>, next: Step | "done") => {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ ...patch, step: next }),
      });
    } catch { /* keep going, the answer isn't critical enough to block on */ }
    setSaving(false);
    if (next === "done") router.replace("/dashboard");
    else setStep(next);
  };

  const toggleNiche = (id: string) =>
    setNiches((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="loader-wrapper"><span className="loader-letter">Loading</span><div className="gloader" /></div>
      </div>
    );
  }

  const idx = STEPS.indexOf(step);
  const pct = ((idx + 1) / STEPS.length) * 100;

  return (
    <main className="lp-root min-h-screen bh-bg bh-text antialiased">
      {/* progress */}
      <div className="sticky top-0 z-20 border-b-4 bh-border bh-bg">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4 md:px-8">
          <Logo size={30} priority />
          <span className="text-[18px] font-black uppercase tracking-tighter">NicheSpy</span>
          <span className="ml-auto text-[12px] font-bold uppercase tracking-widest opacity-50">
            Step {idx + 1} of {STEPS.length}
          </span>
        </div>
        <div className="h-2 w-full bh-surface">
          <div className="h-full bg-[#FF0033] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-14">
        {/* ── WELCOME ── */}
        {step === "welcome" && (
          <section>
            <span className="inline-flex items-center gap-2 border-2 bh-border bg-[#F0C020] px-3 py-1 text-[12px] font-black uppercase tracking-wider text-black">
              <CreditIcon size={14} /> 100 free credits added
            </span>
            <h1 className="mt-5 text-[clamp(32px,6vw,56px)] font-black uppercase leading-[0.9] tracking-tighter">
              Welcome to<br />NicheSpy
            </h1>
            <p className="mt-5 max-w-lg text-[17px] font-medium leading-relaxed opacity-75">
              You&apos;re in. Let&apos;s take 30 seconds to set things up so your first
              search actually shows what&apos;s working in <em>your</em> niche.
            </p>
            <button
              onClick={() => save({}, "source")}
              disabled={saving}
              className="mt-8 inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#FF0033] px-6 py-3.5 text-[15px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
            >
              Let&apos;s go <ArrowRight className="h-5 w-5" strokeWidth={3} />
            </button>
          </section>
        )}

        {/* ── SOURCE ── */}
        {step === "source" && (
          <section>
            <h1 className="text-[clamp(28px,5vw,44px)] font-black uppercase leading-[0.95] tracking-tighter">
              How did you hear<br />about us?
            </h1>
            <p className="mt-4 text-[16px] font-medium opacity-70">Helps us know where to show up. One tap.</p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SOURCES.map((s) => {
                const on = source === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`border-2 bh-border px-4 py-4 text-left text-[14.5px] font-bold uppercase tracking-wide transition-all ${
                      on ? "bg-[#FF0033] text-white bh-sh-4" : "bh-surface bh-text bh-sh-2 hover:-translate-y-0.5"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {source === "other" && (
              <input
                autoFocus
                value={sourceNote}
                onChange={(e) => setSourceNote(e.target.value)}
                placeholder="Where did you find us?"
                maxLength={280}
                className="mt-4 w-full border-2 bh-border bh-surface bh-text px-4 py-3 text-[15px] font-medium outline-none placeholder:opacity-40"
              />
            )}

            <div className="mt-9 flex items-center gap-3">
              <button
                onClick={() => save({ source, sourceNote }, "niches")}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#FF0033] px-6 py-3 text-[15px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none disabled:opacity-50"
              >
                Continue <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </button>
              <button onClick={() => save({}, "niches")} className="text-[13px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
                Skip
              </button>
            </div>
          </section>
        )}

        {/* ── NICHES (required: it drives Discover) ── */}
        {step === "niches" && (
          <section>
            <h1 className="text-[clamp(28px,5vw,44px)] font-black uppercase leading-[0.95] tracking-tighter">
              Pick your niches
            </h1>
            <p className="mt-4 text-[16px] font-medium opacity-70">
              Choose any that fit. We&apos;ll fill your Discover feed with the Shorts
              blowing up in these. You can change this later.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {NICHES.map((n) => {
                const on = niches.includes(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => toggleNiche(n.id)}
                    aria-pressed={on}
                    className={`group relative overflow-hidden border-2 bh-border transition-all ${
                      on ? "bh-sh-6 -translate-y-1" : "bh-sh-2 hover:-translate-y-0.5"
                    }`}
                  >
                    <video
                      src={n.video}
                      poster={n.poster}
                      muted
                      loop
                      autoPlay
                      playsInline
                      preload="none"
                      aria-hidden
                      className="block aspect-[9/16] w-full bg-[#161616] object-cover"
                    />
                    <span className={`absolute inset-0 transition-colors ${on ? "bg-[#FF0033]/25" : "bg-black/40 group-hover:bg-black/20"}`} />
                    {on && (
                      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center border-2 border-black bg-[#F0C020]">
                        <Check className="h-3.5 w-3.5 text-black" strokeWidth={4} />
                      </span>
                    )}
                    <span className="absolute bottom-0 left-0 right-0 bg-black/75 px-2 py-1.5 text-[11.5px] font-black uppercase tracking-wide text-white">
                      {n.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-9 flex items-center gap-3">
              <button
                onClick={() => save({ niches }, "discord")}
                disabled={saving || niches.length === 0}
                className="inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#FF0033] px-6 py-3 text-[15px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </button>
              <span className="text-[13px] font-bold uppercase tracking-wider opacity-50">
                {niches.length === 0 ? "Pick at least one" : `${niches.length} selected`}
              </span>
            </div>
          </section>
        )}

        {/* ── DISCORD ── */}
        {step === "discord" && (
          <section>
            <span className="flex h-14 w-14 items-center justify-center border-2 bh-border bg-[#5865F2] text-white bh-sh-3">
              <MessageCircle className="h-7 w-7" strokeWidth={2.5} />
            </span>
            <h1 className="mt-5 text-[clamp(28px,5vw,44px)] font-black uppercase leading-[0.95] tracking-tighter">
              Join the creators<br />in our Discord
            </h1>
            <p className="mt-4 max-w-lg text-[16px] font-medium leading-relaxed opacity-70">
              Get help, share what&apos;s working, and hear about new tools first.
              It&apos;s where we post updates and take feature requests.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => save({ joinedDiscord: true }, "plans")}
                className="inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#5865F2] px-6 py-3.5 text-[15px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
              >
                <MessageCircle className="h-5 w-5" strokeWidth={3} /> Join Discord
              </a>
              <button onClick={() => save({}, "plans")} className="text-[13px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
                Skip for now
              </button>
            </div>
          </section>
        )}

        {/* ── PLANS ── */}
        {step === "plans" && (
          <section>
            <h1 className="text-[clamp(28px,5vw,44px)] font-black uppercase leading-[0.95] tracking-tighter">
              Go further, faster
            </h1>
            <p className="mt-4 max-w-lg text-[16px] font-medium leading-relaxed opacity-70">
              You start free with <strong>100 credits a week</strong>. Paid plans unlock
              every filter, remove result limits, and top you up monthly.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={`relative border-2 bh-border bh-surface p-5 ${p.featured ? "bh-sh-6 sm:-translate-y-2" : "bh-sh-3"}`}
                >
                  {p.featured && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap border-2 bh-border bg-[#FF0033] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                      Most popular
                    </span>
                  )}
                  <span className="inline-block h-5 w-5 border-2 bh-border" style={{ background: p.accent }} />
                  <h3 className="mt-3 text-[19px] font-black uppercase tracking-tight">{p.name}</h3>
                  <div className="mt-1 flex items-end gap-1">
                    <span className="text-[34px] font-black leading-none">${p.price}</span>
                    <span className="mb-1 text-[13px] font-bold uppercase opacity-50">/mo</span>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold">
                    <CreditIcon size={14} /> {p.credits} credits / mo
                  </p>
                  <ul className="mt-4 space-y-1.5">
                    {p.perks.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] font-medium opacity-80">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={4} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/dashboard/plans"
                    onClick={() => save({}, "done")}
                    className={`mt-5 flex w-full items-center justify-center border-2 bh-border px-4 py-2.5 text-[13px] font-black uppercase tracking-wider transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none ${
                      p.featured ? "bg-[#FF0033] text-white bh-sh-3" : "bh-surface bh-text bh-sh-2"
                    }`}
                  >
                    Choose {p.name}
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-9 flex items-center gap-3">
              <button
                onClick={() => save({}, "done")}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 border-2 bh-border bh-surface bh-text px-6 py-3 text-[15px] font-black uppercase tracking-wider bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
              >
                Continue with Free <ArrowRight className="h-5 w-5" strokeWidth={3} />
              </button>
              <span className="text-[13px] font-bold uppercase tracking-wider opacity-50">No card needed</span>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
