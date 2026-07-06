import { NextRequest, NextResponse } from "next/server";
import { verifyRequest, adminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// Returns the user's connected YouTube channels (without exposing tokens).
export async function GET(req: NextRequest) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await adminDb()
      .collection("users")
      .doc(uid)
      .collection("youtube_channels")
      .get();

    const channels = snap.docs.map((d) => {
      const c = d.data();
      return {
        youtubeId: c.youtubeId,
        name: c.name,
        thumbnailUrl: c.thumbnailUrl ?? null,
        customUrl: c.customUrl ?? null,
        subscriberCount: c.subscriberCount ?? 0,
        videoCount: c.videoCount ?? 0,
      };
    });

    return NextResponse.json({ connected: channels.length > 0, channels });
  } catch (err) {
    console.error("[youtube/status] error:", err);
    return NextResponse.json({ connected: false, channels: [] });
  }
}
