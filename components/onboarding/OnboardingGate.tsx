"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Sends users who haven't finished the welcome flow to /onboarding, and lets
// everyone else straight through. The check is server-backed (/api/onboarding),
// so it survives a new device or a cleared browser.
//
// Fails OPEN: any error, or no database configured, renders the dashboard. A
// broken check must never lock a paying user out of the product.
export function OnboardingGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const headers = { Authorization: `Bearer ${token}` };

        // Access first: someone still on the waitlist shouldn't be walked
        // through onboarding for a product they can't use yet.
        const accessRes = await fetch("/api/access", { headers });
        if (accessRes.ok) {
          const access = await accessRes.json();
          if (!cancelled && access.status && access.status !== "active") {
            setRedirecting(true);
            router.replace("/waitlist");
            return;
          }
        }

        const res = await fetch("/api/onboarding", { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.step && data.step !== "done") {
          setRedirecting(true);
          router.replace("/onboarding");
        }
      } catch { /* fail open */ }
    })();
    return () => { cancelled = true; };
  }, [user, loading, router]);

  if (redirecting) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F0F0F0]">
        <div className="loader-wrapper"><span className="loader-letter">Loading</span><div className="gloader" /></div>
      </div>
    );
  }
  return <>{children}</>;
}
