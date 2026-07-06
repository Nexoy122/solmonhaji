import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// Remove a connected YouTube channel (and its stored tokens) for the user.
export async function POST(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const youtubeId = (body as { channelId?: string })?.channelId;
  if (!youtubeId) return NextResponse.json({ error: "Missing channelId." }, { status: 400 });

  try {
    await adminDb()
      .collection("users")
      .doc(uid)
      .collection("youtube_channels")
      .doc(youtubeId)
      .delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[youtube/disconnect] error:", err);
    return NextResponse.json({ error: "Couldn't remove the channel." }, { status: 500 });
  }
}
