"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Verifies the caller is staff+ BEFORE any admin UI mounts.
//
// Why this is a client component and not middleware: Firebase keeps the session
// in localStorage, not a cookie, so middleware (which only sees cookies) cannot
// read it. The role therefore has to be proven with an authenticated call.
//
// The security that actually matters is server-side: every /api/admin/* route
// calls requireAdmin() and returns 401/403 independently of this. This gate
// exists so the admin bundle and shell never render for a non-admin, and so a
// stranger hitting /admin sees a plain 404 rather than a login-shaped target.
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "denied">("checking");

  useEffect(() => {
    if (loading) return;
    if (!user) { setState("denied"); return; }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        // Ask the server. Never trust anything the client already "knows".
        const res = await fetch("/api/admin/whoami", { headers: { Authorization: `Bearer ${token}` } });
        if (cancelled) return;
        setState(res.ok ? "allowed" : "denied");
      } catch {
        if (!cancelled) setState("denied");
      }
    })();
    return () => { cancelled = true; };
  }, [user, loading]);

  if (state === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="loader-wrapper"><span className="loader-letter">Loading</span><div className="gloader" /></div>
      </div>
    );
  }

  // Look exactly like a missing page: don't confirm /admin exists, and don't
  // offer a sign-in prompt that invites guessing.
  if (state === "denied") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <h1 className="text-[22px] font-semibold text-black">404</h1>
        <p className="mt-2 text-[14px] text-black/60">This page could not be found.</p>
        <button
          onClick={() => router.replace("/")}
          className="mt-6 text-[13px] font-semibold text-black/50 underline hover:text-black"
        >
          Go home
        </button>
      </main>
    );
  }

  return <>{children}</>;
}
