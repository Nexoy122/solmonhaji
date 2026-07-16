import { NextRequest, NextResponse } from "next/server";
import { hasLaunched } from "@/lib/launch";

// Hard launch lock. Until the countdown ends, every page is the countdown.
//
// This runs at the edge, before any page renders, so the lock can't be skipped
// by disabling JS or hitting a URL directly.
//
// Deliberately allowed through:
//   /_next/*, /favicon*, static assets  -> the countdown page needs them
//   /api/*                              -> the countdown fetches nothing, but
//                                          webhooks (Polar) must keep working or
//                                          we'd silently drop real payments
export const config = {
  matcher: ["/((?!_next/static|_next/image|api|favicon|logo|niches|tools|.*\\..*).*)"],
};

// Lets you (and anyone you share the link with) browse the real site while the
// public still sees the countdown.
//
//   visit  /?preview=<PREVIEW_SECRET>  once -> sets a cookie -> browse normally
//   visit  /?preview=off               to drop it again
//
// Why a secret and not the admin role: middleware runs at the edge and cannot
// verify a Firebase ID token (the session lives in localStorage, not a cookie).
// This gate only hides the marketing page, so a shared secret is the right
// weight here. It grants NO product access: /dashboard and /admin are still
// protected by real auth on every request.
const PREVIEW_COOKIE = "ns_preview";

function previewSecret(): string {
  return (process.env.PREVIEW_SECRET ?? "").trim();
}

export function middleware(req: NextRequest) {
  if (hasLaunched()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const secret = previewSecret();
  const param = req.nextUrl.searchParams.get("preview");

  // Turn preview off again.
  if (param === "off") {
    const url = req.nextUrl.clone();
    url.searchParams.delete("preview");
    const res = NextResponse.redirect(url);
    res.cookies.delete(PREVIEW_COOKIE);
    return res;
  }

  // Claim preview access. Only ever true when PREVIEW_SECRET is actually set,
  // so an unset/empty env var can't hand the site to everyone.
  if (secret && param === secret) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("preview");
    const res = NextResponse.redirect(url);
    res.cookies.set(PREVIEW_COOKIE, secret, {
      httpOnly: true,
      sameSite: "lax",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 60 * 60 * 24, // a day is plenty; the gate lifts tonight anyway
    });
    return res;
  }

  // Already holding a valid preview cookie.
  if (secret && req.cookies.get(PREVIEW_COOKIE)?.value === secret) {
    return NextResponse.next();
  }

  // Always reachable while the countdown runs:
  //   /soon                 the countdown itself
  //   /invite, /activate    invited testers must be able to accept early, that's
  //                         the entire point of inviting them before launch
  //   /login, /signup       they need to sign in to accept
  //   /dashboard, /admin    what they were invited to actually use
  //
  // The product itself stays protected by its own auth: a stranger reaching
  // /dashboard is bounced to /login exactly as always. This gate hides the
  // MARKETING site, it was never the thing securing the app.
  const ALLOW = ["/soon", "/invite", "/activate", "/login", "/signup", "/dashboard", "/admin", "/onboarding", "/waitlist"];
  if (ALLOW.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/soon";
  url.search = "";
  // 307 so it's never cached as permanent: at launch, the redirect just stops.
  return NextResponse.redirect(url, 307);
}
