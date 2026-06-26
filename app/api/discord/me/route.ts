import { NextRequest, NextResponse } from "next/server";
import { decodeSession, avatarUrl, SESSION_COOKIE } from "@/lib/discord";

export const runtime = "nodejs";

// Returns the currently logged-in Discord user (from the signed cookie), or null.
export async function GET(req: NextRequest) {
  const session = decodeSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      username: session.username,
      avatar: avatarUrl(session),
    },
  });
}
