"use client";

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile";

// Visible Cloudflare Turnstile widget (the "I'm not a robot" checkbox).
// Renders explicitly and hands the token up via onVerify. Exposes reset().
// Loads the script itself (render=explicit) via a shared promise.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptPromise: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Turnstile"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface CaptchaHandle { reset: () => void }

export const Captcha = forwardRef<
  CaptchaHandle,
  {
    onVerify: (token: string) => void;
    onExpire?: () => void;
    /** Called when the widget can't work at all (bad hostname, script blocked,
     *  Cloudflare erroring). Lets the form fall back to signing in without it,
     *  rather than trapping a real user behind a captcha that will never pass. */
    onUnavailable?: () => void;
  }
>(
  function Captcha({ onVerify, onExpire, onUnavailable }, ref) {
    const boxRef = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const [ready, setReady] = useState(false);

    useImperativeHandle(ref, () => ({
      reset: () => { if (widgetId.current) window.turnstile?.reset(widgetId.current); },
    }));

    useEffect(() => {
      if (!TURNSTILE_SITE_KEY) return;
      let cancelled = false;
      loadScript()
        .then(async () => {
          for (let i = 0; i < 50 && !window.turnstile; i++) await new Promise((r) => setTimeout(r, 100));
          // Script never arrived (blocked by an extension, network, or CSP):
          // don't leave the form waiting for a token that can't come.
          if (!cancelled && !window.turnstile) { onUnavailable?.(); return; }
          if (cancelled || !window.turnstile || !boxRef.current || widgetId.current) return;
          setReady(true);
          widgetId.current = window.turnstile.render(boxRef.current, {
            sitekey: TURNSTILE_SITE_KEY,
            theme: "dark",
            size: "flexible", // stretches to the container width
            callback: (token: string) => onVerify(token),
            "expired-callback": () => onExpire?.(),
            // An error here means the widget itself failed (most often the
            // hostname isn't on the widget's allow-list). Retrying won't help,
            // so tell the form to stop waiting for a token.
            "error-callback": () => { onExpire?.(); onUnavailable?.(); },
          });
        })
        .catch(() => { onUnavailable?.(); });
      return () => {
        cancelled = true;
        if (widgetId.current) { try { window.turnstile?.remove(widgetId.current); } catch { /* ignore */ } }
        widgetId.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // No site key configured → render nothing (server-side verify is skipped).
    if (!TURNSTILE_SITE_KEY) return null;

    return (
      <div className="min-h-[65px] w-full">
        <div ref={boxRef} className="w-full [&_iframe]:!w-full" />
        {!ready && <div className="h-[65px] w-full animate-pulse rounded-md bg-[#1A191D]" />}
      </div>
    );
  }
);
