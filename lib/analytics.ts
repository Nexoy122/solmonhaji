// ── Google Analytics (GA4) helpers ────────────────────────────────────────────
// gtag is only active after the user accepts cookies (see CookieConsent).

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Send a custom GA4 event (no-op if GA isn't loaded / consent declined). */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}

/** Track a page view (used on route changes). */
export function trackPageView(path: string) {
  if (typeof window === "undefined" || typeof window.gtag !== "function" || !GA_ID) return;
  window.gtag("config", GA_ID, { page_path: path });
}
