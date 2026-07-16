"use client";

import { useEffect, useState, useCallback } from "react";

// ── Referral code modal ─────────────────────────────────────────────────────
// Marketing illusion: makes the waitlist feel invite-driven / exclusive.
// No code is ever valid, it always responds "Enter a valid referral code."
//
// Open it from anywhere with:  window.dispatchEvent(new Event("open-referral"))

export function openReferralModal() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("open-referral"));
}

export function ReferralModal() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "error">("idle");

  const close = useCallback(() => {
    setOpen(false);
    setState("idle");
    setCode("");
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-referral", onOpen);
    return () => window.removeEventListener("open-referral", onOpen);
  }, []);

  // lock scroll + escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) {
      setState("error");
      return;
    }
    // Simulate a real check, then always reject.
    setState("checking");
    setTimeout(() => setState("error"), 700);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Enter referral code"
    >
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0b10]/55 backdrop-blur-sm"
        onClick={close}
      />

      {/* card */}
      <div className="relative w-full max-w-[420px] rounded-3xl border border-outline-variant bg-surface-container-lowest p-7 shadow-[0_24px_70px_rgba(23,28,31,0.28)]">
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-container text-on-primary-container">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12v10H4V12" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>

        <h2 className="text-title-large font-bold text-on-surface">Have a referral code?</h2>
        <p className="mt-1.5 text-body-medium text-on-surface-variant">
          Got an invite from a creator? Enter your code to unlock priority access.
        </p>

        <form onSubmit={submit} className="mt-5">
          <input
            type="text"
            name="referral-code"
            autoComplete="off"
            data-form-type="other"
            inputMode="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (state === "error") setState("idle");
            }}
            placeholder="ENTER CODE"
            autoFocus
            className={`w-full rounded-2xl border bg-surface-container-lowest px-5 py-3.5 text-center text-[18px] font-semibold uppercase tracking-[3px] outline-none transition-colors placeholder:tracking-[2px] placeholder:font-normal ${
              state === "error"
                ? "border-error text-error"
                : "border-outline-variant text-on-surface focus:border-primary"
            }`}
          />

          {state === "error" && (
            <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[14px] font-medium text-error">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Enter a valid referral code.
            </p>
          )}

          <button
            type="submit"
            disabled={state === "checking"}
            className="m3-btn-filled mt-5 w-full disabled:opacity-60"
          >
            {state === "checking" ? "Checking…" : "Apply code"}
          </button>
        </form>

        <p className="mt-4 text-center text-[13px] text-on-surface-variant">
          No code?{" "}
          <a
            href="https://discord.gg/7AYW4693XQ"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            Get one in our Discord server
          </a>
          .
        </p>
      </div>
    </div>
  );
}
