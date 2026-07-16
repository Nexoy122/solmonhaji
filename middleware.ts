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

export function middleware(req: NextRequest) {
  if (hasLaunched()) return NextResponse.next();

  const { pathname } = req.nextUrl;

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
