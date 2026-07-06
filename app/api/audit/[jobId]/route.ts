import { NextRequest, NextResponse } from "next/server";
import { verifyRequest } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

const WORKER_URL = (process.env.AUDIT_WORKER_URL ?? "").replace(/\/$/, "");
const WORKER_SECRET = process.env.AUDIT_WORKER_SECRET ?? "";

// Poll an audit job's status/result.
export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const uid = await verifyRequest(req.headers.get("authorization"));
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await params;
  if (!WORKER_URL || !WORKER_SECRET) {
    return NextResponse.json({ error: "Channel Audit isn't configured yet." }, { status: 503 });
  }

  try {
    const res = await fetch(`${WORKER_URL}/audit/${encodeURIComponent(jobId)}`, {
      headers: { "x-worker-secret": WORKER_SECRET },
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data.error || "Couldn't fetch the audit." }, { status: res.status });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Audit service is unavailable." }, { status: 502 });
  }
}
