"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { Check, X, ArrowRight } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  tester: "Beta Tester",
  staff: "Staff",
  admin: "Admin",
  super_admin: "Super Admin",
  user: "Early Access",
};

type Phase = "loading" | "ready" | "accepting" | "done" | "error";

export function InviteScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [invite, setInvite] = useState<{ email: string; role: string; kind: string } | null>(null);
  const [err, setErr] = useState("");

  const token = params.get("token") ?? "";

  // Preview the invite. No auth needed: the token is the proof.
  useEffect(() => {
    if (!token) { setPhase("error"); setErr("This link is missing its invite code."); return; }
    (async () => {
      try {
        const res = await fetch(`/api/invite?token=${encodeURIComponent(token)}`);
        const d = await res.json();
        if (!res.ok) { setPhase("error"); setErr(d.error || "This invite isn't valid."); return; }
        setInvite(d);
        setPhase("ready");
      } catch {
        setPhase("error"); setErr("Couldn't load this invite.");
      }
    })();
  }, [token]);

  const accept = useCallback(async () => {
    if (!user) {
      // Bounce through login and come straight back to this invite.
      router.push(`/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
      return;
    }
    setPhase("accepting");
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ token }),
      });
      const d = await res.json();
      if (!res.ok) { setPhase("error"); setErr(d.error || "Couldn't accept this invite."); return; }
      setPhase("done");
      setTimeout(() => router.replace(d.kind === "team" && d.role !== "tester" ? "/admin" : "/dashboard"), 1800);
    } catch {
      setPhase("error"); setErr("Network error. Please try again.");
    }
  }, [user, token, router]);

  const roleLabel = invite ? (ROLE_LABEL[invite.role] ?? invite.role) : "";
  const isTeam = invite?.kind === "team";

  return (
    <main className="lp-root flex min-h-screen items-center justify-center bh-bg bh-text px-4 antialiased">
      <div className="w-full max-w-md border-4 bh-border bh-surface p-8 text-center bh-sh-8">
        <div className="flex justify-center"><Logo size={40} priority /></div>

        {(phase === "loading" || loading) && (
          <p className="mt-6 text-[14px] font-medium opacity-60">Checking your invite…</p>
        )}

        {phase === "ready" && invite && (
          <>
            <span className="mt-6 inline-block border-2 bh-border bg-[#F0C020] px-3 py-1 text-[11px] font-black uppercase tracking-widest text-black">
              {isTeam ? "Team invite" : "Early access"}
            </span>
            <h1 className="mt-4 text-[30px] font-black uppercase leading-none tracking-tighter">
              {isTeam ? "You're invited" : "You're in"}
            </h1>
            <p className="mt-3 text-[14.5px] font-medium leading-relaxed opacity-70">
              {isTeam ? (
                <>You&apos;ve been invited to join NicheSpy as <strong className="opacity-100">{roleLabel}</strong>.</>
              ) : (
                <>You&apos;ve been invited to NicheSpy early access, skipping the waitlist entirely.</>
              )}
            </p>

            <div className="mt-5 border-2 bh-border bh-bg px-4 py-3 text-left">
              <div className="text-[10.5px] font-black uppercase tracking-widest opacity-40">Invite for</div>
              <div className="mt-0.5 truncate text-[14px] font-bold">{invite.email}</div>
            </div>

            {user && user.email?.toLowerCase() !== invite.email.toLowerCase() && (
              <p className="mt-3 text-[12.5px] font-bold text-[#FF0033]">
                You&apos;re signed in as {user.email}. Sign in as {invite.email} to accept.
              </p>
            )}

            <button
              onClick={accept}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 border-2 bh-border bg-[#FF0033] px-6 py-3.5 text-[14px] font-black uppercase tracking-wider text-white bh-sh-4 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none"
            >
              {user ? "Accept invite" : "Sign in to accept"} <ArrowRight className="h-4 w-4" strokeWidth={3} />
            </button>
            {!user && (
              <p className="mt-3 text-[12.5px] font-medium opacity-50">
                No account yet?{" "}
                <Link href={`/signup?next=${encodeURIComponent(`/invite?token=${token}`)}`} className="font-bold underline">
                  Create one
                </Link>{" "}
                with {invite.email}.
              </p>
            )}
          </>
        )}

        {phase === "accepting" && <p className="mt-6 text-[14px] font-medium opacity-60">Accepting…</p>}

        {phase === "done" && (
          <>
            <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#118A3E] text-white">
              <Check className="h-7 w-7" strokeWidth={4} />
            </span>
            <h1 className="mt-5 text-[28px] font-black uppercase leading-none tracking-tighter">Welcome aboard</h1>
            <p className="mt-3 text-[14.5px] font-medium opacity-70">Setting you up…</p>
          </>
        )}

        {phase === "error" && (
          <>
            <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#FF0033] text-white">
              <X className="h-7 w-7" strokeWidth={4} />
            </span>
            <h1 className="mt-5 text-[22px] font-black uppercase leading-none tracking-tighter">Invite problem</h1>
            <p className="mt-3 text-[14px] font-medium leading-relaxed opacity-70">{err}</p>
            <a href="mailto:support@vixo.live" className="mt-5 inline-block text-[12.5px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
              Contact support
            </a>
          </>
        )}
      </div>
    </main>
  );
}
