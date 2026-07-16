// ── Cloudflare Turnstile helper ────────────────────────────────────────────────
// Loads the Turnstile script once and runs an invisible challenge on demand to
// get a token, which is then verified server-side before a signup is accepted.

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      execute: (widgetId: string, opts?: Record<string, unknown>) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

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

/**
 * Pre-load the Turnstile script early (call on page mount) so the challenge is
 * fast when the user actually clicks Join, avoids the cold-start delay.
 */
export function preloadTurnstile(): void {
  if (!TURNSTILE_SITE_KEY) return;
  loadScript().catch(() => {});
}

/**
 * Run an invisible Turnstile challenge and resolve with the token.
 * If no site key is configured, resolves with "" (verification is skipped server-side).
 */
export async function getTurnstileToken(): Promise<string> {
  if (!TURNSTILE_SITE_KEY || typeof window === "undefined") return "";

  await loadScript();
  // wait until the API is actually ready
  for (let i = 0; i < 50 && !window.turnstile; i++) {
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!window.turnstile) return "";

  return new Promise<string>((resolve) => {
    // hidden container for the (invisible) widget
    const container = document.createElement("div");
    container.style.display = "none";
    document.body.appendChild(container);

    let settled = false;
    const finish = (token: string, widgetId?: string) => {
      if (settled) return;
      settled = true;
      try {
        if (widgetId) window.turnstile?.remove(widgetId);
        container.remove();
      } catch {
        /* ignore */
      }
      resolve(token);
    };

    try {
      const widgetId = window.turnstile!.render(container, {
        sitekey: TURNSTILE_SITE_KEY,
        size: "invisible",
        callback: (token: string) => finish(token, widgetId),
        "error-callback": () => finish(""),
        "timeout-callback": () => finish(""),
      });
      window.turnstile!.execute(widgetId, { sitekey: TURNSTILE_SITE_KEY });

      // safety timeout so submit never hangs forever
      setTimeout(() => finish(""), 12000);
    } catch {
      finish("");
    }
  });
}
