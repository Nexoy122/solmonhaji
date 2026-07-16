"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { GA_ID, trackPageView } from "@/lib/analytics";
import { captureAttribution } from "@/lib/attribution";

const CONSENT_KEY = "ns_cookie_consent"; // "granted" | "denied"

export function CookieConsent() {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  // On mount: capture traffic source + read any stored consent choice.
  useEffect(() => {
    captureAttribution(); // record where they came from, regardless of consent
    const stored = (typeof localStorage !== "undefined" && localStorage.getItem(CONSENT_KEY)) as
      | "granted" | "denied" | null;
    setConsent(stored ?? null);
    setReady(true);
  }, []);

  // Track page views on client-side navigation (once GA is loaded + consented).
  useEffect(() => {
    if (consent === "granted") trackPageView(pathname);
  }, [pathname, consent]);

  const choose = (value: "granted" | "denied") => {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    // update Google consent state live if gtag already present
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("consent", "update", {
        analytics_storage: value,
        ad_storage: "denied",
      });
    }
  };

  // Only ask for consent if analytics is actually configured. Until you add a
  // GA Measurement ID, no cookies are used, so no banner is shown.
  const showBanner = ready && consent === null && !!GA_ID;
  const loadGA = !!GA_ID && consent === "granted";

  return (
    <>
      {/* GA loads only after consent is granted */}
      {loadGA && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent','default',{ analytics_storage:'granted', ad_storage:'denied' });
              gtag('config', '${GA_ID}', { anonymize_ip: true });
            `}
          </Script>
        </>
      )}

      {/* Centered popup on entry, styled to match the Bauhaus UI. Deliberately
          not dismissible by clicking away: a choice must be an actual choice. */}
      {showBanner && (
        <div className="lp-root fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] cc-fade" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-title"
            className="cc-pop relative w-full max-w-[440px] border-4 border-black bg-white shadow-[10px_10px_0px_0px_#121212]"
          >
            {/* header block */}
            <div className="flex items-center gap-3 border-b-4 border-black bg-[#F0C020] px-5 py-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-white text-black shadow-[2px_2px_0px_0px_#121212]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" /><circle cx="9" cy="11" r="1" /><circle cx="14" cy="15" r="1" /><circle cx="15" cy="9" r="1" />
                </svg>
              </span>
              <h2 id="cc-title" className="text-[19px] font-black uppercase tracking-tight text-black">
                We use cookies
              </h2>
            </div>

            <div className="px-5 py-5">
              <p className="text-[14.5px] font-medium leading-relaxed text-black/75">
                We use analytics cookies to understand where our visitors come from and
                improve NicheSpy. Decline and nothing changes, the whole site still works.
              </p>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                <button
                  onClick={() => choose("granted")}
                  className="flex flex-1 items-center justify-center border-2 border-black bg-[#FF0033] px-5 py-3 text-[13.5px] font-black uppercase tracking-wider text-white shadow-[4px_4px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Accept
                </button>
                <button
                  onClick={() => choose("denied")}
                  className="flex flex-1 items-center justify-center border-2 border-black bg-white px-5 py-3 text-[13.5px] font-black uppercase tracking-wider text-black shadow-[4px_4px_0px_0px_#121212] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  Decline
                </button>
              </div>

              <p className="mt-4 text-center text-[12px] font-medium text-black/45">
                Read our{" "}
                <a href="/privacy" className="font-bold text-black underline underline-offset-2">
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
