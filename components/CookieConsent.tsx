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

      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-[200] border-t border-outline-variant bg-surface-container-lowest shadow-[0_-8px_30px_rgba(23,28,31,0.10)]">
          <div className="mx-auto flex max-w-[1180px] flex-col items-center gap-4 px-5 py-4 md:flex-row md:px-8">
            <div className="flex items-start gap-3 md:items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5Z" /><circle cx="9" cy="11" r="1" /><circle cx="14" cy="15" r="1" /><circle cx="15" cy="9" r="1" />
                </svg>
              </div>
              <div>
                <p className="text-[15px] font-semibold text-on-surface">We use cookies</p>
                <p className="mt-0.5 text-[14px] leading-relaxed text-on-surface-variant">
                  We use analytics cookies to understand where our visitors come from and improve
                  NicheSpy. You can decline without affecting the site.
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 gap-2 md:ml-auto md:w-auto">
              <button
                onClick={() => choose("denied")}
                className="m3-btn-tonal flex-1 !h-11 !px-6 !text-[14px] md:flex-none"
              >
                Decline
              </button>
              <button
                onClick={() => choose("granted")}
                className="m3-btn-filled flex-1 !h-11 !px-8 !text-[14px] md:flex-none"
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
