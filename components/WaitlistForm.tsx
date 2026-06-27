"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAttribution } from "@/lib/attribution";
import { trackEvent } from "@/lib/analytics";
import { getTurnstileToken } from "@/lib/turnstile";

interface Props {
  source: string;
  placeholder?: string;
  buttonLabel?: string;
  compact?: boolean;
}

export function WaitlistForm({
  source,
  placeholder = "Enter your email address",
  buttonLabel = "Join the Waitlist",
  compact = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setState("error");
      setError("Please enter a valid email address.");
      return;
    }
    setState("loading");
    try {
      // Bot protection — run an invisible Turnstile challenge.
      // FAIL-OPEN: if the widget can't produce/verify a token (misconfig, network,
      // ad-blocker, timeout), we DON'T block the signup — real users always get
      // through. We only rely on Turnstile when it actually works.
      try {
        const token = await getTurnstileToken();
        if (token) {
          const verify = await fetch("/api/verify-turnstile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          if (!verify.ok) {
            // Token was produced but rejected → likely a real bot. Block.
            setState("error");
            setError("Couldn't verify you're human. Please try again.");
            return;
          }
        }
        // No token (widget failed/blocked) → fall through and allow the signup.
      } catch (e) {
        console.warn("[turnstile] check skipped (fail-open):", e);
      }

      // Duplicate protection — don't add an email that's already on the list.
      const existing = await getDocs(
        query(collection(db, "waitlist"), where("email", "==", value), limit(1))
      );
      if (!existing.empty) {
        setState("error");
        setError("This email is already on the waitlist.");
        return;
      }

      const attr = getAttribution();
      await addDoc(collection(db, "waitlist"), {
        email: value,
        formLocation: source,          // which form on the page (hero / bottom)
        source: attr.source,           // where the visitor came from (instagram, tiktok, …)
        medium: attr.medium,
        campaign: attr.campaign,
        content: attr.content,
        referrer: attr.referrer || "direct",
        landingPath: attr.landingPath,
        joinedAt: serverTimestamp(),
      });
      setState("success");

      // GA conversion event with the traffic source attached.
      trackEvent("waitlist_signup", { source: attr.source, medium: attr.medium, form: source });

      // Fire the welcome email + Discord notification (best-effort — never blocks).
      fetch("/api/send-welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: value,
          source: attr.source,
          medium: attr.medium,
          campaign: attr.campaign,
        }),
      }).catch(() => {});
    } catch (err) {
      console.error("[waitlist] save failed:", err);
      setState("error");
      setError("Something went wrong. Please try again.");
    }
  };

  const maxW = compact ? "max-w-[440px]" : "max-w-[480px]";

  if (state === "success") {
    return (
      <div className={`mx-auto w-full ${maxW}`}>
        <div className="flex items-center gap-3 rounded-2xl bg-primary-container px-5 py-4 text-body-medium font-medium text-on-primary-container">
          <span className="text-lg">✓</span>
          You&apos;re on the list — watch your inbox for early access.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`mx-auto w-full ${maxW}`}>
      <div
        className={`flex items-center gap-2 rounded-full border bg-surface-container-lowest p-1.5 pl-5 transition-colors ${
          state === "error" ? "border-error" : "border-outline-variant focus-within:border-primary"
        } max-md:flex-col max-md:items-stretch max-md:rounded-3xl max-md:gap-2 max-md:p-2`}
      >
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent py-2.5 text-[16px] outline-none placeholder:text-on-surface-variant ${
            state === "error" ? "text-error" : "text-on-surface"
          } max-md:px-3`}
          disabled={state === "loading"}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="m3-btn-filled shrink-0 disabled:opacity-60 max-md:w-full"
        >
          {state === "loading" ? "Joining…" : buttonLabel}
        </button>
      </div>

      {state === "error" && error && (
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[14px] font-medium text-error">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}
    </form>
  );
}
