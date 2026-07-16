"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Check, X } from "lucide-react";

type State = "working" | "ok" | "error";

// Redeems the invite token from the email link. The token is the proof, so this
// works whether or not the visitor is currently signed in.
export function ActivateScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<State>("working");
  const [msg, setMsg] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    const token = params.get("token");
    if (!token) { setState("error"); setMsg("This link is missing its activation code."); return; }
    // Tokens are single-use: guard against React double-invoking the effect.
    if (ran.current) return;
    ran.current = true;

    (async () => {
      try {
        const res = await fetch("/api/access/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const d = await res.json();
        if (!res.ok) { setState("error"); setMsg(d.error || "Couldn't activate your account."); return; }
        setState("ok");
        setTimeout(() => router.replace("/dashboard"), 1800);
      } catch {
        setState("error");
        setMsg("Network error. Please try the link again.");
      }
    })();
  }, [params, router]);

  return (
    <main className="lp-root flex min-h-screen items-center justify-center bh-bg bh-text px-4 antialiased">
      <div className="w-full max-w-md border-4 bh-border bh-surface p-8 text-center bh-sh-8">
        <div className="flex justify-center"><Logo size={40} priority /></div>

        {state === "working" && (
          <>
            <h1 className="mt-6 text-[26px] font-black uppercase tracking-tighter">Activating…</h1>
            <p className="mt-2 text-[14px] font-medium opacity-60">One moment.</p>
          </>
        )}

        {state === "ok" && (
          <>
            <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#118A3E] text-white">
              <Check className="h-7 w-7" strokeWidth={4} />
            </span>
            <h1 className="mt-5 text-[28px] font-black uppercase leading-none tracking-tighter">You&apos;re in</h1>
            <p className="mt-3 text-[15px] font-medium opacity-70">
              Your account is active. Taking you to the dashboard…
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <span className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-black bg-[#FF0033] text-white">
              <X className="h-7 w-7" strokeWidth={4} />
            </span>
            <h1 className="mt-5 text-[24px] font-black uppercase leading-none tracking-tighter">Link didn&apos;t work</h1>
            <p className="mt-3 text-[14px] font-medium leading-relaxed opacity-70">{msg}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link href="/waitlist" className="inline-flex items-center justify-center border-2 bh-border bh-surface bh-text px-5 py-2.5 text-[13px] font-black uppercase tracking-wider bh-sh-3 transition-all active:translate-x-[2px] active:translate-y-[2px] active:bh-sh-none">
                Check my status
              </Link>
              <a href="mailto:support@vixo.live" className="text-[12.5px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100">
                Contact support
              </a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
