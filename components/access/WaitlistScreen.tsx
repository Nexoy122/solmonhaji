"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { MessageCircle, Check } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/7AYW4693XQ";

// Shown to users whose account is pending approval. Never a dead end: it tells
// them where they stand and gives them somewhere to go (Discord) meanwhile.
export function WaitlistScreen() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [position, setPosition] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/login"); return; }
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/access", { headers: { Authorization: `Bearer ${token}` } });
        const d = await res.json();
        setStatus(d.status);
        setPosition(d.position ?? null);
        // Already approved? Don't strand them here.
        if (d.status === "active") { router.replace("/dashboard"); return; }
      } catch { /* show the generic screen */ }
      setReady(true);
    })();
  }, [user, loading, router]);

  if (loading || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="loader-wrapper"><span className="loader-letter">Loading</span><div className="gloader" /></div>
      </div>
    );
  }

  const rejected = status === "rejected" || status === "banned";

  return (
    <main className="lp-root flex min-h-screen flex-col bh-bg bh-text antialiased">
      <header className="border-b-4 bh-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-4 md:px-8">
          <Logo size={30} priority />
          <span className="text-[19px] font-black uppercase tracking-tighter">NicheSpy</span>
          <button onClick={() => signOut()} className="ml-auto text-[12px] font-bold uppercase tracking-widest opacity-50 hover:opacity-100">
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-14 md:px-8">
        {rejected ? (
          <section>
            <h1 className="text-[clamp(30px,5vw,48px)] font-black uppercase leading-[0.95] tracking-tighter">
              Account unavailable
            </h1>
            <p className="mt-4 max-w-lg text-[16px] font-medium leading-relaxed opacity-70">
              This account doesn&apos;t currently have access. If you think that&apos;s a mistake,
              get in touch and we&apos;ll take a look.
            </p>
            <a href="mailto:support@vixo.live" className="mt-7 inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#FF0033] px-6 py-3 text-[14px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none">
              Contact support
            </a>
          </section>
        ) : (
          <section>
            <span className="inline-flex items-center gap-2 border-2 bh-border bg-[#F0C020] px-3 py-1 text-[12px] font-black uppercase tracking-wider text-black">
              <Check className="h-3.5 w-3.5" strokeWidth={4} /> You&apos;re on the list
            </span>

            <h1 className="mt-5 text-[clamp(32px,6vw,58px)] font-black uppercase leading-[0.9] tracking-tighter">
              You&apos;re in<br />the queue
            </h1>

            {position != null && (
              <div className="mt-7 inline-flex items-baseline gap-3 border-4 bh-border bh-surface px-6 py-4 bh-sh-6">
                <span className="text-[13px] font-black uppercase tracking-widest opacity-50">Your spot</span>
                <span className="text-[44px] font-black leading-none tabular-nums text-[#FF0033]">
                  #{position.toLocaleString()}
                </span>
              </div>
            )}

            <p className="mt-7 max-w-lg text-[16px] font-medium leading-relaxed opacity-75">
              We&apos;re rolling out early access in small batches so the tools stay fast for
              everyone. Keep an eye on your inbox, we&apos;ll email you the moment a spot
              opens up. There&apos;s nothing else you need to do.
            </p>

            <div className="mt-9 border-2 bh-border bh-surface p-6 bh-sh-4">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center border-2 bh-border bg-[#5865F2] text-white">
                  <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-black uppercase tracking-tight">Skip the wait for updates</h2>
                  <p className="mt-1.5 text-[14px] font-medium leading-relaxed opacity-70">
                    Our Discord is where we announce new batches, share what&apos;s working on
                    Shorts, and take feature requests. Come say hi while you wait.
                  </p>
                  <a
                    href={DISCORD_INVITE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center justify-center gap-2 border-2 bh-border bg-[#5865F2] px-5 py-2.5 text-[13px] font-black uppercase tracking-wider text-white bh-sh-3 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
                  >
                    <MessageCircle className="h-4 w-4" strokeWidth={3} /> Join our Discord
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
