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
  if (pathname === "/soon") return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/soon";
  url.search = "";
  // 307 so it's never cached as permanent: at launch, the redirect just stops.
  return NextResponse.redirect(url, 307);
}
