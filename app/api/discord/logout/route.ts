import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/discord";

export const runtime = "nodejs";

// Clears the session cookie and returns to the homepage.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
